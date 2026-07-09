import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Deletes a measurement by id, ONLY if it belongs to the given profile_id
 * (doctor) AND patient_id. This triple scope is the ownership backstop against
 * the documented IDOR bug (D-14 / CONCERNS Pitfall 5): NEVER `.delete().eq("id")`
 * alone — that would let a doctor delete another doctor's measurement by UUID.
 * No cascade / storage side-effects: measurements carry no derived rows or files.
 */
export async function deleteMeasurement(
  supabase: SupabaseClient,
  id: string,
  profileId: string,
  patientId: string,
): Promise<void> {
  const { error } = await supabase
    .from("patient_measurements")
    .delete()
    .eq("id", id)
    .eq("profile_id", profileId)
    .eq("patient_id", patientId)

  if (error)
    throw new Error(`[GROWTH] Failed to delete measurement: ${error.message}`)
}
