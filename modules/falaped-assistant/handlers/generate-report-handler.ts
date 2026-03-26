import type { AssistantIntentHandler } from "@/modules/falaped-assistant/handlers/handler-contract"

export const handleGenerateReport: AssistantIntentHandler = async () => {
  return {
    intent: "GENERATE_REPORT",
    reply: "Deseja confirmar a geração do relatório para este caso?",
    action: "confirm_generate_report",
    showStructuredCard: false,
    showAlert: false,
    storedData: [],
  }
}
