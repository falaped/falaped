import type { SupabaseClient } from "@supabase/supabase-js"

export type CaseForPatient = {
  id: string
  status: "active" | "closed"
  started_at: string
  ended_at: string | null
}

/**
 * Fetches cases linked to a patient, for the given profile (profile_id).
 * Used on the patient detail page to show "Casos associados".
 */
export async function getCasesByPatientId(
  supabase: SupabaseClient,
  profileId: string,
  patientId: string,
): Promise<CaseForPatient[]> {
  const { data: auRow, error: auError } = await supabase
    .from("authenticated_users")
    .select("phone")
    .eq("profile_id", profileId)
    .maybeSingle()

  if (auError)
    throw new Error(`[CASES] Failed to resolve phone: ${auError.message}`)
  const phone = auRow?.phone ?? null
  if (!phone) return []

  const { data, error } = await supabase
    .from("cases")
    .select("id, status, started_at, ended_at")
    .eq("user_phone", phone)
    .eq("patient_id", patientId)
    .order("started_at", { ascending: false })

  if (error)
    throw new Error(
      `[CASES] Failed to fetch cases by patient: ${error.message}`
    )

  return (data ?? []) as CaseForPatient[]
}
