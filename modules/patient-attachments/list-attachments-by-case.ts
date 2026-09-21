import type { SupabaseClient } from "@supabase/supabase-js"

import { ATTACHMENT_SELECT } from "./create-attachment"
import type { PatientAttachment } from "./types"

/** Anexos enviados dentro de um atendimento, do mais recente para o mais antigo. */
export async function listAttachmentsByCase(
  supabase: SupabaseClient,
  profileId: string,
  caseId: string,
): Promise<PatientAttachment[]> {
  const { data, error } = await supabase
    .from("patient_attachments")
    .select(ATTACHMENT_SELECT)
    .eq("profile_id", profileId)
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })

  if (error)
    throw new Error(
      `[ATTACHMENTS] Falha ao listar anexos do atendimento: ${error.message}`,
    )

  return (data ?? []) as PatientAttachment[]
}
