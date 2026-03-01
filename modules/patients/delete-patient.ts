import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Deletes a patient by id, only if it belongs to the given user_phone.
 * First sets patient_id to null on any cases linked to this patient, then deletes the patient.
 */
export async function deletePatient(
  supabase: SupabaseClient,
  id: string,
  userPhone: string
): Promise<void> {
  const { error: updateError } = await supabase
    .from("cases")
    .update({ patient_id: null })
    .eq("patient_id", id)
    .eq("user_phone", userPhone)

  if (updateError)
    throw new Error(
      `[PATIENTS] Failed to unlink cases from patient: ${updateError.message}`
    )

  const { error: deleteError } = await supabase
    .from("patients")
    .delete()
    .eq("id", id)
    .eq("user_phone", userPhone)

  if (deleteError)
    throw new Error(
      `[PATIENTS] Failed to delete patient: ${deleteError.message}`
    )
}
