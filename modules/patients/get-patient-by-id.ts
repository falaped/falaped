import type { SupabaseClient } from "@supabase/supabase-js"
import type { Patient } from "./types"

const PATIENT_SELECT =
  "id, user_phone, name, birth_date, responsible, contact_phone, sex, legal_guardian, blood_type, weight, height, head_circumference, allergies, current_medications, medical_history, created_at, updated_at"

/**
 * Fetches a single patient by id, only if it belongs to the given user_phone.
 * Returns null when not found or ownership mismatch.
 */
export async function getPatientById(
  supabase: SupabaseClient,
  id: string,
  userPhone: string
): Promise<Patient | null> {
  const { data, error } = await supabase
    .from("patients")
    .select(PATIENT_SELECT)
    .eq("id", id)
    .eq("user_phone", userPhone)
    .maybeSingle()

  if (error)
    throw new Error(
      `[PATIENTS] Failed to fetch patient: ${error.message}`
    )

  return data as Patient | null
}
