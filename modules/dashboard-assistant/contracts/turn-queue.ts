import type { DashboardAssistantIntent } from "@/modules/dashboard-assistant/contracts/assistant-types"

export type PipelineStepKind =
  | "REVIEW_PATIENT_PROFILE_UPDATE"
  | "REVIEW_ANTHROPOMETRIC_REFERENCE"
  | "REVIEW_GUARDIAN_ALERT"
  | "CALCULATE_BMI"
  | "SUMMARY"
  | "SUGGEST_GUARDIAN_QUESTIONS"
  | "GENERATE_REPORT"
  | "GENERATE_MEDICAL_CERTIFICATE"
  | "GENERATE_PRESCRIPTION"
  | "CLOSE_CASE"
  | "QUESTION"
  | "CHAT"

export type AssistantQueueSource = "llm" | "heuristic" | "mixed"

export type PipelineStep = {
  id: string
  kind: PipelineStepKind
  originalInput: string
  commandMessage: string
  requiresConfirmation: boolean
  meta?: Record<string, string | number | boolean | null>
}

export type AssistantTurnQueue = {
  version: 1
  source: AssistantQueueSource
  cursor: number
  createdAt: string
  updatedAt: string
  sourceMessageId?: string | null
  blockedAssistantMessageId?: string | null
  steps: PipelineStep[]
}

export function isPipelineStepKind(kind: string): kind is PipelineStepKind {
  return (
    kind === "REVIEW_PATIENT_PROFILE_UPDATE" ||
    kind === "REVIEW_ANTHROPOMETRIC_REFERENCE" ||
    kind === "REVIEW_GUARDIAN_ALERT" ||
    kind === "CALCULATE_BMI" ||
    kind === "SUMMARY" ||
    kind === "SUGGEST_GUARDIAN_QUESTIONS" ||
    kind === "GENERATE_REPORT" ||
    kind === "GENERATE_MEDICAL_CERTIFICATE" ||
    kind === "GENERATE_PRESCRIPTION" ||
    kind === "CLOSE_CASE" ||
    kind === "QUESTION" ||
    kind === "CHAT"
  )
}

export function stepKindToIntent(kind: PipelineStepKind): DashboardAssistantIntent {
  return kind
}
