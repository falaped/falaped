import type { SupabaseClient } from "@supabase/supabase-js"

export type AuthenticatedUserRow = {
  id: string
  phone: string | null
  status: string
  profile_id: string
  whatsapp_linked_at: string | null
}

/**
 * Fetches the authenticated_users row for the given profile id.
 * Used to get user_phone and status after resolving profile from auth.
 */
export async function getAuthenticatedUserByProfileId(
  supabase: SupabaseClient,
  profileId: string
): Promise<AuthenticatedUserRow | null> {
  const { data, error } = await supabase
    .from("authenticated_users")
    .select("id, phone, status, profile_id, whatsapp_linked_at")
    .eq("profile_id", profileId)
    .maybeSingle()

  if (error)
    throw new Error(
      `[AUTHENTICATED_USERS] Failed to get by profile_id: ${error.message}`
    )
  return data
}
