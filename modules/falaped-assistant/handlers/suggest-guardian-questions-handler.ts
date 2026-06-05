import type { AssistantIntentHandler } from "@/modules/falaped-assistant/handlers/handler-contract"
import { generateAssistantCaseChat } from "@/modules/groq/assistant-case-chat"
import { buildMessagesForModel } from "@/modules/falaped-assistant/lib/thread-scanning"

export const handleSuggestGuardianQuestions: AssistantIntentHandler = async (context) => {
  const messagesForModel = buildMessagesForModel(context.messages, context.userMessage)

  const generated = await generateAssistantCaseChat({
    messages: messagesForModel,
    patientContext: context.patientContext,
    conversationSummary: context.conversationSummary,
    clinicalSyncMode: "single_turn",
  })

  return {
    intent: "SUGGEST_GUARDIAN_QUESTIONS",
    reply: generated,
    action: "none",
    showStructuredCard: false,
    showAlert: false,
    storedData: [],
  }
}
