import type { SupabaseClient } from "@supabase/supabase-js"
import type { CaseWithPatient } from "./types"
import { AuthenticatedUserProfile } from "../supabase/get-authenticated-user"

export type { CaseWithPatient } from "./types"

/**
 * Fetches cases for a pediatrician by profile_id.
 * Resolves phone from authenticated_users, then queries cases by user_phone.
 */
export async function getCasesByProfileId(
  supabase: SupabaseClient,
  profile: AuthenticatedUserProfile,
): Promise<CaseWithPatient[]> {


  const { data, error } = await supabase
    .from("cases")
    .select(`
      id,
      user_phone,
      status,
      origin,
      started_at,
      ended_at,
      patient_id,
      awaiting_intent,
      awaiting_patient_choice,
      pending_action,
      dashboard_chat_context_summary,
      patient:patients(
        id,
        name,
        responsible,
        contact_phone
      )
    `)
    .eq("profile_id", profile.id)
    .order("started_at", { ascending: false })

  if (error) throw new Error(`[CASES] Failed to fetch cases: ${error.message}`)

  return (data ?? []).map((row) => {
    const patient = Array.isArray(row.patient) ? row.patient[0] : row.patient
    return {
      ...row,
      patient: patient ?? null,
    } as CaseWithPatient
  })
}
