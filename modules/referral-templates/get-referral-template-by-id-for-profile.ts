import type { SupabaseClient } from "@supabase/supabase-js"
import type { ReferralTemplate } from "./types"

/**
 * Returns a referral template by id only if it belongs to the given profile.
 * Ownership gate: query scoped by both id and profile_id (D-15).
 */
export async function getReferralTemplateByIdForProfile(
  supabase: SupabaseClient,
  id: string,
  profileId: string,
): Promise<ReferralTemplate | null> {
  const { data, error } = await supabase
    .from("referral_templates")
    .select("id, profile_id, name, snapshot, created_at, updated_at")
    .eq("id", id)
    .eq("profile_id", profileId)
    .maybeSingle()

  if (error) {
    throw new Error(`[REFERRAL_TEMPLATES] fetch by id failed: ${error.message}`)
  }

  return (data as ReferralTemplate | null) ?? null
}
