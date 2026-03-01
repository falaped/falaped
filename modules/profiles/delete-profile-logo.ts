import type { SupabaseClient } from "@supabase/supabase-js"
import { PROFILE_LOGOS_BUCKET } from "@/lib/constants"
import type { UploadProfileLogoKind } from "./upload-profile-logo"

/**
 * Deletes the profile logo file from storage (bucket profile-logos).
 * Path pattern: {profileId}/logo-{kind}.{ext}. Lists the profile folder, removes
 * any object whose name starts with "logo-{kind}.".
 * Does not throw if no file exists (idempotent).
 */
export async function deleteProfileLogo(
  supabase: SupabaseClient,
  profileId: string,
  kind: UploadProfileLogoKind
): Promise<void> {
  const prefix = `${profileId}`
  const { data: files, error: listError } = await supabase.storage
    .from(PROFILE_LOGOS_BUCKET)
    .list(prefix)

  if (listError) {
    throw new Error(
      `[PROFILES] Falha ao listar logos no storage: ${listError.message}`
    )
  }

  const prefixName = `logo-${kind}.`
  const toRemove =
    files
      ?.filter((f) => f.name?.startsWith(prefixName))
      .map((f) => `${prefix}/${f.name}`) ?? []

  if (toRemove.length === 0) return

  const { error: removeError } = await supabase.storage
    .from(PROFILE_LOGOS_BUCKET)
    .remove(toRemove)

  if (removeError)
    throw new Error(
      `[PROFILES] Falha ao remover logo do storage: ${removeError.message}`
    )
}
