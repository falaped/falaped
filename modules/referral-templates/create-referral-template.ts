import type { SupabaseClient } from "@supabase/supabase-js"
import type { ReferralTemplateSnapshot } from "./types"

export type CreateReferralTemplateParams = {
  profileId: string
  name: string
  snapshot: ReferralTemplateSnapshot
}

/**
 * Creates a referral template and returns its id.
 */
export async function createReferralTemplate(
  supabase: SupabaseClient,
  params: CreateReferralTemplateParams,
): Promise<string> {
  const { data, error } = await supabase
    .from("referral_templates")
    .insert({
      profile_id: params.profileId,
      name: params.name.trim(),
      snapshot: params.snapshot as unknown as Record<string, unknown>,
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(`[REFERRAL_TEMPLATES] create failed: ${error.message}`)
  }

  if (!data?.id) {
    throw new Error("[REFERRAL_TEMPLATES] create returned no id")
  }

  return data.id as string
}
