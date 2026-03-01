import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Deletes a patient by id, only if it belongs to the given profile_id.
 * First sets patient_id to null on any cases linked to this patient, then deletes the patient.
 */
export async function deletePatient(
  supabase: SupabaseClient,
  id: string,
  profileId: string
): Promise<void> {
  const { error: updateError } = await supabase
    .from("cases")
    .update({ patient_id: null })
    .eq("patient_id", id)

  if (updateError)
    throw new Error(
      `[PATIENTS] Failed to unlink cases from patient: ${updateError.message}`
    )

  const { error: deleteError } = await supabase
    .from("patients")
    .delete()
    .eq("id", id)
    .eq("profile_id", profileId)

  if (deleteError)
    throw new Error(
      `[PATIENTS] Failed to delete patient: ${deleteError.message}`
    )
}
