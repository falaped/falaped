import type { AssistantIntentHandler } from "@/modules/falaped-assistant/handlers/handler-contract"
import { detectPatientProfileUpdateCandidate, findLatestPatientProfileUpdateCandidateFromThread } from "@/modules/falaped-assistant/lib/patient-profile-parsers"
import { hasRecentPatientProfileUpdateConfirmation } from "@/modules/falaped-assistant/lib/thread-scanning"
import { normalizeText } from "@/modules/falaped-assistant/lib/normalize-text"

export const handleReviewPatientProfileUpdate: AssistantIntentHandler = async (context) => {
  // Resposta aos botões da revisão: grava (a action aplica o payload) ou deixa como está.
  const normalized = normalizeText(context.userMessage)
  if (normalized.includes("nao atualizar dados do paciente")) {
    return {
      intent: "REVIEW_PATIENT_PROFILE_UPDATE",
      reply: "Certo, a ficha do paciente fica como está.",
      action: "decline_update_patient_profile",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }
  if (normalized.includes("confirmar atualizacao dos dados do paciente")) {
    const pending = findLatestPatientProfileUpdateCandidateFromThread({
      messages: context.messages,
      patientProfile: context.patientProfile,
    })
    return {
      intent: "REVIEW_PATIENT_PROFILE_UPDATE",
      reply: pending ? "Perfil do paciente atualizado." : "Os dados do paciente já estão atualizados.",
      action: pending ? "confirm_update_patient_profile" : "decline_update_patient_profile",
      patientProfileUpdatePayload: pending?.updates,
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  // Pedido novo nesta mensagem sempre vale; o fio só é revisitado se nada foi confirmado ainda.
  const fromMessage = detectPatientProfileUpdateCandidate({
    userMessage: context.userMessage,
    patientProfile: context.patientProfile,
  })
  if (!fromMessage && hasRecentPatientProfileUpdateConfirmation(context.messages)) {
    return {
      intent: "REVIEW_PATIENT_PROFILE_UPDATE",
      reply: "Os dados do paciente já foram atualizados recentemente neste caso.",
      action: "none",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  const candidate = fromMessage ?? findLatestPatientProfileUpdateCandidateFromThread({
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
