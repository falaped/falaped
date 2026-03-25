import type {
  PipelineStep,
  PipelineStepKind,
} from "@/modules/dashboard-assistant/contracts/turn-queue"

const ORDER_PRIORITY: Record<PipelineStepKind, number> = {
  REVIEW_PATIENT_PROFILE_UPDATE: 10,
  REVIEW_ANTHROPOMETRIC_REFERENCE: 20,
  REVIEW_GUARDIAN_ALERT: 30,
  CALCULATE_BMI: 40,
  QUESTION: 50,
  CHAT: 60,
  SUMMARY: 70,
  SUGGEST_GUARDIAN_QUESTIONS: 80,
  GENERATE_REPORT: 90,
  GENERATE_MEDICAL_CERTIFICATE: 100,
  GENERATE_PRESCRIPTION: 110,
  CLOSE_CASE: 120,
}

const CONFIRMATION_REQUIRED: Partial<Record<PipelineStepKind, true>> = {
  REVIEW_PATIENT_PROFILE_UPDATE: true,
  REVIEW_ANTHROPOMETRIC_REFERENCE: true,
  REVIEW_GUARDIAN_ALERT: true,
  GENERATE_REPORT: true,
  GENERATE_MEDICAL_CERTIFICATE: true,
  GENERATE_PRESCRIPTION: true,
  CLOSE_CASE: true,
}

export function orderPipelineSteps(steps: PipelineStep[]): PipelineStep[] {
  const seen = new Set<string>()
  return [...steps]
    .filter((step) => {
      const key = `${step.kind}:${step.commandMessage}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => ORDER_PRIORITY[a.kind] - ORDER_PRIORITY[b.kind])
}

export function requiresConfirmationForStep(kind: PipelineStepKind): boolean {
  return CONFIRMATION_REQUIRED[kind] === true
}
