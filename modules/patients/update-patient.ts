import type { SupabaseClient } from "@supabase/supabase-js"
import type { Patient } from "./types"

const PATIENT_SELECT =
  "id, user_phone, name, birth_date, responsible, contact_phone, sex, legal_guardian, blood_type, weight, height, head_circumference, allergies, current_medications, medical_history, created_at, updated_at"

export type UpdatePatientPayload = {
  name?: string
  birth_date?: string | null
  responsible?: string | null
  contact_phone?: string | null
  sex?: string | null
  legal_guardian?: string | null
  blood_type?: string | null
  weight?: string | null
  height?: string | null
  head_circumference?: string | null
  allergies?: string | null
  current_medications?: string | null
  medical_history?: string | null
}

/**
 * Updates a patient by id; only if it belongs to the given user_phone.
 * Only provided fields are updated.
 */
export async function updatePatient(
  supabase: SupabaseClient,
  id: string,
  userPhone: string,
  payload: UpdatePatientPayload
): Promise<Patient> {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (payload.name !== undefined)
    updates.name = payload.name.trim()
  if (payload.birth_date !== undefined)
    updates.birth_date = payload.birth_date?.trim() || null
  if (payload.responsible !== undefined)
    updates.responsible = payload.responsible?.trim() || null
  if (payload.contact_phone !== undefined)
    updates.contact_phone =
      payload.contact_phone === null
        ? null
        : String(payload.contact_phone).replace(/\D/g, "").trim() || null
  if (payload.sex !== undefined) updates.sex = payload.sex?.trim() || null
  if (payload.legal_guardian !== undefined)
    updates.legal_guardian = payload.legal_guardian?.trim() || null
  if (payload.blood_type !== undefined)
    updates.blood_type = payload.blood_type?.trim() || null
  if (payload.weight !== undefined)
    updates.weight = payload.weight?.trim() || null
  if (payload.height !== undefined)
    updates.height = payload.height?.trim() || null
  if (payload.head_circumference !== undefined)
    updates.head_circumference =
      payload.head_circumference?.trim() || null
  if (payload.allergies !== undefined)
    updates.allergies = payload.allergies?.trim() || null
  if (payload.current_medications !== undefined)
    updates.current_medications =
      payload.current_medications?.trim() || null
  if (payload.medical_history !== undefined)
    updates.medical_history = payload.medical_history?.trim() || null

  const { data, error } = await supabase
    .from("patients")
    .update(updates)
    .eq("id", id)
    .eq("user_phone", userPhone)
    .select(PATIENT_SELECT)
    .single()

  if (error)
    throw new Error(
      `[PATIENTS] Failed to update patient: ${error.message}`
    )

  return data as Patient
}
