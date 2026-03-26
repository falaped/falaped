import type { AssistantIntentHandler } from "@/modules/falaped-assistant/handlers/handler-contract"
import { detectPatientProfileUpdateCandidate, findLatestPatientProfileUpdateCandidateFromThread } from "@/modules/falaped-assistant/lib/patient-profile-parsers"
import { hasRecentPatientProfileUpdateConfirmation } from "@/modules/falaped-assistant/lib/thread-scanning"

export const handleReviewPatientProfileUpdate: AssistantIntentHandler = async (context) => {
  if (hasRecentPatientProfileUpdateConfirmation(context.messages)) {
    return {
      intent: "REVIEW_PATIENT_PROFILE_UPDATE",
      reply: "Os dados do paciente já foram atualizados recentemente neste caso.",
      action: "none",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  const candidate = detectPatientProfileUpdateCandidate({
    userMessage: context.userMessage,
    patientProfile: context.patientProfile,
  }) ?? findLatestPatientProfileUpdateCandidateFromThread({
    messages: context.messages,
    patientProfile: context.patientProfile,
  })

  if (!candidate) {
    return {
      intent: "REVIEW_PATIENT_PROFILE_UPDATE",
      reply: "Não identifiquei dados novos para atualizar no perfil do paciente.",
      action: "none",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  const summaryText = candidate.summaryLines.join("\n")
  return {
    intent: "REVIEW_PATIENT_PROFILE_UPDATE",
    reply: `Identifiquei os seguintes dados para atualização:\n${summaryText}\n\nDeseja confirmar a atualização?`,
    action: "none",
    showStructuredCard: false,
    showAlert: false,
    showPatientProfileUpdateActions: true,
    patientProfileUpdatePayload: candidate.updates,
    storedData: [],
  }
}
