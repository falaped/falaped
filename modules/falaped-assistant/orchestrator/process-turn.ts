import type { RouteResult } from "@/modules/falaped-assistant/contracts/route-result"
import type { AssistantTurnContext } from "@/modules/falaped-assistant/contracts/turn-context"
import type { AssistantTurnQueue, PipelineStep } from "@/modules/falaped-assistant/contracts/turn-queue"
import { detectIntentAndPlan } from "@/modules/falaped-assistant/intent/detect-intent-and-plan"
import {
  isCancelPendingFlowMessage,
  isQueueControlMessage,
} from "@/modules/falaped-assistant/lib/message-classification"
import {
  advanceQueue,
  buildAssistantTurnQueue,
  getCurrentQueueStep,
  parseAssistantTurnQueue,
} from "@/modules/falaped-assistant/pipeline/assistant-turn-queue"
import { requiresConfirmationForStep } from "@/modules/falaped-assistant/pipeline/pipeline-policy"
import { dispatchAssistantRoute } from "@/modules/falaped-assistant/router/dispatch"

export type ProcessAssistantTurnResult = {
  routed: RouteResult
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

function buildFallbackStep(userMessage: string): PipelineStep {
  return {
    id: `${Date.now()}-CHAT`,
    kind: "CHAT",
    originalInput: userMessage,
    commandMessage: userMessage,
    requiresConfirmation: false,
  }
}

export async function processAssistantTurn(
  context: AssistantTurnContext,
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
    detectedSteps[0] ??
    buildFallbackStep(context.userMessage)

  if (!workingQueueInitial) {
    const scopedContext: AssistantTurnContext = {
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
      detectedSteps[0] ??
      buildFallbackStep(context.userMessage)

    const scopedContext: AssistantTurnContext = {
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
