import type { PipelineStepKind } from "@/modules/dashboard-assistant/contracts/turn-queue"

export type TurnActionKind = PipelineStepKind

export type TurnActionSource = "llm" | "rule" | "fallback"

export type TurnAction = {
  kind: TurnActionKind
  source: TurnActionSource
  originalInput: string
  commandMessage: string
  requiresConfirmation: boolean
}

export type TurnActionPlan = {
  actions: TurnAction[]
  source: TurnActionSource
}

const ACTION_ORDER: Record<TurnActionKind, number> = {
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

const REQUIRES_CONFIRMATION: Partial<Record<TurnActionKind, true>> = {
  REVIEW_PATIENT_PROFILE_UPDATE: true,
  REVIEW_ANTHROPOMETRIC_REFERENCE: true,
  REVIEW_GUARDIAN_ALERT: true,
  GENERATE_REPORT: true,
  GENERATE_MEDICAL_CERTIFICATE: true,
  GENERATE_PRESCRIPTION: true,
  CLOSE_CASE: true,
}

export function actionRequiresConfirmation(kind: TurnActionKind): boolean {
  return REQUIRES_CONFIRMATION[kind] === true
}

export function orderActions(actions: TurnAction[]): TurnAction[] {
  const seen = new Set<TurnActionKind>()
  return [...actions]
    .filter((action) => {
      if (seen.has(action.kind)) return false
      seen.add(action.kind)
      return true
    })
    .sort((a, b) => ACTION_ORDER[a.kind] - ACTION_ORDER[b.kind])
}
