import type { AssistantIntent } from "@/modules/falaped-assistant/contracts/assistant-types"

export type PipelineStepKind = AssistantIntent

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

const VALID_STEP_KINDS: ReadonlySet<string> = new Set<PipelineStepKind>([
  "REVIEW_PATIENT_PROFILE_UPDATE",
  "REVIEW_ANTHROPOMETRIC_REFERENCE",
  "REVIEW_GUARDIAN_ALERT",
  "CALCULATE_BMI",
  "SUMMARY",
  "SUGGEST_GUARDIAN_QUESTIONS",
  "GENERATE_REPORT",
  "GENERATE_MEDICAL_CERTIFICATE",
  "GENERATE_PRESCRIPTION",
  "CLOSE_CASE",
  "QUESTION",
  "CHAT",
])

export function isPipelineStepKind(kind: string): kind is PipelineStepKind {
  return VALID_STEP_KINDS.has(kind)
}
