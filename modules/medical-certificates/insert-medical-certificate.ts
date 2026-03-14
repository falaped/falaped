import type { SupabaseClient } from "@supabase/supabase-js"

export type MedicalCertificateType =
  | "comparecimento"
  | "aptidao_fisica"
  | "medico"
  | "acompanhante"

export type InsertMedicalCertificateParams = {
  profileId: string
  type: MedicalCertificateType
  patientId: string | null
  caseId: string | null
  payload: Record<string, unknown>
  locationState: string
  issuedAt: string
}

/**
 * Inserts a medical certificate row and returns the id.
 */
export async function insertMedicalCertificate(
  supabase: SupabaseClient,
  params: InsertMedicalCertificateParams,
): Promise<string> {
  const { data, error } = await supabase
    .from("medical_certificates")
    .insert({
      profile_id: params.profileId,
      type: params.type,
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
    throw new Error(
      `[MEDICAL_CERTIFICATES] insert failed: ${error.message}`,
    )
  }

  if (!data?.id) {
    throw new Error("[MEDICAL_CERTIFICATES] insert returned no id")
  }

  return data.id as string
}
