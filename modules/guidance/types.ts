/** Item da biblioteca de orientações por marco de puericultura (guidance_templates). */
export type GuidanceTemplate = {
  id: string
  milestone: string
  body: string
  sort_order: number
}

/** Payload do documento de orientação gerado (guidance_documents.payload). */
export type GuidanceDocumentPayload = {
  patientName?: string
  birthDate?: string
  /** Rótulo do marco escolhido (ex.: "6 meses"). */
  milestone: string
  /** Texto editável da orientação. */
  body: string
}

/** Linha da lista de documentos de orientação gerados. */
export type GuidanceDocumentListItem = {
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

/** Opção de marco para o seletor do wizard. */
export type GuidanceMilestoneOption = {
  id: string
  milestone: string
  body: string
}

export type DoctorInfo = {
  firstName: string
  surname: string
  crm: string | null
  rqe?: string | null
}
