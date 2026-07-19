import type { SupabaseClient } from "@supabase/supabase-js"

export type InsertGuidanceDocumentParams = {
  profileId: string
  patientId: string | null
  caseId: string | null
  payload: Record<string, unknown>
  locationState: string
  issuedAt: string
}

/**
 * Insere uma linha de documento de orientação e retorna o id.
 */
export async function insertGuidanceDocument(
  supabase: SupabaseClient,
  params: InsertGuidanceDocumentParams,
): Promise<string> {
  const { data, error } = await supabase
    .from("guidance_documents")
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
    throw new Error(`[GUIDANCE] insert document failed: ${error.message}`)
  }

  if (!data?.id) {
    throw new Error("[GUIDANCE] insert document returned no id")
  }

  return data.id as string
}
