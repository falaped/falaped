export type CaseStatus = "active" | "closed"

export type CasePatient = {
  id: string
  name: string
  responsible: string | null
  contact_phone: string | null
}

export type CaseWithPatient = {
  id: string
  user_phone: string
  status: "active" | "closed"
  started_at: string
  ended_at: string | null
  patient_id: string | null
  awaiting_intent: boolean
  awaiting_patient_choice: boolean
  patient: CasePatient | null
}
