import type { SupabaseClient } from "@supabase/supabase-js"

import { PATIENT_ATTACHMENTS_BUCKET } from "@/lib/constants"

const SIGNED_URL_EXPIRY_SECONDS = 60

/**
 * Signed URL de curta duração (60s) para um anexo.
 *
 * `inline: false` (padrão) preenche `download`, o que força
 * Content-Disposition: attachment — o arquivo baixa em vez de renderizar.
 * `inline: true` abre no navegador e SÓ deve ser pedido para tipo da allowlist
 * de `lib/attachment-inline-view.ts`; quem decide isso é a action, não este
 * módulo.
 */
export async function getAttachmentSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  fileName: string,
  options: { inline?: boolean } = {},
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(PATIENT_ATTACHMENTS_BUCKET)
    .createSignedUrl(
      storagePath,
      SIGNED_URL_EXPIRY_SECONDS,
      options.inline ? undefined : { download: fileName },
    )

  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
