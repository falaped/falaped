/**
 * Patient row from patients table (snake_case aligned with DB).
 */
export type Patient = {
  id: string
  user_phone: string
  name: string
  birth_date: string | null
  responsible: string | null
  contact_phone: string | null
  sex: string | null
  legal_guardian: string | null
  blood_type: string | null
  weight: string | null
  height: string | null
  head_circumference: string | null
  allergies: string | null
  current_medications: string | null
  medical_history: string | null
  created_at: string
  updated_at: string
}
