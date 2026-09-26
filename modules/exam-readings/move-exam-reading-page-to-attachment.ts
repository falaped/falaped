import type { SupabaseClient } from "@supabase/supabase-js"

import { PATIENT_ATTACHMENTS_BUCKET } from "@/lib/constants"

/**
 * Move UMA página da leitura para o path de anexo `{profileId}/{patientId}/{attachmentId}.jpg`
 * (mesmo bucket, mesma RLS por prefixo): sem download nem re-upload. Devolve o path novo.
 */
export async function moveExamReadingPageToAttachment(
  supabase: SupabaseClient,
  profileId: string,
  patientId: string,
  attachmentId: string,
  pagePath: string,
): Promise<string> {
  const to = `${profileId}/${patientId}/${attachmentId}.jpg`
  const { error } = await supabase.storage
    .from(PATIENT_ATTACHMENTS_BUCKET)
    .move(pagePath, to)
  if (error)
    throw new Error(`[EXAM_READINGS] move page failed: ${error.message}`)
  return to
}
