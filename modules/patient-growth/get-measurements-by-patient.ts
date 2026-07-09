import type { SupabaseClient } from "@supabase/supabase-js"

import { MEASUREMENT_SELECT } from "./create-measurement"
import type { Measurement } from "./types"

/**
 * Fetches all measurements for a patient owned by the given profile_id (doctor),
 * ordered by measured_on ascending. Scoped by BOTH profile_id and patient_id
 * (ownership backstop / IDOR defense — D-14).
 */
export async function getMeasurementsByPatient(
  supabase: SupabaseClient,
  profileId: string,
  patientId: string,
): Promise<Measurement[]> {
  const { data, error } = await supabase
    .from("patient_measurements")
    .select(MEASUREMENT_SELECT)
    .eq("profile_id", profileId)
    .eq("patient_id", patientId)
    .order("measured_on", { ascending: true })

  if (error)
    throw new Error(`[GROWTH] Failed to fetch measurements: ${error.message}`)

  return (data ?? []) as Measurement[]
}
