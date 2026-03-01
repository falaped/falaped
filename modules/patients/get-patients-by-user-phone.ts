import type { SupabaseClient } from "@supabase/supabase-js"
import type { Patient } from "./types"

const PATIENT_SELECT =
  "id, user_phone, name, birth_date, responsible, contact_phone, sex, legal_guardian, blood_type, weight, height, head_circumference, allergies, current_medications, medical_history, created_at, updated_at"

/**
 * Fetches all patients for a pediatrician by user_phone (doctor's channel phone).
 */
export async function getPatientsByUserPhone(
  supabase: SupabaseClient,
  userPhone: string
): Promise<Patient[]> {
  const { data, error } = await supabase
    .from("patients")
    .select(PATIENT_SELECT)
    .eq("user_phone", userPhone)
    .order("name", { ascending: true })

  if (error)
    throw new Error(
      `[PATIENTS] Failed to fetch patients: ${error.message}`
    )

  return (data ?? []) as Patient[]
}
