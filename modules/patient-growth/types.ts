/**
 * Measurement row from the patient_measurements table (snake_case aligned with
 * DB). Anthropometric values are stored as integers in base units: weight in
 * grams, length/height and head circumference in millimeters. Age and percentile
 * are NEVER stored — they are derived at read time (D-14).
 */
export type Measurement = {
  id: string
  profile_id: string
  patient_id: string
  measured_on: string
  weight_grams: number | null
  length_height_mm: number | null
  head_circumference_mm: number | null
  created_at: string
  updated_at: string
}

/**
 * Payload to create a measurement. Values are already converted to base units
 * (kg->g, cm->mm) at the action boundary; the module persists integers as-is.
 */
export type CreateMeasurementPayload = {
  measured_on: string
  weight_grams: number | null
  length_height_mm: number | null
  head_circumference_mm: number | null
}
