import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Returns auth_user_id for the given profile id. Used when listing resources
 * that are keyed by user (e.g. report_templates.user_id).
 */
export async function getProfileAuthUserId(
  supabase: SupabaseClient,
  profileId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("auth_user_id")
    .eq("id", profileId)
    .maybeSingle()

  if (error)
    throw new Error(`[PROFILES] Failed to get auth_user_id: ${error.message}`)

  return data?.auth_user_id ?? null
}
