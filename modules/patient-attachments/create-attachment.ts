import type { SupabaseClient } from "@supabase/supabase-js"

import type { CreateAttachmentPayload, PatientAttachment } from "./types"

export const ATTACHMENT_SELECT =
  "id, profile_id, patient_id, case_id, storage_path, file_name, title, mime_type, size_bytes, group_id, group_role, created_at"

/** Grava a linha do anexo já enviado ao storage. */
export async function createAttachment(
  supabase: SupabaseClient,
  profileId: string,
  id: string,
  payload: CreateAttachmentPayload,
): Promise<PatientAttachment> {
  const { data, error } = await supabase
    .from("patient_attachments")
    .insert({
      id,
      profile_id: profileId,
      patient_id: payload.patient_id,
      case_id: payload.case_id,
      storage_path: payload.storage_path,
      file_name: payload.file_name,
      title: payload.title,
      mime_type: payload.mime_type,
      size_bytes: payload.size_bytes,
      group_id: payload.group_id ?? null,
      group_role: payload.group_role ?? null,
    })
    .select(ATTACHMENT_SELECT)
    .single()

  if (error)
    throw new Error(`[ATTACHMENTS] Falha ao registrar o anexo: ${error.message}`)

  return data as PatientAttachment
}
