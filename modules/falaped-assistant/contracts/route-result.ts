import type {
  AssistantAction,
  AssistantIntent,
  PatientProfileUpdatePayload,
  StoredDataItem,
} from "@/modules/falaped-assistant/contracts/assistant-types"

export type ClinicalAlertItem = {
  id: string
  title: string
  detail: string
}

export type RouteResult = {
  intent: AssistantIntent
  reply: string
  action: AssistantAction
  showStructuredCard: boolean
  showAlert: boolean
  clinicalAlertItems?: ClinicalAlertItem[]
  storedData: StoredDataItem[]
  blockedAssistantMessageId?: string | null
  patientProfileUpdatePayload?: PatientProfileUpdatePayload
  showPatientProfileUpdateActions?: boolean
}
