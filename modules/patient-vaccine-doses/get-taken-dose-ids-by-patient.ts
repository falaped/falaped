import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Fetches the set of reference `schedule_item_id`s the given patient has already
 * taken, scoped by BOTH profile_id (doctor) and patient_id — the ownership
 * backstop / IDOR defense (D-14): NEVER select by patient_id alone.
 *
 * Returns a Set for O(1) membership checks in the UI (each checkbox asks "is this
 * item taken?"). Boolean grain — presence of the id means taken. Position-only:
 * no diff/pending logic (Phase 6).
 *
 * @param supabase Injected per-request client.
 * @param profileId Owning doctor's profile id.
 * @param patientId Patient whose applied doses to read.
 */
export async function getTakenDoseIdsByPatient(
  supabase: SupabaseClient,
  profileId: string,
  patientId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("patient_vaccine_doses")
    .select("schedule_item_id")
    .eq("profile_id", profileId)
    .eq("patient_id", patientId)

  if (error)
    throw new Error(
      `[VACCINE_DOSES] Failed to fetch taken doses: ${error.message}`,
    )

  const rows = (data ?? []) as Array<{ schedule_item_id: string }>
  return new Set(rows.map((row) => row.schedule_item_id))
}
