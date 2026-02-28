import type { SupabaseClient } from "@supabase/supabase-js"
import { getProfileByAuthUserId } from "@/modules/profiles/get-profile-by-auth-user-id"
import { getAuthenticatedUserByProfileId } from "@/modules/authenticated-users/get-authenticated-user-by-profile-id"

/**
 * Resolves the pediatrician's user_phone from the authenticated session.
 * Flow: auth.user.id → profile (by auth_user_id) → authenticated_users (by profile_id) → phone if status 'paid'.
 */
export async function getAuthenticatedUserPhone(
  supabase: SupabaseClient
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const profile = await getProfileByAuthUserId(supabase, user.id)
  if (!profile) return null

  const authenticatedUser = await getAuthenticatedUserByProfileId(
    supabase,
    profile.id
  )
  if (!authenticatedUser || authenticatedUser.status !== "paid") return null

  return authenticatedUser.phone
}
