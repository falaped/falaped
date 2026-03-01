import type { SupabaseClient } from "@supabase/supabase-js"
import type { Patient } from "./types"

const PATIENT_SELECT =
  "id, profile_id, user_phone, name, birth_date, responsible, contact_phone, sex, legal_guardian, blood_type, weight, height, head_circumference, allergies, current_medications, medical_history, created_at, updated_at"

/**
 * Fetches all patients for a pediatrician by profile_id (doctor).
 */
export async function getPatientsByProfileId(
  supabase: SupabaseClient,
  profileId: string
): Promise<Patient[]> {
  const { data, error } = await supabase
    .from("patients")
    .select(PATIENT_SELECT)
    .eq("profile_id", profileId)
    .order("name", { ascending: true })

  if (error)
    throw new Error(
      `[PATIENTS] Failed to fetch patients: ${error.message}`
    )

  return (data ?? []) as Patient[]
}
