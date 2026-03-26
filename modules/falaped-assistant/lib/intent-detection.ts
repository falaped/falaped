import type { AssistantIntent } from "@/modules/falaped-assistant/contracts/assistant-types"
import { normalizeText } from "@/modules/falaped-assistant/lib/normalize-text"
import { isQuestionLikeMessage } from "@/modules/falaped-assistant/lib/message-classification"

export function detectAssistantIntent(message: string): AssistantIntent {
  const normalized = normalizeText(message)

  if (normalized.includes("/resumo") || normalized.includes("resumir principais pontos")) {
    return "SUMMARY"
  }
  if (
    normalized.includes("/imc") ||
    normalized.includes("calcular imc") ||
    /\bimc\b/.test(normalized) ||
    /\bindice\s+de\s+massa(\s+corporal)?\b/.test(normalized)
  ) {
    return "CALCULATE_BMI"
  }
  if (
    normalized.includes("sugerir perguntas para o responsavel") ||
    normalized.includes("sugererir perguntas ao responsavel") ||
    normalized.includes("sugerir perguntas ao responsavel")
  ) {
    return "SUGGEST_GUARDIAN_QUESTIONS"
  }
  if (normalized.includes("/relatorio") || normalized.includes("gerar relatorio")) {
    return "GENERATE_REPORT"
  }
  if (normalized.includes("/atestado") || normalized.includes("gerar atestado")) {
    return "GENERATE_MEDICAL_CERTIFICATE"
  }
  if (normalized.includes("/receita") || normalized.includes("gerar receita")) {
    return "GENERATE_PRESCRIPTION"
  }
  if (
    normalized.includes("/encerrar") ||
    normalized.includes("encerrar caso") ||
    normalized.includes("fechar caso")
  ) {
    return "CLOSE_CASE"
  }

  if (isQuestionLikeMessage(message)) {
    return "QUESTION"
  }

  return "CHAT"
}
