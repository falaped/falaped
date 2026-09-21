/**
 * Anexo de um paciente (tabela patient_attachments). O arquivo em si vive no
 * bucket privado; aqui fica só o PATH — a URL nunca é persistida, assina-se no
 * momento do acesso.
 */
export type PatientAttachment = {
  id: string
  profile_id: string
  patient_id: string
  case_id: string | null
  storage_path: string
  file_name: string
  mime_type: string | null
  size_bytes: number
  created_at: string
}

export type CreateAttachmentPayload = {
  patient_id: string
  case_id: string | null
  storage_path: string
  file_name: string
  mime_type: string | null
  size_bytes: number
}
