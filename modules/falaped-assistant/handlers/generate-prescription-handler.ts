import type { AssistantIntentHandler } from "@/modules/falaped-assistant/handlers/handler-contract"

export const handleGeneratePrescription: AssistantIntentHandler = async () => {
  return {
    intent: "GENERATE_PRESCRIPTION",
    reply: "Deseja confirmar a geração da receita para este caso?",
    action: "confirm_generate_prescription",
    showStructuredCard: false,
    showAlert: false,
    storedData: [],
  }
}
