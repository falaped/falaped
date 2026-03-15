import type { SupabaseClient } from "@supabase/supabase-js"
import type {
  MedicalCertificateListItem,
  MedicalCertificateType,
} from "./get-medical-certificates-by-profile-id"

/**
 * Fetches medical certificates for a profile that are associated with a given patient.
 * Ordered by issued_at desc.
 */
export async function getMedicalCertificatesByPatientId(
  supabase: SupabaseClient,
  profileId: string,
  patientId: string,
): Promise<MedicalCertificateListItem[]> {
  const { data, error } = await supabase
    .from("medical_certificates")
    .select(
      "id, profile_id, type, patient_id, payload, location_state, issued_at, pdf_storage_path, created_at",
    )
    .eq("profile_id", profileId)
    .eq("patient_id", patientId)
    .order("issued_at", { ascending: false })

  if (error) {
    throw new Error(
      `[MEDICAL_CERTIFICATES] Failed to fetch by patient: ${error.message}`,
    )
  }

  const rows = (data ?? []) as Array<{
    id: string
    profile_id: string
    type: MedicalCertificateType
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
    type: row.type,
    patient_id: row.patient_id,
    payload: row.payload,
    location_state: row.location_state,
    issued_at: row.issued_at,
    pdf_storage_path: row.pdf_storage_path,
    created_at: row.created_at,
    patient_name: (row.payload?.patientName as string) ?? null,
  }))
}
