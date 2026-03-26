import type { AssistantIntent } from "@/modules/falaped-assistant/contracts/assistant-types"
import type { AssistantTurnContext } from "@/modules/falaped-assistant/contracts/turn-context"
import type { RouteResult } from "@/modules/falaped-assistant/contracts/route-result"
import type { AssistantIntentHandler } from "@/modules/falaped-assistant/handlers/handler-contract"
import { handleChat } from "@/modules/falaped-assistant/handlers/chat-handler"
import { handleQuestion } from "@/modules/falaped-assistant/handlers/question-handler"
import { handleSummary } from "@/modules/falaped-assistant/handlers/summary-handler"
import { handleCalculateBmi } from "@/modules/falaped-assistant/handlers/calculate-bmi-handler"
import { handleReviewPatientProfileUpdate } from "@/modules/falaped-assistant/handlers/review-patient-profile-update-handler"
import { handleReviewAnthropometricReference } from "@/modules/falaped-assistant/handlers/review-anthropometric-reference-handler"
import { handleReviewGuardianAlert } from "@/modules/falaped-assistant/handlers/review-guardian-alert-handler"
import { handleSuggestGuardianQuestions } from "@/modules/falaped-assistant/handlers/suggest-guardian-questions-handler"
import { handleGenerateReport } from "@/modules/falaped-assistant/handlers/generate-report-handler"
import { handleGenerateMedicalCertificate } from "@/modules/falaped-assistant/handlers/generate-medical-certificate-handler"
import { handleGeneratePrescription } from "@/modules/falaped-assistant/handlers/generate-prescription-handler"
import { handleCloseCase } from "@/modules/falaped-assistant/handlers/close-case-handler"

const HANDLERS: Record<AssistantIntent, AssistantIntentHandler> = {
  CHAT: handleChat,
  QUESTION: handleQuestion,
  SUMMARY: handleSummary,
  CALCULATE_BMI: handleCalculateBmi,
  REVIEW_PATIENT_PROFILE_UPDATE: handleReviewPatientProfileUpdate,
  REVIEW_ANTHROPOMETRIC_REFERENCE: handleReviewAnthropometricReference,
  REVIEW_GUARDIAN_ALERT: handleReviewGuardianAlert,
  SUGGEST_GUARDIAN_QUESTIONS: handleSuggestGuardianQuestions,
  GENERATE_REPORT: handleGenerateReport,
  GENERATE_MEDICAL_CERTIFICATE: handleGenerateMedicalCertificate,
  GENERATE_PRESCRIPTION: handleGeneratePrescription,
  CLOSE_CASE: handleCloseCase,
}

export async function dispatchAssistantRoute(
  intent: AssistantIntent,
  context: AssistantTurnContext,
): Promise<RouteResult> {
  const handler = HANDLERS[intent]
  return handler(context)
}
