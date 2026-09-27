import type { SupabaseClient } from "@supabase/supabase-js"

import { PATIENT_ATTACHMENTS_BUCKET } from "@/lib/constants"

// 1 hora, e não os 60 s dos anexos: as páginas ficam renderizadas na tela
// enquanto o médico confere valor por valor, e isso leva tempo.
const PAGE_URL_EXPIRY_SECONDS = 60 * 60

/** Signed URLs inline das páginas, na ordem de `pagePaths`. Falha vira lista vazia. */
export async function getExamReadingPageUrls(
  supabase: SupabaseClient,
  pagePaths: string[],
): Promise<string[]> {
  if (pagePaths.length === 0) return []
  const { data, error } = await supabase.storage
    .from(PATIENT_ATTACHMENTS_BUCKET)
    .createSignedUrls(pagePaths, PAGE_URL_EXPIRY_SECONDS)
  if (error || !data) return []
  return data.map((d) => d.signedUrl ?? "")
}
