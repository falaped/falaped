import type { AssistantIntentHandler } from "@/modules/falaped-assistant/handlers/handler-contract"
import { generateAssistantCaseChat } from "@/modules/groq/assistant-case-chat"
import { isPatientDataAccessQuestion } from "@/modules/falaped-assistant/lib/message-classification"
import { buildMessagesForModel, resolveClinicalSyncMode } from "@/modules/falaped-assistant/lib/thread-scanning"
import { buildPatientDataAccessReply } from "@/modules/falaped-assistant/lib/formatters"
import { enforceReplyVariation, refineChatReplyAfterModel } from "@/modules/falaped-assistant/lib/reply-variation"

export const handleQuestion: AssistantIntentHandler = async (context) => {
  if (isPatientDataAccessQuestion(context.userMessage)) {
    return {
      intent: "QUESTION",
      reply: buildPatientDataAccessReply(context.patientProfile),
      action: "none",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  const messagesForModel = buildMessagesForModel(context.messages, context.userMessage)
  const clinicalSyncMode = resolveClinicalSyncMode(context.userMessage)
  const generated = await generateAssistantCaseChat({
    messages: messagesForModel,
    patientContext: context.patientContext,
    conversationSummary: context.conversationSummary,
    clinicalSyncMode,
  })
  const reply = enforceReplyVariation(
    context.userMessage,
    refineChatReplyAfterModel(context.userMessage, generated),
    context.messages,
  )

  return {
    intent: "QUESTION",
    reply,
    action: "none",
    showStructuredCard: false,
    showAlert: false,
    storedData: [],
  }
}
