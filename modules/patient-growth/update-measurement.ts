import type { SupabaseClient } from "@supabase/supabase-js"

import { MEASUREMENT_SELECT } from "./create-measurement"
import type { Measurement, UpdateMeasurementPayload } from "./types"

/**
 * Updates a measurement by id, ONLY if it belongs to the given profile_id
 * (doctor) AND patient_id — the ownership backstop against the documented IDOR
 * bug (D-14 / CONCERNS Pitfall 5). NEVER scope by id alone. Only provided fields
 * are written; `updated_at` is always refreshed. Anthropometric values must be in
 * base units (grams / mm); the action validates and converts.
 */
export async function updateMeasurement(
  supabase: SupabaseClient,
  id: string,
  profileId: string,
  patientId: string,
  payload: UpdateMeasurementPayload,
): Promise<Measurement> {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (payload.measured_on !== undefined) updates.measured_on = payload.measured_on
  if (payload.weight_grams !== undefined) updates.weight_grams = payload.weight_grams
  if (payload.length_height_mm !== undefined)
    updates.length_height_mm = payload.length_height_mm
  if (payload.head_circumference_mm !== undefined)
    updates.head_circumference_mm = payload.head_circumference_mm

  const { data, error } = await supabase
    .from("patient_measurements")
    .update(updates)
    .eq("id", id)
    .eq("profile_id", profileId)
    .eq("patient_id", patientId)
    .select(MEASUREMENT_SELECT)
    .single()

  if (error)
    throw new Error(`[GROWTH] Failed to update measurement: ${error.message}`)

  return data as Measurement
}
