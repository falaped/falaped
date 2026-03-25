import type {
  AssistantAction,
  DashboardAssistantIntent,
  PatientProfileUpdatePayload,
  StoredDataItem,
} from "@/modules/dashboard-assistant/contracts/assistant-types"

export type ClinicalAlertItem = {
  id: string
  title: string
  detail: string
}

export type RouteResult = {
  intent: DashboardAssistantIntent
  reply: string
  action: AssistantAction
  showStructuredCard: boolean
  showAlert: boolean
  /** When `showAlert` is true, explains what was detected in the user message (PT-BR, user-facing). */
  clinicalAlertItems?: ClinicalAlertItem[]
  storedData: StoredDataItem[]
  blockedAssistantMessageId?: string | null
  patientProfileUpdatePayload?: PatientProfileUpdatePayload
  showPatientProfileUpdateActions?: boolean
}
