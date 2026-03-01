import type { SupabaseClient } from "@supabase/supabase-js"
import type { Patient } from "./types"
import { getPatientsByProfileId } from "./get-patients-by-profile-id"

/**
 * Finds a patient for the given profile_id with the same name and responsible
 * (case-insensitive, trimmed). Used to prevent duplicate registration.
 */
export async function findPatientByProfileIdNameAndResponsible(
  supabase: SupabaseClient,
  profileId: string,
  name: string,
  responsible: string
): Promise<Patient | null> {
  const nameNorm = name.trim().toLowerCase()
  const responsibleNorm = responsible.trim().toLowerCase()
  if (!nameNorm || !responsibleNorm) return null

  const patients = await getPatientsByProfileId(supabase, profileId)
  return (
    patients.find(
      (p) =>
        (p.name?.trim().toLowerCase() ?? "") === nameNorm &&
        (p.responsible?.trim().toLowerCase() ?? "") === responsibleNorm
    ) ?? null
  )
}
