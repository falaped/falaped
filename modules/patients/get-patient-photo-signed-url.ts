import type { SupabaseClient } from "@supabase/supabase-js"
import { PATIENT_PHOTOS_BUCKET } from "@/lib/constants"

const SIGNED_URL_EXPIRY_SECONDS = 60

/**
 * Resolve uma signed URL de curta duração (TTL 60s) para uma foto de paciente
 * no bucket privado. Retorna `null` quando não há path ou a assinatura falha —
 * o `AvatarFallback` (iniciais) cobre o caso graciosamente (Pitfall 1). A URL
 * NUNCA é persistida (D-02 / T-02-07): assina-se no render, server-side.
 *
 * Helper SINGULAR — usado pelo hero e pelo cabeçalho do caso.
 */
export async function getPatientPhotoSignedUrl(
  supabase: SupabaseClient,
  photoPath: string | null,
): Promise<string | null> {
  if (!photoPath) return null
  const { data, error } = await supabase.storage
    .from(PATIENT_PHOTOS_BUCKET)
    .createSignedUrl(photoPath, SIGNED_URL_EXPIRY_SECONDS)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
