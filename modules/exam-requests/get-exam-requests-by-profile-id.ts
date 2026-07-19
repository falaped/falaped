import type { SupabaseClient } from "@supabase/supabase-js"
import type { ExamRequestListItem } from "./types"

/**
 * Fetches exam requests for a profile (doctor), ordered by issued_at desc.
 * patient_name is taken from payload.patientName for list display.
 */
export async function getExamRequestsByProfileId(
  supabase: SupabaseClient,
  profileId: string,
): Promise<ExamRequestListItem[]> {
  const { data, error } = await supabase
    .from("exam_requests")
    .select(
      "id, profile_id, patient_id, payload, location_state, issued_at, pdf_storage_path, created_at",
    )
    .eq("profile_id", profileId)
    .order("issued_at", { ascending: false })

  if (error) {
    throw new Error(`[EXAM_REQUESTS] Failed to fetch list: ${error.message}`)
  }

  const rows = (data ?? []) as Array<{
    id: string
    profile_id: string
    patient_id: string | null
    payload: Record<string, unknown>
    location_state: string | null
    issued_at: string
    pdf_storage_path: string | null
    created_at: string
  }>

  return rows.map((row) => ({
    id: row.id,
    profile_id: row.profile_id,
    patient_id: row.patient_id,
    payload: row.payload,
    location_state: row.location_state,
    issued_at: row.issued_at,
    pdf_storage_path: row.pdf_storage_path,
    created_at: row.created_at,
    patient_name: (row.payload?.patientName as string) ?? null,
  }))
}
