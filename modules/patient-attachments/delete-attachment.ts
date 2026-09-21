import type { SupabaseClient } from "@supabase/supabase-js"

import { PATIENT_ATTACHMENTS_BUCKET } from "@/lib/constants"

/**
 * Apaga o objeto no storage E a linha do anexo.
 *
 * Nessa ordem de propósito: se o storage falhar, a linha fica e o médico tenta
 * de novo. O inverso deixaria arquivo órfão no bucket, invisível e cobrado para
 * sempre. O filtro por profile_id na linha é o backstop de posse.
 */
export async function deleteAttachment(
  supabase: SupabaseClient,
  profileId: string,
  id: string,
  storagePath: string,
): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(PATIENT_ATTACHMENTS_BUCKET)
    .remove([storagePath])

  if (storageError)
    throw new Error(
      `[ATTACHMENTS] Falha ao apagar o arquivo: ${storageError.message}`,
    )

  const { error } = await supabase
    .from("patient_attachments")
    .delete()
    .eq("id", id)
    .eq("profile_id", profileId)

  if (error)
    throw new Error(`[ATTACHMENTS] Falha ao apagar o anexo: ${error.message}`)
}
