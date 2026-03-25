import type { DashboardAssistantIntent } from "@/modules/dashboard-assistant/contracts/assistant-types"
import type { DashboardAssistantTurnContext } from "@/modules/dashboard-assistant/contracts/turn-context"
import type { PipelineStep } from "@/modules/dashboard-assistant/contracts/turn-queue"
import {
  getCurrentQueueStep,
  parseAssistantTurnQueue,
} from "@/modules/dashboard-assistant/pipeline/assistant-turn-queue"
import { planAssistantTurnActions } from "@/modules/dashboard-assistant/planning/plan-assistant-turn-actions"
import type { TurnAction } from "@/modules/dashboard-assistant/planning/turn-action-types"

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function isConfirmationOrCancellationMessage(userMessage: string): boolean {
  const n = normalizeText(userMessage)
  return (
    n.includes("confirmar") ||
    n.includes("pode confirmar") ||
    n.includes("cancelar") ||
    n.includes("nao atualizar dados do paciente") ||
    n.includes("não atualizar dados do paciente") ||
    n.includes("manter valores anteriores") ||
    n.includes("manter dados anteriores") ||
    n.includes("nao armazenar alerta") ||
    n.includes("não armazenar alerta") ||
    n.includes("salvar alerta para resumo e relatorio") ||
    n.includes("salvar alerta")
  )
}

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
  intents: DashboardAssistantIntent[]
  steps: PipelineStep[]
  shouldBlockForPendingQueue: boolean
  blockReason: "awaiting_confirmation" | null
}

export async function detectIntentAndPlan(
  context: DashboardAssistantTurnContext,
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

  const intents = plan.actions.map((action) => action.kind as DashboardAssistantIntent)
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
