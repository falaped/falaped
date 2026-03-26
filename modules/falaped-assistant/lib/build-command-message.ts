import type { AssistantIntent } from "@/modules/falaped-assistant/contracts/assistant-types"
import { normalizeText } from "@/modules/falaped-assistant/lib/normalize-text"

function isControlMessage(userMessage: string): boolean {
  const normalized = normalizeText(userMessage)
  return normalized.includes("confirmar") || normalized.includes("cancelar")
}

export function buildCommandMessage(
  intent: AssistantIntent,
  userMessage: string,
): string {
  if (isControlMessage(userMessage)) return userMessage
  if (intent === "CALCULATE_BMI") return userMessage
  if (intent === "SUMMARY") return "/resumo"
  if (intent === "SUGGEST_GUARDIAN_QUESTIONS") return "sugerir perguntas para o responsavel"
  if (intent === "GENERATE_REPORT") return "gerar relatorio"
  if (intent === "GENERATE_MEDICAL_CERTIFICATE") return "gerar atestado"
  if (intent === "GENERATE_PRESCRIPTION") return "gerar receita"
  if (intent === "CLOSE_CASE") return "encerrar caso"
  return userMessage
}
