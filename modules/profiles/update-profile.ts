import type { SupabaseClient } from "@supabase/supabase-js"

export type UpdateProfilePayload = {
  first_name?: string | null
  surname?: string | null
  email?: string | null
  crm?: string | null
  rqe?: string | null
  logo_url_full?: string | null
  logo_url_short?: string | null
  social_media_handle?: string | null
  website?: string | null
  report_template_id?: string | null
}

/**
 * Updates the given profile by id. Only updates fields present in payload.
 * Caller must ensure profileId belongs to the current user.
 */
export async function updateProfile(
  supabase: SupabaseClient,
  profileId: string,
  payload: UpdateProfilePayload
): Promise<void> {
  const updates: Record<string, unknown> = {
    ...payload,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", profileId)

  if (error)
    throw new Error(`[PROFILES] Failed to update profile: ${error.message}`)
}
