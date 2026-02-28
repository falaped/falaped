import type { SupabaseClient } from "@supabase/supabase-js"
import type { AuthenticatedUserRow } from "@/modules/authenticated-users/get-authenticated-user-by-profile-id"

export type Profile = {
  id: string
  auth_user_id: string
  phone: string
  first_name: string | null
  surname: string | null
  email: string | null
  crm: string | null
  rqe: string | null
}

export type ProfileWithAuthenticatedUser = Profile & {
  authenticated_users: AuthenticatedUserRow[]
}

/**
 * Fetches the profile linked to the given auth user id, with the related authenticated_users row embedded.
 * Single query: profiles ← authenticated_users (FK profile_id).
 */
export async function getProfileByAuthUserId(
  supabase: SupabaseClient,
  authUserId: string
): Promise<ProfileWithAuthenticatedUser | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, auth_user_id, phone, first_name, surname, email, crm, rqe, authenticated_users(id, phone, status, profile_id, whatsapp_linked_at)"
    )
    .eq("auth_user_id", authUserId)
    .maybeSingle()

  if (error) throw new Error(`[PROFILES] Failed to get profile: ${error.message}`)
  return data
}
