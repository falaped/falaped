import type { AssistantIntentHandler } from "@/modules/falaped-assistant/handlers/handler-contract"
import { generateAssistantCaseChat } from "@/modules/groq/assistant-case-chat"
import { isLikelyDictationMessage, isLikelyVaccineOrientationMessage } from "@/modules/falaped-assistant/lib/message-classification"
import { buildMessagesForModel, resolveClinicalSyncMode, buildThreadTextForAuxiliaryModel } from "@/modules/falaped-assistant/lib/thread-scanning"
import { extractStoredData } from "@/modules/falaped-assistant/lib/stored-data-extraction"
import { enforceReplyVariation, refineChatReplyAfterModel, needsAntiBmiEchoRecovery, buildDeterministicAcknowledgement, vaccineReplyViolatesCondutaOnly } from "@/modules/falaped-assistant/lib/reply-variation"

export const handleChat: AssistantIntentHandler = async (context) => {
  const isDictation = isLikelyDictationMessage(context.userMessage)
  const isVaccine = isLikelyVaccineOrientationMessage(context.userMessage)
  const clinicalSyncMode = resolveClinicalSyncMode(context.userMessage)
  const messagesForModel = buildMessagesForModel(context.messages, context.userMessage)
  const storedData = extractStoredData(context.userMessage)

  let reply: string

  if (isDictation && !isVaccine) {
    reply = buildDeterministicAcknowledgement(context.userMessage, context.messages)
  } else {
    const generated = await generateAssistantCaseChat({
      messages: messagesForModel,
      patientContext: context.patientContext,
      conversationSummary: context.conversationSummary,
      clinicalSyncMode,
    })
    reply = refineChatReplyAfterModel(context.userMessage, generated)

    if (needsAntiBmiEchoRecovery(context.userMessage, reply)) {
      reply = buildDeterministicAcknowledgement(context.userMessage, context.messages)
    }

    if (isVaccine && vaccineReplyViolatesCondutaOnly(reply)) {
      const retried = await generateAssistantCaseChat({
        messages: messagesForModel,
        patientContext: context.patientContext,
        conversationSummary: context.conversationSummary,
        clinicalSyncMode,
      })
      const retriedClean = refineChatReplyAfterModel(context.userMessage, retried)
      if (!vaccineReplyViolatesCondutaOnly(retriedClean)) {
        reply = retriedClean
      }
    }

    reply = enforceReplyVariation(context.userMessage, reply, context.messages)
  }

  return {
    intent: "CHAT",
    reply,
    action: "none",
    showStructuredCard: storedData.length > 0,
    showAlert: false,
    storedData,
  }
}
