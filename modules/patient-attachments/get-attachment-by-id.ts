import type { SupabaseClient } from "@supabase/supabase-js"

import { ATTACHMENT_SELECT } from "./create-attachment"
import type { PatientAttachment } from "./types"

/**
 * Anexo por id, só se pertencer ao perfil. `null` para inexistente E para anexo
 * de outro médico — mesma resposta, sem enumeração por diferença de mensagem.
 */
export async function getAttachmentById(
  supabase: SupabaseClient,
  profileId: string,
  id: string,
): Promise<PatientAttachment | null> {
  const { data, error } = await supabase
    .from("patient_attachments")
    .select(ATTACHMENT_SELECT)
    .eq("id", id)
    .eq("profile_id", profileId)
    .maybeSingle()

  if (error)
    throw new Error(`[ATTACHMENTS] Falha ao buscar o anexo: ${error.message}`)

  return data as PatientAttachment | null
}
