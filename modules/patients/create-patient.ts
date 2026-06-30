import type { SupabaseClient } from "@supabase/supabase-js"

import { normalizePatientSexFromDb } from "@/modules/patients/patient-sex"
import type { Patient } from "./types"

const PATIENT_SELECT =
  "id, profile_id, user_phone, name, birth_date, responsible, contact_phone, sex, legal_guardian, blood_type, gestational_age_weeks, weight, height, head_circumference, allergies, current_medications, medical_history, photo_path, consent_given, consent_at, created_at, updated_at"

export type CreatePatientPayload = {
  name: string
  birth_date?: string | null
  responsible: string
  contact_phone: string
  sex?: string | null
  legal_guardian?: string | null
  blood_type?: string | null
  gestational_age_weeks?: number | null
  weight?: string | null
  height?: string | null
  head_circumference?: string | null
  allergies?: string | null
  current_medications?: string | null
  medical_history?: string | null
}

/**
 * Creates a new patient for the given profile_id (doctor).
 * Caller must validate payload (name, responsible, contact_phone required).
 */
export async function createPatient(
  supabase: SupabaseClient,
  profileId: string,
  payload: CreatePatientPayload
): Promise<Patient> {
  const row = {
    profile_id: profileId,
    name: payload.name.trim(),
    birth_date: payload.birth_date?.trim() || null,
    responsible: payload.responsible.trim() || null,
    contact_phone: payload.contact_phone.replace(/\D/g, "").trim() || null,
    sex: normalizePatientSexFromDb(payload.sex ?? null),
    legal_guardian: payload.legal_guardian?.trim() || null,
    blood_type: payload.blood_type?.trim() || null,
    gestational_age_weeks: payload.gestational_age_weeks ?? null,
    weight: payload.weight?.trim() || null,
    height: payload.height?.trim() || null,
    head_circumference: payload.head_circumference?.trim() || null,
    allergies: payload.allergies?.trim() || null,
    current_medications: payload.current_medications?.trim() || null,
    medical_history: payload.medical_history?.trim() || null,
  }

  const { data, error } = await supabase
    .from("patients")
    .insert(row)
    .select(PATIENT_SELECT)
    .single()

  if (error)
    throw new Error(
      `[PATIENTS] Failed to create patient: ${error.message}`
    )

  return data as Patient
}
