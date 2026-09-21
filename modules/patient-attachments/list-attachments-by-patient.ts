import type { SupabaseClient } from "@supabase/supabase-js"

import { ATTACHMENT_SELECT } from "./create-attachment"
import type { PatientAttachment } from "./types"

/** Anexos de um paciente, do mais recente para o mais antigo. */
export async function listAttachmentsByPatient(
  supabase: SupabaseClient,
  profileId: string,
  patientId: string,
): Promise<PatientAttachment[]> {
  const { data, error } = await supabase
    .from("patient_attachments")
    .select(ATTACHMENT_SELECT)
    .eq("profile_id", profileId)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })

  if (error)
    throw new Error(
      `[ATTACHMENTS] Falha ao listar anexos do paciente: ${error.message}`,
    )

  return (data ?? []) as PatientAttachment[]
}
