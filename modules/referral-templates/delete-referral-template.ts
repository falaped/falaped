import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Deletes a referral template by id, scoped to the owning profile (defense-in-depth, D-15).
 * NEVER id-only — the ownership filter prevents cross-tenant deletion.
 */
export async function deleteReferralTemplate(
  supabase: SupabaseClient,
  id: string,
  profileId: string,
): Promise<void> {
  const { error } = await supabase
    .from("referral_templates")
    .delete()
    .eq("id", id)
    .eq("profile_id", profileId) // ownership hardening — NEVER id-only

  if (error) {
    throw new Error(`[REFERRAL_TEMPLATES] delete failed: ${error.message}`)
  }
}
