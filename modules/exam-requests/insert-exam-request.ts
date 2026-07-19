import type { SupabaseClient } from "@supabase/supabase-js"

export type InsertExamRequestParams = {
  profileId: string
  patientId: string | null
  caseId: string | null
  payload: Record<string, unknown>
  locationState: string
  issuedAt: string
}

/**
 * Inserts an exam request row and returns the id.
 */
export async function insertExamRequest(
  supabase: SupabaseClient,
  params: InsertExamRequestParams,
): Promise<string> {
  const { data, error } = await supabase
    .from("exam_requests")
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
    throw new Error(`[EXAM_REQUESTS] insert failed: ${error.message}`)
  }

  if (!data?.id) {
    throw new Error("[EXAM_REQUESTS] insert returned no id")
  }

  return data.id as string
}
