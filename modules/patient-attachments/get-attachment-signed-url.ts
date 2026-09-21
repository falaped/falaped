import type { SupabaseClient } from "@supabase/supabase-js"

import { PATIENT_ATTACHMENTS_BUCKET } from "@/lib/constants"

const SIGNED_URL_EXPIRY_SECONDS = 60

/**
 * Signed URL de curta duração (60s) para baixar um anexo.
 *
 * `download` SEMPRE preenchido: qualquer tipo de arquivo é aceito no upload, e
 * forçar Content-Disposition: attachment impede que um HTML ou SVG enviado como
 * "exame" seja renderizado pelo navegador. Baixa, não executa.
 */
export async function getAttachmentSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  fileName: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(PATIENT_ATTACHMENTS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS, {
      download: fileName,
    })

  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
