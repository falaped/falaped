import type { DashboardAssistantIntent } from "@/modules/dashboard-assistant/contracts/assistant-types"
import type { DashboardAssistantTurnContext } from "@/modules/dashboard-assistant/contracts/turn-context"
import type { PipelineStep } from "@/modules/dashboard-assistant/contracts/turn-queue"
import { decomposeTurnIntentsByAi } from "@/modules/groq/decompose-turn-intents"
import { getCurrentQueueStep } from "@/modules/dashboard-assistant/pipeline/assistant-turn-queue"
import { orderPipelineSteps, requiresConfirmationForStep } from "@/modules/dashboard-assistant/pipeline/pipeline-policy"
import { parseWeightHeightForBmi } from "@/lib/parse-anthropometrics-for-bmi"

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
    n.includes("não armazenar alerta")
  )
}

function buildCommandMessage(intent: DashboardAssistantIntent, originalInput: string): string {
  if (intent === "CALCULATE_BMI") return originalInput
  if (intent === "SUMMARY") return "/resumo"
  if (intent === "SUGGEST_GUARDIAN_QUESTIONS") return "sugerir perguntas para o responsavel"
  if (intent === "GENERATE_REPORT") return "gerar relatorio"
  if (intent === "GENERATE_MEDICAL_CERTIFICATE") return "gerar atestado"
  if (intent === "GENERATE_PRESCRIPTION") return "gerar receita"
  if (intent === "CLOSE_CASE") return "encerrar caso"
  return originalInput
}

function createPipelineStep(intent: DashboardAssistantIntent, originalInput: string): PipelineStep {
  return {
    id: `${Date.now()}-${intent}`,
    kind: intent,
    originalInput,
    commandMessage: buildCommandMessage(intent, originalInput),
    requiresConfirmation: requiresConfirmationForStep(intent),
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
  const currentQueuedStep = getCurrentQueueStep(context.turnQueue ?? null)
  if (
    currentQueuedStep &&
    currentQueuedStep.requiresConfirmation &&
    !isConfirmationOrCancellationMessage(context.userMessage)
  ) {
    return {
      source: context.turnQueue?.source === "llm" ? "llm" : "heuristic",
      intents: [currentQueuedStep.kind],
      steps: [currentQueuedStep],
      shouldBlockForPendingQueue: true,
      blockReason: "awaiting_confirmation",
    }
  }

  const aiDecomposition = await decomposeTurnIntentsByAi({
    userMessage: context.userMessage,
  })

  const intents = Array.from(new Set(aiDecomposition.intents)) as DashboardAssistantIntent[]
  const parsedAnthropometrics = parseWeightHeightForBmi(context.userMessage)
  const hasAnthropometricInput =
    parsedAnthropometrics.weightKg != null || parsedAnthropometrics.heightM != null
  const differsFromCurrentReference =
    (parsedAnthropometrics.weightKg != null &&
      context.patientMetrics?.weight != null &&
      Math.abs(parsedAnthropometrics.weightKg - context.patientMetrics.weight) >= 0.05) ||
    (parsedAnthropometrics.heightM != null &&
      context.patientMetrics?.height != null &&
      Math.abs(parsedAnthropometrics.heightM - context.patientMetrics.height) >= 0.005)

  if (
    hasAnthropometricInput &&
    differsFromCurrentReference &&
    !intents.includes("REVIEW_ANTHROPOMETRIC_REFERENCE")
  ) {
    intents.unshift("REVIEW_ANTHROPOMETRIC_REFERENCE")
  }

  const steps = orderPipelineSteps(intents.map((intent) => createPipelineStep(intent, context.userMessage)))

  return {
    source: aiDecomposition.source,
    intents,
    steps,
    shouldBlockForPendingQueue: false,
    blockReason: null,
  }
}
