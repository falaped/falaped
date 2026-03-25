import type { DashboardAssistantIntent } from "@/modules/dashboard-assistant/contracts/assistant-types"
import type { DashboardAssistantTurnContext } from "@/modules/dashboard-assistant/contracts/turn-context"
import type { RouteResult } from "@/modules/dashboard-assistant/contracts/route-result"
import type { AssistantIntentHandler } from "@/modules/dashboard-assistant/handlers/handler-contract"
import { chatHandler } from "@/modules/dashboard-assistant/handlers/chat-handler"
import { questionHandler } from "@/modules/dashboard-assistant/handlers/question-handler"
import { summaryHandler } from "@/modules/dashboard-assistant/handlers/summary-handler"
import { calculateBmiHandler } from "@/modules/dashboard-assistant/handlers/calculate-bmi-handler"
import { reviewPatientProfileUpdateHandler } from "@/modules/dashboard-assistant/handlers/review-patient-profile-update-handler"
import { reviewAnthropometricReferenceHandler } from "@/modules/dashboard-assistant/handlers/review-anthropometric-reference-handler"
import { reviewGuardianAlertHandler } from "@/modules/dashboard-assistant/handlers/review-guardian-alert-handler"
import { suggestGuardianQuestionsHandler } from "@/modules/dashboard-assistant/handlers/suggest-guardian-questions-handler"
import { generateReportHandler } from "@/modules/dashboard-assistant/handlers/generate-report-handler"
import { generateMedicalCertificateHandler } from "@/modules/dashboard-assistant/handlers/generate-medical-certificate-handler"
import { generatePrescriptionHandler } from "@/modules/dashboard-assistant/handlers/generate-prescription-handler"
import { closeCaseHandler } from "@/modules/dashboard-assistant/handlers/close-case-handler"

const HANDLERS: Record<DashboardAssistantIntent, AssistantIntentHandler> = {
  CHAT: chatHandler,
  QUESTION: questionHandler,
  SUMMARY: summaryHandler,
  CALCULATE_BMI: calculateBmiHandler,
  REVIEW_PATIENT_PROFILE_UPDATE: reviewPatientProfileUpdateHandler,
  REVIEW_ANTHROPOMETRIC_REFERENCE: reviewAnthropometricReferenceHandler,
  REVIEW_GUARDIAN_ALERT: reviewGuardianAlertHandler,
  SUGGEST_GUARDIAN_QUESTIONS: suggestGuardianQuestionsHandler,
  GENERATE_REPORT: generateReportHandler,
  GENERATE_MEDICAL_CERTIFICATE: generateMedicalCertificateHandler,
  GENERATE_PRESCRIPTION: generatePrescriptionHandler,
  CLOSE_CASE: closeCaseHandler,
}

export async function dispatchAssistantRoute(
  intent: DashboardAssistantIntent,
  context: DashboardAssistantTurnContext,
): Promise<RouteResult> {
  const handler = HANDLERS[intent]
  return handler(context)
}
