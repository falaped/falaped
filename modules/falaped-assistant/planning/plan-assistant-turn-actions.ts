import type { AssistantTurnContext } from "@/modules/falaped-assistant/contracts/turn-context"
import { extractActionsByLlm } from "@/modules/falaped-assistant/planning/extract-actions-by-llm"
import { buildCommandMessage } from "@/modules/falaped-assistant/lib/build-command-message"
import { normalizeText } from "@/modules/falaped-assistant/lib/normalize-text"
import { detectPatientProfileUpdateCandidate } from "@/modules/falaped-assistant/lib/patient-profile-parsers"
import {
  hasAnthropometricDivergence,
  shouldInjectGuardianAlertReview,
} from "@/modules/falaped-assistant/planning/planning-helpers"
import {
  actionRequiresConfirmation,
  orderActions,
  type TurnAction,
  type TurnActionKind,
  type TurnActionPlan,
  type TurnActionSource,
} from "@/modules/falaped-assistant/planning/turn-action-types"

export { hasAnthropometricDivergence, shouldInjectGuardianAlertReview }

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

export async function planAssistantTurnActions(
  context: AssistantTurnContext,
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

  // Dado de ficha pedido no chat (alergia, medicação em uso, histórico...) pede a
  // confirmação para gravar no paciente. Peso e altura já têm a revisão própria.
  const profileUpdate = detectPatientProfileUpdateCandidate({
    userMessage: context.userMessage,
    patientProfile: context.patientProfile,
  })
  const normalizedMessage = normalizeText(context.userMessage)
  const answersProfileReview =
    normalizedMessage.includes("confirmar atualizacao dos dados do paciente") ||
    normalizedMessage.includes("nao atualizar dados do paciente")
  if (
    (answersProfileReview ||
      (profileUpdate &&
        Object.keys(profileUpdate.updates).some((key) => !["weight", "height", "head_circumference"].includes(key)))) &&
    !llmActions.includes("REVIEW_PATIENT_PROFILE_UPDATE")
  ) {
    actions.push(createAction("REVIEW_PATIENT_PROFILE_UPDATE", context.userMessage, "rule"))
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

  return {
    actions: finalActions.length > 0 ? finalActions : [createAction("CHAT", context.userMessage, "fallback")],
    source: overallSource,
  }
}
