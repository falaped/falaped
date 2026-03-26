import type { AssistantIntentHandler } from "@/modules/falaped-assistant/handlers/handler-contract"
import { parseWeightHeightForBmi, stripNeonatalBirthMeasuresFromParsedAnthropometrics, computePediatricBmi } from "@/lib/parse-anthropometrics-for-bmi"
import { getLatestPendingBmiFromAssistantMessages, getLatestAnthropometricsFromUserMessages } from "@/modules/falaped-assistant/lib/thread-scanning"
import { buildBmiStoredData } from "@/modules/falaped-assistant/lib/stored-data-extraction"
import { formatBmiConfirmationReply } from "@/modules/falaped-assistant/lib/formatters"
import { isBmiConfirmationMessage } from "@/modules/falaped-assistant/lib/message-classification"

export const handleCalculateBmi: AssistantIntentHandler = async (context) => {
  if (isBmiConfirmationMessage(context.userMessage)) {
    const pending = getLatestPendingBmiFromAssistantMessages(context.messages)
    if (pending) {
      return {
        intent: "CALCULATE_BMI",
        reply: formatBmiConfirmationReply(pending),
        action: "none",
        showStructuredCard: true,
        showAlert: false,
        storedData: [],
      }
    }
  }

  const parsed = stripNeonatalBirthMeasuresFromParsedAnthropometrics(
    context.userMessage,
    parseWeightHeightForBmi(context.userMessage),
  )
  let weightKg = parsed.weightKg ?? null
  let heightM = parsed.heightM ?? null

  if (weightKg == null || heightM == null) {
    const fromThread = getLatestAnthropometricsFromUserMessages(context.messages)
    if (weightKg == null) weightKg = fromThread.weightKg
    if (heightM == null) heightM = fromThread.heightM
  }

  if (weightKg == null || heightM == null) {
    const missing = []
    if (weightKg == null) missing.push("peso")
    if (heightM == null) missing.push("comprimento/altura")
    return {
      intent: "CALCULATE_BMI",
      reply: `Para calcular o IMC, preciso de ${missing.join(" e ")}. Informe os valores (ex.: peso 5 kg, comprimento 51 cm).`,
      action: "none",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  const bmiResult = computePediatricBmi(weightKg, heightM)
  if (!bmiResult.ok) {
    return {
      intent: "CALCULATE_BMI",
      reply: bmiResult.reason,
      action: "none",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  const storedData = buildBmiStoredData({ weightKg, heightM, bmi: bmiResult.bmi })

  return {
    intent: "CALCULATE_BMI",
    reply: `IMC estimado: ${bmiResult.bmi.toFixed(1).replace(".", ",")}. Confirme se peso e altura estão corretos.`,
    action: "none",
    showStructuredCard: true,
    showAlert: false,
    storedData,
  }
}
