import type { SupabaseClient } from "@supabase/supabase-js"

import type { CreateMeasurementPayload, Measurement } from "./types"

export const MEASUREMENT_SELECT =
  "id, profile_id, patient_id, measured_on, weight_grams, length_height_mm, head_circumference_mm, created_at, updated_at"

/**
 * Creates a patient measurement scoped to the given profile_id (doctor) and
 * patient_id. Anthropometric values must already be in base units (grams / mm);
 * caller (action) validates the payload and performs unit conversion.
 */
export async function createMeasurement(
  supabase: SupabaseClient,
  profileId: string,
  patientId: string,
  payload: CreateMeasurementPayload,
): Promise<Measurement> {
  const row = {
    profile_id: profileId,
    patient_id: patientId,
    measured_on: payload.measured_on,
    weight_grams: payload.weight_grams,
    length_height_mm: payload.length_height_mm,
    head_circumference_mm: payload.head_circumference_mm,
  }

  const { data, error } = await supabase
    .from("patient_measurements")
    .insert(row)
    .select(MEASUREMENT_SELECT)
    .single()

  if (error)
    throw new Error(`[GROWTH] Failed to create measurement: ${error.message}`)

  return data as Measurement
}
