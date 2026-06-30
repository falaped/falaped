import type { SupabaseClient } from "@supabase/supabase-js"
import { deletePatientPhoto } from "./delete-patient-photo"

/**
 * Deletes a patient by id, only if it belongs to the given profile_id.
 * First sets patient_id to null on any cases linked to this patient, then removes
 * the patient's photo object from the private bucket (idempotent — no orphaned
 * sensitive data after deletion, LGPD / Pitfall 2), then deletes the patient row.
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

  // Read the photo path (owner-scoped) and remove the storage object BEFORE the
  // row delete so the sensitive object cannot orphan once the row is gone.
  const { data: patient, error: selectError } = await supabase
    .from("patients")
    .select("photo_path")
    .eq("id", id)
    .eq("profile_id", profileId)
    .maybeSingle()

  if (selectError)
    throw new Error(
      `[PATIENTS] Failed to read patient photo path: ${selectError.message}`
    )

  await deletePatientPhoto(supabase, patient?.photo_path ?? null)

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
