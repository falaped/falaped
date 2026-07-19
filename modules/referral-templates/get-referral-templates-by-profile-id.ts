import type { SupabaseClient } from "@supabase/supabase-js"
import type { ReferralTemplateOption } from "./types"

export type { ReferralTemplateOption }

/**
 * Returns referral templates for the given profile, ordered by name.
 */
export async function getReferralTemplatesByProfileId(
  supabase: SupabaseClient,
  profileId: string,
): Promise<ReferralTemplateOption[]> {
  const { data, error } = await supabase
    .from("referral_templates")
    .select("id, name, created_at, snapshot")
    .eq("profile_id", profileId)
    .order("name", { ascending: true })

  if (error) {
    throw new Error(
      `[REFERRAL_TEMPLATES] Failed to list templates: ${error.message}`,
    )
  }

  return (data ?? []) as ReferralTemplateOption[]
}
