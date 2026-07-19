import type { SupabaseClient } from "@supabase/supabase-js"

export type InsertMedicalReportParams = {
  profileId: string
  patientId: string | null
  caseId: string | null
  payload: Record<string, unknown>
  locationState: string
  issuedAt: string
}

/**
 * Inserts a medical report row and returns the id.
 */
export async function insertMedicalReport(
  supabase: SupabaseClient,
  params: InsertMedicalReportParams,
): Promise<string> {
  const { data, error } = await supabase
    .from("medical_reports")
    .insert({
      profile_id: params.profileId,
      patient_id: params.patientId,
      case_id: params.caseId,
      payload: params.payload,
      location_state: params.locationState,
      issued_at: params.issuedAt,
      pdf_storage_path: null,
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(`[MEDICAL_REPORTS] insert failed: ${error.message}`)
  }

  if (!data?.id) {
    throw new Error("[MEDICAL_REPORTS] insert returned no id")
  }

  return data.id as string
}
