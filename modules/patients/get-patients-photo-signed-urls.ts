import type { SupabaseClient } from "@supabase/supabase-js"
import { PATIENT_PHOTOS_BUCKET } from "@/lib/constants"

/**
 * Resolve signed URLs em LOTE para várias fotos de paciente em uma única
 * chamada `createSignedUrls` (sem N+1 na lista — RESEARCH Pattern 3). Retorna
 * um `Map<path, signedUrl>` para o chamador remapear por paciente. A URL nunca
 * é persistida (D-02 / T-02-07): assina-se no render, server-side.
 *
 * Helper de LOTE — usado APENAS pelo caminho da lista.
 */
export async function getPatientsPhotoSignedUrls(
  supabase: SupabaseClient,
  photoPaths: string[],
  expirySeconds = 60,
): Promise<Map<string, string>> {
  if (photoPaths.length === 0) return new Map()
  const { data, error } = await supabase.storage
    .from(PATIENT_PHOTOS_BUCKET)
    .createSignedUrls(photoPaths, expirySeconds)
  if (error || !data) return new Map()
  return new Map(
    data
      .filter((s) => s.signedUrl)
      .map((s) => [s.path as string, s.signedUrl as string]),
  )
}
