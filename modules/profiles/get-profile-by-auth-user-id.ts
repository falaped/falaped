import type { SupabaseClient } from "@supabase/supabase-js"

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

/**
 * Fetches the profile linked to the given auth user id.
 * Used to resolve session: auth.user.id → profile → authenticated_users.
 */
export async function getProfileByAuthUserId(
  supabase: SupabaseClient,
  authUserId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, auth_user_id, phone, first_name, surname, email, crm, rqe")
    .eq("auth_user_id", authUserId)
    .maybeSingle()

  if (error) throw new Error(`[PROFILES] Failed to get profile: ${error.message}`)
  return data
}
