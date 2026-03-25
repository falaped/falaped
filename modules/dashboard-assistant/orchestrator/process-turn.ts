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
import { canAutoContinueInSameRequest, requiresConfirmationForStep } from "@/modules/dashboard-assistant/pipeline/pipeline-policy"
import { dispatchAssistantRoute } from "@/modules/dashboard-assistant/router/dispatch"

export type ProcessAssistantTurnResult = {
  routed: RouteResult
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

function shouldStopAfterStep(step: PipelineStep, routed: RouteResult): boolean {
  if (routed.action !== "none") return true
  if (requiresConfirmationForStep(step.kind)) return true
  return false
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
  return normalized.includes("confirmar") || normalized.includes("cancelar")
}

export async function processDashboardAssistantTurn(
  context: DashboardAssistantTurnContext,
): Promise<ProcessAssistantTurnResult> {
  const parsedQueue = parseAssistantTurnQueue(context.turnQueue ?? null)
  if (parsedQueue && isCancelPendingFlowMessage(context.userMessage)) {
    const routed = await dispatchAssistantRoute("CHAT", context)
    return {
      routed,
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
    return {
      routed: buildQueueBlockReply(parsedQueue?.blockedAssistantMessageId ?? null),
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

  const workingQueue = parsedQueue ?? queueFromMessage
  const currentStep =
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
    userMessage:
      !workingQueue || isQueueControlMessage(context.userMessage)
        ? context.userMessage
        : currentStep.commandMessage,
    turnQueue: workingQueue,
  }

  const routed = await dispatchAssistantRoute(currentStep.kind, scopedContext)

  if (!workingQueue) {
    return {
      routed,
      queue: null,
      shouldPersistQueue: false,
      blockedAssistantMessageId: null,
    }
  }

  if (shouldStopAfterStep(currentStep, routed)) {
    const queueAfterConfirmedAction =
      routed.action !== "none" ? advanceQueue(workingQueue) : workingQueue
    return {
      routed,
      queue: queueAfterConfirmedAction,
      shouldPersistQueue: true,
      blockedAssistantMessageId: queueAfterConfirmedAction?.blockedAssistantMessageId ?? null,
    }
  }

  const queueAfterCurrentStep = advanceQueue(workingQueue)
  if (!queueAfterCurrentStep) {
    return {
      routed,
      queue: null,
      shouldPersistQueue: true,
      blockedAssistantMessageId: null,
    }
  }

  const nextStep = queueAfterCurrentStep.steps[queueAfterCurrentStep.cursor]
  if (!canAutoContinueInSameRequest(currentStep.kind, nextStep.kind)) {
    return {
      routed,
      queue: queueAfterCurrentStep,
      shouldPersistQueue: true,
      blockedAssistantMessageId: queueAfterCurrentStep.blockedAssistantMessageId ?? null,
    }
  }

  return {
    routed,
    queue: queueAfterCurrentStep,
    shouldPersistQueue: true,
    blockedAssistantMessageId: queueAfterCurrentStep.blockedAssistantMessageId ?? null,
  }
}
