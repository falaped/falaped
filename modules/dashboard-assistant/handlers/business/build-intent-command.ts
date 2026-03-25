import type { DashboardAssistantIntent } from "@/modules/dashboard-assistant/contracts/assistant-types"
import type { DashboardAssistantTurnContext } from "@/modules/dashboard-assistant/contracts/turn-context"

function isControlMessage(userMessage: string): boolean {
  const normalized = userMessage
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
  return normalized.includes("confirmar") || normalized.includes("cancelar")
}

export function buildIntentCommand(
  intent: DashboardAssistantIntent,
  context: DashboardAssistantTurnContext,
): string {
  if (isControlMessage(context.userMessage)) return context.userMessage
  if (intent === "CALCULATE_BMI") return context.userMessage
  if (intent === "SUMMARY") return "/resumo"
  if (intent === "SUGGEST_GUARDIAN_QUESTIONS") return "sugerir perguntas para o responsavel"
  if (intent === "GENERATE_REPORT") return "gerar relatorio"
  if (intent === "GENERATE_MEDICAL_CERTIFICATE") return "gerar atestado"
  if (intent === "GENERATE_PRESCRIPTION") return "gerar receita"
  if (intent === "CLOSE_CASE") return "encerrar caso"
  return context.userMessage
}
