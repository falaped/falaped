import type { AssistantIntent } from "@/modules/falaped-assistant/contracts/assistant-types"
import type { AssistantTurnContext } from "@/modules/falaped-assistant/contracts/turn-context"
import type { PipelineStep } from "@/modules/falaped-assistant/contracts/turn-queue"
import {
  getCurrentQueueStep,
  parseAssistantTurnQueue,
} from "@/modules/falaped-assistant/pipeline/assistant-turn-queue"
import { planAssistantTurnActions } from "@/modules/falaped-assistant/planning/plan-assistant-turn-actions"
import { isConfirmationOrCancellationMessage } from "@/modules/falaped-assistant/lib/message-classification"
import type { TurnAction } from "@/modules/falaped-assistant/planning/turn-action-types"

function turnActionToPipelineStep(action: TurnAction): PipelineStep {
  return {
    id: `${Date.now()}-${action.kind}`,
    kind: action.kind,
    originalInput: action.originalInput,
    commandMessage: action.commandMessage,
    requiresConfirmation: action.requiresConfirmation,
  }
}

export type DetectedTurnPlan = {
  source: "llm" | "heuristic" | "mixed"
  intents: AssistantIntent[]
  steps: PipelineStep[]
  shouldBlockForPendingQueue: boolean
  blockReason: "awaiting_confirmation" | null
}

export async function detectIntentAndPlan(
  context: AssistantTurnContext,
): Promise<DetectedTurnPlan> {
  const parsedQueue = parseAssistantTurnQueue(context.turnQueue ?? null)
  const currentQueuedStep = getCurrentQueueStep(parsedQueue)
  if (
    currentQueuedStep &&
    currentQueuedStep.requiresConfirmation &&
    !isConfirmationOrCancellationMessage(context.userMessage)
  ) {
    return {
      source: parsedQueue?.source === "llm" ? "llm" : "heuristic",
      intents: [currentQueuedStep.kind],
      steps: [currentQueuedStep],
      shouldBlockForPendingQueue: true,
      blockReason: "awaiting_confirmation",
    }
  }

  const plan = await planAssistantTurnActions(context)

  const intents = plan.actions.map((action) => action.kind as AssistantIntent)
  const steps = plan.actions.map(turnActionToPipelineStep)

  const source: "llm" | "heuristic" | "mixed" =
    plan.source === "llm"
      ? "llm"
      : plan.source === "rule"
        ? "mixed"
        : "heuristic"

  return {
    source,
    intents,
    steps,
    shouldBlockForPendingQueue: false,
    blockReason: null,
  }
}
