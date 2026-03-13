import type { SupabaseClient } from "@supabase/supabase-js"

export type ProfileByIdResult = {
  auth_user_id: string
  report_template_id: string | null
}

/**
 * Returns minimal profile fields by id. Used when we need auth_user_id and report_template_id
 * (e.g. before deleting a report template to clear profile.report_template_id if needed).
 */
export async function getProfileById(
  supabase: SupabaseClient,
  profileId: string
): Promise<ProfileByIdResult | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("auth_user_id, report_template_id")
    .eq("id", profileId)
    .maybeSingle()

  if (error)
    throw new Error(`[PROFILES] Failed to get profile: ${error.message}`)

  if (!data) return null
  return data as ProfileByIdResult
}
