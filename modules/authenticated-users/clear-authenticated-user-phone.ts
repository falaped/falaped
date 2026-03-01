import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Unlinks WhatsApp for the given profile: deletes rows in phone_link_codes for
 * this profile_id, then sets linked_phone_status = false and whatsapp_linked_at = null
 * in authenticated_users. The phone field is not cleared.
 */
export async function clearAuthenticatedUserPhone(
  supabase: SupabaseClient,
  profileId: string
): Promise<void> {
  const { error: deleteCodesError } = await supabase
    .from("phone_link_codes")
    .delete()
    .eq("profile_id", profileId)

  if (deleteCodesError)
    throw new Error(
      `[PHONE_LINK_CODES] Failed to delete codes: ${deleteCodesError.message}`
    )

  const { error: updateError } = await supabase
    .from("authenticated_users")
    .update({
      linked_phone_status: false,
      whatsapp_linked_at: null,
    })
    .eq("profile_id", profileId)

  if (updateError)
    throw new Error(
      `[AUTHENTICATED_USERS] Failed to clear phone: ${updateError.message}`
    )
}
