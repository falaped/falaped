import type { RouteResult } from "@/modules/dashboard-assistant/contracts/route-result"
import type { DashboardAssistantTurnContext } from "@/modules/dashboard-assistant/contracts/turn-context"
import type { AssistantTurnQueue, PipelineStep } from "@/modules/dashboard-assistant/contracts/turn-queue"
import { detectIntentAndPlan } from "@/modules/dashboard-assistant/intent/detect-intent-and-plan"
import {
  advanceQueue,
  buildAssistantTurnQueue,
  getCurrentQueueStep,
  parseAssistantTurnQueue,
} from "@/modules/dashboard-assistant/pipeline/assistant-turn-queue"
import { requiresConfirmationForStep } from "@/modules/dashboard-assistant/pipeline/pipeline-policy"
import { dispatchAssistantRoute } from "@/modules/dashboard-assistant/router/dispatch"

export type ProcessAssistantTurnResult = {
  /** Last segment (same as `pipelineResults[pipelineResults.length - 1]` when non-empty). */
  routed: RouteResult
  /** Every handler run in this request, in order (e.g. confirm anthropometrics → BMI → summary). */
  pipelineResults: RouteResult[]
  queue: AssistantTurnQueue | null
  shouldPersistQueue: boolean
  blockedAssistantMessageId: string | null
}

function buildQueueBlockReply(blockedAssistantMessageId: string | null): RouteResult {
  return {
    intent: "CHAT",
    reply:
      "Existe uma confirmação pendente neste caso. Para continuar, confirme ou cancele a ação pendente no ponto indicado do chat.",
    action: "none",
    showStructuredCard: true,
    showAlert: false,
    storedData: [],
    ...(blockedAssistantMessageId ? { blockedAssistantMessageId } : {}),
  }
}

function isCancelPendingFlowMessage(userMessage: string): boolean {
  const normalized = userMessage
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
  return (
    normalized.includes("cancelar acao") ||
    normalized.includes("cancelar ação") ||
    normalized.trim() === "cancelar"
  )
}

function isQueueControlMessage(userMessage: string): boolean {
  const normalized = userMessage
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
  if (normalized.includes("confirmar") || normalized.includes("cancelar")) return true
  if (normalized.includes("manter valores anteriores") || normalized.includes("manter dados anteriores")) {
    return true
  }
  if (normalized.includes("usar novos dados antropometricos")) return true
  if (
    normalized.includes("salvar alerta para resumo e relatorio") ||
    normalized.includes("salvar alerta para resumo e relatório")
  ) {
    return true
  }
  if (normalized.includes("nao armazenar alerta") || normalized.includes("não armazenar alerta")) {
    return true
  }
  if (
    normalized.includes("nao atualizar dados do paciente") ||
    normalized.includes("não atualizar dados do paciente")
  ) {
    return true
  }
  return false
}

function resolveScopedUserMessageForChain(
  contextUserMessage: string,
  currentStep: PipelineStep,
  hasWorkingQueue: boolean,
  chainIndex: number,
): string {
  if (chainIndex === 0) {
    if (!hasWorkingQueue || isQueueControlMessage(contextUserMessage)) {
      return contextUserMessage
    }
    return currentStep.commandMessage
  }
  return currentStep.commandMessage
}

function shouldPausePipelineForUserConfirmation(step: PipelineStep, routed: RouteResult): boolean {
  return requiresConfirmationForStep(step.kind) && routed.action === "none"
}

export async function processDashboardAssistantTurn(
  context: DashboardAssistantTurnContext,
): Promise<ProcessAssistantTurnResult> {
  const parsedQueue = parseAssistantTurnQueue(context.turnQueue ?? null)
  if (parsedQueue && isCancelPendingFlowMessage(context.userMessage)) {
    const routed = await dispatchAssistantRoute("CHAT", context)
    return {
      routed,
      pipelineResults: [routed],
      queue: null,
      shouldPersistQueue: true,
      blockedAssistantMessageId: null,
    }
  }

  const detection = await detectIntentAndPlan({
    ...context,
    turnQueue: parsedQueue,
  })

  if (detection.shouldBlockForPendingQueue) {
    const routed = buildQueueBlockReply(parsedQueue?.blockedAssistantMessageId ?? null)
    return {
      routed,
      pipelineResults: [routed],
      queue: parsedQueue,
      shouldPersistQueue: false,
      blockedAssistantMessageId: parsedQueue?.blockedAssistantMessageId ?? null,
    }
  }

  const detectedSteps = detection.steps
  const queueFromMessage = buildAssistantTurnQueue({
    source: detection.source,
    steps: detectedSteps,
  })

  const workingQueueInitial = parsedQueue ?? queueFromMessage
  let currentStep: PipelineStep =
    getCurrentQueueStep(workingQueueInitial) ??
    detectedSteps[0] ?? {
      id: `${Date.now()}-CHAT`,
      kind: "CHAT",
      originalInput: context.userMessage,
      commandMessage: context.userMessage,
      requiresConfirmation: false,
    }

  if (!workingQueueInitial) {
    const scopedContext: DashboardAssistantTurnContext = {
      ...context,
      userMessage: resolveScopedUserMessageForChain(
        context.userMessage,
        currentStep,
        false,
        0,
      ),
      turnQueue: null,
    }
    const routed = await dispatchAssistantRoute(currentStep.kind, scopedContext)
    return {
      routed,
      pipelineResults: [routed],
      queue: null,
      shouldPersistQueue: false,
      blockedAssistantMessageId: null,
    }
  }

  const pipelineResults: RouteResult[] = []
  let workingQueue: AssistantTurnQueue = workingQueueInitial
  let chainIndex = 0

  while (true) {
    currentStep =
      getCurrentQueueStep(workingQueue) ??
      detectedSteps[0] ?? {
        id: `${Date.now()}-CHAT`,
        kind: "CHAT",
        originalInput: context.userMessage,
        commandMessage: context.userMessage,
        requiresConfirmation: false,
      }

    const scopedContext: DashboardAssistantTurnContext = {
      ...context,
      userMessage: resolveScopedUserMessageForChain(
        context.userMessage,
        currentStep,
        true,
        chainIndex,
      ),
      turnQueue: workingQueue,
    }

    const routed = await dispatchAssistantRoute(currentStep.kind, scopedContext)
    pipelineResults.push(routed)

    if (shouldPausePipelineForUserConfirmation(currentStep, routed)) {
      return {
        routed,
        pipelineResults,
        queue: workingQueue,
        shouldPersistQueue: true,
        blockedAssistantMessageId: workingQueue.blockedAssistantMessageId ?? null,
      }
    }

    const nextQueue = advanceQueue(workingQueue)
    if (!nextQueue) {
      return {
        routed,
        pipelineResults,
        queue: null,
        shouldPersistQueue: true,
        blockedAssistantMessageId: null,
      }
    }

    workingQueue = nextQueue
    chainIndex += 1
  }
}
