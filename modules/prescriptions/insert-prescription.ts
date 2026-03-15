import type { SupabaseClient } from "@supabase/supabase-js"

export type InsertPrescriptionParams = {
  profileId: string
  patientId: string | null
  caseId: string | null
  payload: Record<string, unknown>
  locationState: string
  issuedAt: string
  orientations?: string | null
  warningSigns?: string | null
  additionalNotes?: string | null
}

/**
 * Inserts a prescription row and returns the id.
 */
export async function insertPrescription(
  supabase: SupabaseClient,
  params: InsertPrescriptionParams,
): Promise<string> {
  const { data, error } = await supabase
    .from("prescriptions")
    .insert({
      profile_id: params.profileId,
      patient_id: params.patientId,
      case_id: params.caseId,
      payload: params.payload,
      location_state: params.locationState,
      issued_at: params.issuedAt,
      orientations: params.orientations ?? null,
      warning_signs: params.warningSigns ?? null,
      additional_notes: params.additionalNotes ?? null,
      pdf_storage_path: null,
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(`[PRESCRIPTIONS] insert failed: ${error.message}`)
  }

  if (!data?.id) {
    throw new Error("[PRESCRIPTIONS] insert returned no id")
  }

  return data.id as string
}
