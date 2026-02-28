import type { SupabaseClient } from "@supabase/supabase-js"

export type AuthenticatedUserStatus = "paid" | "unpaid" | "blocked"

/**
 * Updates the status of the authenticated_users row for the given profile id.
 * Caller must ensure the profile belongs to the current user (e.g. in Server Action).
 */
export async function updateAuthenticatedUserStatus(
  supabase: SupabaseClient,
  profileId: string,
  status: AuthenticatedUserStatus
): Promise<void> {
  const { error } = await supabase
    .from("authenticated_users")
    .update({ status })
    .eq("profile_id", profileId)

  if (error)
    throw new Error(
      `[AUTHENTICATED_USERS] Failed to update status: ${error.message}`
    )
}
