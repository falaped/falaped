import type { SupabaseClient } from "@supabase/supabase-js"
import type { PrescriptionListItem } from "./types"

/**
 * Fetches prescriptions for a profile (doctor), ordered by issued_at desc.
 * patient_name is taken from payload.patientName for list display.
 */
export async function getPrescriptionsByProfileId(
  supabase: SupabaseClient,
  profileId: string,
): Promise<PrescriptionListItem[]> {
  const { data, error } = await supabase
    .from("prescriptions")
    .select(
      "id, profile_id, patient_id, payload, location_state, issued_at, pdf_storage_path, created_at",
    )
    .eq("profile_id", profileId)
    .order("issued_at", { ascending: false })

  if (error) {
    throw new Error(
      `[PRESCRIPTIONS] Failed to fetch list: ${error.message}`,
    )
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
