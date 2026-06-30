import type { PatientSex } from "@/modules/patients/patient-sex"

/**
 * Patient row from patients table (snake_case aligned with DB).
 */
export type Patient = {
  id: string
  profile_id: string
  user_phone: string | null
  name: string
  birth_date: string | null
  responsible: string | null
  contact_phone: string | null
  sex: PatientSex | null
  legal_guardian: string | null
  blood_type: string | null
  gestational_age_weeks: number | null
  weight: string | null
  height: string | null
  head_circumference: string | null
  allergies: string | null
  current_medications: string | null
  medical_history: string | null
  photo_path: string | null
  consent_given: boolean | null
  consent_at: string | null
  created_at: string
  updated_at: string
}
