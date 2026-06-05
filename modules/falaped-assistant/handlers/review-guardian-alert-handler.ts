import type { AssistantIntentHandler } from "@/modules/falaped-assistant/handlers/handler-contract"
import { buildClinicalAlertItemsFromUserMessage } from "@/modules/falaped-assistant/clinical-alert-from-user-message"
import { hasIdenticalConfirmedClinicalAlertInThread } from "@/modules/falaped-assistant/lib/thread-scanning"

export const handleReviewGuardianAlert: AssistantIntentHandler = async (context) => {
  const alertItems = buildClinicalAlertItemsFromUserMessage(context.userMessage)

  const newAlerts = alertItems.filter(
    (item) => !hasIdenticalConfirmedClinicalAlertInThread(context.messages, item.detail),
  )

  if (newAlerts.length === 0) {
    return {
      intent: "REVIEW_GUARDIAN_ALERT",
      reply: "Não identifiquei novos alertas clínicos para armazenar.",
      action: "none",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  return {
    intent: "REVIEW_GUARDIAN_ALERT",
    reply: `Identifiquei ${newAlerts.length} alerta(s) clínico(s). Deseja salvar para resumo e relatório?`,
    action: "none",
    showStructuredCard: false,
    showAlert: true,
    clinicalAlertItems: newAlerts,
    storedData: [],
  }
}
