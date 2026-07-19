import type { SupabaseClient } from "@supabase/supabase-js"

export type InsertReferralParams = {
  profileId: string
  patientId: string | null
  caseId: string | null
  payload: Record<string, unknown>
  locationState: string
  issuedAt: string
}

/**
 * Inserts a referral row and returns the id.
 */
export async function insertReferral(
  supabase: SupabaseClient,
  params: InsertReferralParams,
): Promise<string> {
  const { data, error } = await supabase
    .from("referrals")
    .insert({
      profile_id: params.profileId,
      patient_id: params.patientId,
      case_id: params.caseId,
      payload: params.payload,
      location_state: params.locationState,
      issued_at: params.issuedAt,
      pdf_storage_path: null,
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(`[REFERRALS] insert failed: ${error.message}`)
  }

  if (!data?.id) {
    throw new Error("[REFERRALS] insert returned no id")
  }

  return data.id as string
}
