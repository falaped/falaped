import type { AssistantIntentHandler } from "@/modules/falaped-assistant/handlers/handler-contract"
import { detectAnthropometricReferenceChange } from "@/modules/falaped-assistant/lib/thread-scanning"
import { isCommandLikeMessage } from "@/modules/falaped-assistant/lib/message-classification"
import { parseWeightHeightForBmi, stripNeonatalBirthMeasuresFromParsedAnthropometrics } from "@/lib/parse-anthropometrics-for-bmi"
import { parseHeadCircumferenceCmFromMessage } from "@/modules/falaped-assistant/lib/patient-profile-parsers"
import type { CaseMessage } from "@/modules/cases/get-case-by-id"
import { normalizeText } from "@/modules/falaped-assistant/lib/normalize-text"

/** Peso, estatura e PC da última mensagem do médico que trouxe medida (a que gerou a revisão). */
function latestReviewedAnthropometrics(messages: CaseMessage[]): { weightKg: number | null; heightM: number | null; headCm: number | null } {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message.role !== "user" || isCommandLikeMessage(message.content)) continue
    const parsed = stripNeonatalBirthMeasuresFromParsedAnthropometrics(message.content, parseWeightHeightForBmi(message.content))
    const headCm = parseHeadCircumferenceCmFromMessage(message.content)
    if (parsed.weightKg != null || parsed.heightM != null || headCm != null) {
      return { weightKg: parsed.weightKg ?? null, heightM: parsed.heightM ?? null, headCm }
    }
  }
  return { weightKg: null, heightM: null, headCm: null }
}

export const handleReviewAnthropometricReference: AssistantIntentHandler = async (context) => {
  // Resposta aos botões da revisão: grava a medida (a action cria o registro) ou mantém.
  const normalized = normalizeText(context.userMessage)
  if (normalized.includes("manter valores anteriores") || normalized.includes("manter dados anteriores")) {
    return {
      intent: "REVIEW_ANTHROPOMETRIC_REFERENCE",
      reply: "Certo, as medidas registradas ficam como estão.",
      action: "keep_previous_anthropometric_reference",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }
  if (normalized.includes("confirmar novos dados antropometricos") || normalized.includes("usar novos dados antropometricos")) {
    const latest = latestReviewedAnthropometrics(context.messages)
    const hasValue = latest.weightKg != null || latest.heightM != null || latest.headCm != null
    return {
      intent: "REVIEW_ANTHROPOMETRIC_REFERENCE",
      reply: hasValue ? "" : "Não encontrei peso, estatura ou PC para registrar. Informe os valores (ex.: peso 12 kg).",
      action: hasValue ? "confirm_anthropometric_reference" : "keep_previous_anthropometric_reference",
      anthropometricUpdate: hasValue ? latest : undefined,
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  const change = detectAnthropometricReferenceChange({
    userMessage: context.userMessage,
    patientMetrics: context.patientMetrics,
  })

  // Pedido explícito pelo chip vale mesmo sem medida anterior para comparar.
  const explicit = normalized.startsWith("alterar medidas")
  if (!change.hasChange && !(explicit && (change.weightKg != null || change.heightM != null || change.headCm != null))) {
    return {
      intent: "REVIEW_ANTHROPOMETRIC_REFERENCE",
      reply: "Dados antropométricos registrados.",
      action: "none",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 })
  const parts: string[] = []
  if (change.weightKg != null) parts.push(`peso ${decimal.format(change.weightKg)} kg`)
  if (change.heightM != null) parts.push(`estatura ${decimal.format(change.heightM * 100)} cm`)
  if (change.headCm != null) parts.push(`PC ${decimal.format(change.headCm)} cm`)

  return {
    intent: "REVIEW_ANTHROPOMETRIC_REFERENCE",
    reply: `Novas medidas: ${parts.join(", ")}. Confirma para registrar na consulta e atualizar o IMC?`,
    action: "none",
    showStructuredCard: false,
    showAlert: false,
    storedData: [],
  }
}
