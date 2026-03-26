import type { CaseMessage } from "@/modules/cases/get-case-by-id"
import type { PatientProfileSnapshot } from "@/modules/falaped-assistant/contracts/assistant-types"

export type AssistantTurnContext = {
  userMessage: string
  messages: CaseMessage[]
  pendingAction: string | null
  patientContext: string | null
  conversationSummary: string | null
  patientMetrics?: { weight: number | null; height: number | null }
  patientProfile?: PatientProfileSnapshot
  turnQueue?: unknown | null
}
