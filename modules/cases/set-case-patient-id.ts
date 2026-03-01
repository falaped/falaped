import type { SupabaseClient } from "@supabase/supabase-js"
import { getPatientById } from "@/modules/patients/get-patient-by-id"

/**
 * Sets or replaces the patient linked to a case.
 * Case and patient must belong to the same profile (ownership by profile_id).
 */
export async function setCasePatientId(
  supabase: SupabaseClient,
  caseId: string,
  profileId: string,
  patientId: string,
): Promise<void> {
  const patient = await getPatientById(supabase, patientId, profileId)
  if (!patient) throw new Error("[CASES] Patient not found or does not belong to profile.")

  const { error: updateError } = await supabase
    .from("cases")
    .update({ patient_id: patientId })
    .eq("id", caseId)
    .eq("profile_id", profileId)
    .select("id")
    .single()

  if (updateError) throw new Error(`[CASES] Failed to set patient on case: ${updateError.message}`)
}
