export type MedicalReportPayload = {
  patientName?: string
  birthDate?: string
  title: string
  bodyHtml: string
}

export type MedicalReportListItem = {
  id: string
  profile_id: string
  patient_id: string | null
  payload: Record<string, unknown>
  location_state: string | null
  issued_at: string
  pdf_storage_path: string | null
  created_at: string
  patient_name: string | null
}

export type DoctorInfo = {
  firstName: string
  surname: string
  crm: string | null
  rqe?: string | null
}
