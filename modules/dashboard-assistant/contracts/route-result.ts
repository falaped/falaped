import type {
  AssistantAction,
  DashboardAssistantIntent,
  PatientProfileUpdatePayload,
  StoredDataItem,
} from "@/modules/dashboard-assistant/contracts/assistant-types"

export type RouteResult = {
  intent: DashboardAssistantIntent
  reply: string
  action: AssistantAction
  showStructuredCard: boolean
  showAlert: boolean
  storedData: StoredDataItem[]
  blockedAssistantMessageId?: string | null
  patientProfileUpdatePayload?: PatientProfileUpdatePayload
  showPatientProfileUpdateActions?: boolean
}
