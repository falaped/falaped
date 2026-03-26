import type { AssistantIntentHandler } from "@/modules/falaped-assistant/handlers/handler-contract"

export const handleGenerateMedicalCertificate: AssistantIntentHandler = async () => {
  return {
    intent: "GENERATE_MEDICAL_CERTIFICATE",
    reply: "Deseja confirmar a geração do atestado médico para este caso?",
    action: "confirm_generate_medical_certificate",
    showStructuredCard: false,
    showAlert: false,
    storedData: [],
  }
}
