import type { AssistantIntentHandler } from "@/modules/falaped-assistant/handlers/handler-contract"

export const handleCloseCase: AssistantIntentHandler = async () => {
  return {
    intent: "CLOSE_CASE",
    reply: "Deseja confirmar o encerramento deste caso?",
    action: "confirm_close_case",
    showStructuredCard: false,
    showAlert: false,
    storedData: [],
  }
}
