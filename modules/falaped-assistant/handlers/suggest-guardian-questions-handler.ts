import type { AssistantIntentHandler } from "@/modules/falaped-assistant/handlers/handler-contract"
import { generateAssistantCaseChat } from "@/modules/groq/assistant-case-chat"
import { buildMessagesForModel } from "@/modules/falaped-assistant/lib/thread-scanning"
import { buildPatientGrammarHintForGuardianQuestions } from "@/modules/falaped-assistant/lib/formatters"

export const handleSuggestGuardianQuestions: AssistantIntentHandler = async (context) => {
  const messagesForModel = buildMessagesForModel(context.messages, context.userMessage)
  const grammarHint = buildPatientGrammarHintForGuardianQuestions(context.patientProfile)

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
