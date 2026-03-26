import type { AssistantIntentHandler } from "@/modules/falaped-assistant/handlers/handler-contract"
import { detectAnthropometricReferenceChange } from "@/modules/falaped-assistant/lib/thread-scanning"
import { formatPtDecimal } from "@/modules/falaped-assistant/lib/formatters"

export const handleReviewAnthropometricReference: AssistantIntentHandler = async (context) => {
  const change = detectAnthropometricReferenceChange({
    userMessage: context.userMessage,
    patientMetrics: context.patientMetrics,
  })

  if (!change.hasChange) {
    return {
      intent: "REVIEW_ANTHROPOMETRIC_REFERENCE",
      reply: "Dados antropométricos registrados.",
      action: "none",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  const parts: string[] = []
  if (change.weightKg != null) parts.push(`peso ${change.weightKg.toFixed(3).replace(/\.?0+$/, "")} kg`)
  if (change.heightM != null) parts.push(`comprimento ${formatPtDecimal(change.heightM * 100, 1)} cm`)

  return {
    intent: "REVIEW_ANTHROPOMETRIC_REFERENCE",
    reply: `Novos dados antropométricos identificados: ${parts.join(", ")}. Deseja usar esses novos valores como referência para este caso?`,
    action: "none",
    showStructuredCard: false,
    showAlert: false,
    storedData: [],
  }
}
