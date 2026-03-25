import type { DashboardAssistantTurnContext } from "@/modules/dashboard-assistant/contracts/turn-context"
import {
  parseWeightHeightForBmi,
  stripNeonatalBirthMeasuresFromParsedAnthropometrics,
} from "@/lib/parse-anthropometrics-for-bmi"
import {
  buildClinicalAlertItemsFromUserMessage,
  hasExplicitGuardianQuotedOrShoutSignal,
} from "@/modules/dashboard-assistant/clinical-alert-from-user-message"
import { extractActionsByLlm } from "@/modules/dashboard-assistant/planning/extract-actions-by-llm"
import {
  actionRequiresConfirmation,
  orderActions,
  type TurnAction,
  type TurnActionKind,
  type TurnActionPlan,
  type TurnActionSource,
} from "@/modules/dashboard-assistant/planning/turn-action-types"

function buildCommandMessage(kind: TurnActionKind, originalInput: string): string {
  if (kind === "CALCULATE_BMI") return originalInput
  if (kind === "SUMMARY") return "/resumo"
  if (kind === "SUGGEST_GUARDIAN_QUESTIONS") return "sugerir perguntas para o responsavel"
  if (kind === "GENERATE_REPORT") return "gerar relatorio"
  if (kind === "GENERATE_MEDICAL_CERTIFICATE") return "gerar atestado"
  if (kind === "GENERATE_PRESCRIPTION") return "gerar receita"
  if (kind === "CLOSE_CASE") return "encerrar caso"
  return originalInput
}

function createAction(
  kind: TurnActionKind,
  originalInput: string,
  source: TurnActionSource,
): TurnAction {
  return {
    kind,
    source,
    originalInput,
    commandMessage: buildCommandMessage(kind, originalInput),
    requiresConfirmation: actionRequiresConfirmation(kind),
  }
}

function hasAnthropometricDivergence(
  userMessage: string,
  patientMetrics?: { weight: number | null; height: number | null },
): { diverges: boolean; hasInput: boolean } {
  const parsed = stripNeonatalBirthMeasuresFromParsedAnthropometrics(
    userMessage,
    parseWeightHeightForBmi(userMessage),
  )
  const hasInput = parsed.weightKg != null || parsed.heightM != null
  if (!hasInput) return { diverges: false, hasInput: false }

  const weightDiffers =
    parsed.weightKg != null &&
    patientMetrics?.weight != null &&
    Math.abs(parsed.weightKg - patientMetrics.weight) >= 0.05
  const heightDiffers =
    parsed.heightM != null &&
    patientMetrics?.height != null &&
    Math.abs(parsed.heightM - patientMetrics.height) >= 0.005

  return { diverges: weightDiffers || heightDiffers, hasInput: true }
}

function shouldInjectGuardianAlertReview(userMessage: string): boolean {
  if (hasExplicitGuardianQuotedOrShoutSignal(userMessage)) return true
  return buildClinicalAlertItemsFromUserMessage(userMessage).length > 0
}

export async function planAssistantTurnActions(
  context: DashboardAssistantTurnContext,
): Promise<TurnActionPlan> {
  const extracted = await extractActionsByLlm(context.userMessage)
  const llmActions = extracted.actions

  const actions: TurnAction[] = llmActions.map((kind) =>
    createAction(kind, context.userMessage, extracted.source === "llm" ? "llm" : "fallback"),
  )

  const anthropometrics = hasAnthropometricDivergence(
    context.userMessage,
    context.patientMetrics,
  )
  if (
    anthropometrics.hasInput &&
    anthropometrics.diverges &&
    !llmActions.includes("REVIEW_ANTHROPOMETRIC_REFERENCE")
  ) {
    actions.unshift(
      createAction("REVIEW_ANTHROPOMETRIC_REFERENCE", context.userMessage, "rule"),
    )
  }

  if (
    shouldInjectGuardianAlertReview(context.userMessage) &&
    !llmActions.includes("REVIEW_GUARDIAN_ALERT")
  ) {
    actions.push(createAction("REVIEW_GUARDIAN_ALERT", context.userMessage, "rule"))
  }

  const ordered = orderActions(actions)

  const REVIEW_KINDS: TurnActionKind[] = [
    "REVIEW_GUARDIAN_ALERT",
    "REVIEW_ANTHROPOMETRIC_REFERENCE",
    "REVIEW_PATIENT_PROFILE_UPDATE",
  ]
  const hasRuleInjectedReview = ordered.some(
    (a) => a.source === "rule" && REVIEW_KINDS.includes(a.kind),
  )
  const finalActions = hasRuleInjectedReview
    ? ordered.filter((a) => a.kind !== "CHAT")
    : ordered

  const overallSource: TurnActionSource =
    finalActions.some((a) => a.source === "rule") && finalActions.some((a) => a.source === "llm")
      ? "rule"
      : extracted.source === "llm"
        ? "llm"
        : "fallback"

  console.log(
    "[ASSISTANT_PLAN] actions=%s source=%s",
    finalActions.map((a) => a.kind).join(","),
    overallSource,
  )

  return {
    actions: finalActions.length > 0 ? finalActions : [createAction("CHAT", context.userMessage, "fallback")],
    source: overallSource,
  }
}
