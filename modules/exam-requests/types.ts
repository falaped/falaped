export type ExamRequestPayload = {
  patientName?: string
  birthDate?: string
  /** Strings resolvidas dos exames escolhidos — nunca ids de catálogo (Pitfall 5). */
  exams: string[]
  hypothesis?: string
  observations?: string
}

export type ExamRequestListItem = {
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
