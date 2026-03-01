import type { SupabaseClient } from "@supabase/supabase-js"
import type { Patient } from "./types"
import { getPatientsByUserPhone } from "./get-patients-by-user-phone"

/**
 * Finds a patient for the given user_phone with the same name and responsible
 * (case-insensitive, trimmed). Used to prevent duplicate registration.
 */
export async function findPatientByUserPhoneNameAndResponsible(
  supabase: SupabaseClient,
  userPhone: string,
  name: string,
  responsible: string
): Promise<Patient | null> {
  const nameNorm = name.trim().toLowerCase()
  const responsibleNorm = responsible.trim().toLowerCase()
  if (!nameNorm || !responsibleNorm) return null

  const patients = await getPatientsByUserPhone(supabase, userPhone)
  return (
    patients.find(
      (p) =>
        (p.name?.trim().toLowerCase() ?? "") === nameNorm &&
        (p.responsible?.trim().toLowerCase() ?? "") === responsibleNorm
    ) ?? null
  )
}
