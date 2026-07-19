import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Removes the TAKEN mark for a specific reference item on a patient — a delete
 * scoped by ALL THREE of profile_id, patient_id and schedule_item_id. This
 * triple scope is the ownership backstop against IDOR (D-14): NEVER delete by
 * schedule_item_id alone — that would let a doctor clear another doctor's mark.
 *
 * Idempotent: deleting a mark that does not exist is a no-op (never an error).
 * Boolean grain — unchecking simply removes the row.
 *
 * @param supabase Injected per-request client.
 * @param profileId Owning doctor's profile id.
 * @param patientId Patient the dose belongs to.
 * @param scheduleItemId The specific reference item to unmark.
 */
export async function unmarkDoseTaken(
  supabase: SupabaseClient,
  profileId: string,
  patientId: string,
  scheduleItemId: string,
): Promise<void> {
  const { error } = await supabase
    .from("patient_vaccine_doses")
    .delete()
    .eq("profile_id", profileId)
    .eq("patient_id", patientId)
    .eq("schedule_item_id", scheduleItemId)

  if (error)
    throw new Error(
      `[VACCINE_DOSES] Failed to unmark dose taken: ${error.message}`,
    )
}
