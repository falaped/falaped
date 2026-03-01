import type { SupabaseClient } from "@supabase/supabase-js"
import { PROFILE_LOGOS_BUCKET } from "@/lib/constants"

/** Create bucket "profile-logos" in Supabase Dashboard and set it to public so getPublicUrl works. */

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"]
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB

export type UploadProfileLogoKind = "full" | "short"

/**
 * Uploads a profile logo to storage and returns the public URL.
 * Rejects if file type or size is invalid. Overwrites existing file at same path.
 */
export async function uploadProfileLogo(
  supabase: SupabaseClient,
  profileId: string,
  file: File | Blob,
  kind: UploadProfileLogoKind
): Promise<string> {
  const blob = file instanceof File ? file : new File([file], "logo")
  if (!ALLOWED_TYPES.includes(blob.type)) {
    throw new Error(
      "[PROFILES] Tipo de arquivo não permitido. Use PNG, JPEG ou WebP."
    )
  }
  if (blob.size > MAX_SIZE_BYTES) {
    throw new Error("[PROFILES] Arquivo muito grande. Máximo 2 MB.")
  }

  const ext = blob.name?.match(/\.(png|jpe?g|webp)$/i)?.[1] ?? "png"
  const path = `${profileId}/logo-${kind}.${ext}`

  const { error } = await supabase.storage
    .from(PROFILE_LOGOS_BUCKET)
    .upload(path, blob, { upsert: true, contentType: blob.type })

  if (error)
    throw new Error(`[PROFILES] Falha no upload da logo: ${error.message}`)

  const {
    data: { publicUrl },
  } = supabase.storage.from(PROFILE_LOGOS_BUCKET).getPublicUrl(path)
  return publicUrl
}
