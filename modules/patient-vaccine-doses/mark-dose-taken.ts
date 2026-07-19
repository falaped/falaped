import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Marks a specific reference item as TAKEN for a patient — an IDEMPOTENT insert
 * of (profile_id, patient_id, schedule_item_id). On conflict with the unique
 * mark constraint it does nothing, so re-marking an already-taken dose is a
 * no-op (never an error). `taken_at`/`created_at` default to now() in the DB.
 *
 * Scoped by profile_id + patient_id: the row is stamped with the owner's
 * profile_id, and RLS + this explicit stamping keep the mark isolated to the
 * doctor (D-14). Boolean grain — no date/lote/local (Phase 6).
 *
 * @param supabase Injected per-request client.
 * @param profileId Owning doctor's profile id.
 * @param patientId Patient the dose belongs to.
 * @param scheduleItemId The specific reference item marked as taken.
 */
export async function markDoseTaken(
  supabase: SupabaseClient,
  profileId: string,
  patientId: string,
  scheduleItemId: string,
): Promise<void> {
  const { error } = await supabase
    .from("patient_vaccine_doses")
    .upsert(
      {
        profile_id: profileId,
        patient_id: patientId,
        schedule_item_id: scheduleItemId,
      },
      {
        onConflict: "profile_id,patient_id,schedule_item_id",
        ignoreDuplicates: true,
      },
    )

  if (error)
    throw new Error(`[VACCINE_DOSES] Failed to mark dose taken: ${error.message}`)
}
