import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Clears the phone for the authenticated_users row linked to the given profile.
 * Used to "unlink" WhatsApp: after this, the user must link again via the code flow.
 */
export async function clearAuthenticatedUserPhone(
  supabase: SupabaseClient,
  profileId: string
): Promise<void> {
  const { error } = await supabase
    .from("authenticated_users")
    .update({ phone: null, whatsapp_linked_at: null })
    .eq("profile_id", profileId)

  if (error)
    throw new Error(
      `[AUTHENTICATED_USERS] Failed to clear phone: ${error.message}`
    )
}
