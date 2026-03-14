import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Updates the pdf_storage_path for a medical certificate after upload.
 */
export async function updateMedicalCertificatePdfPath(
  supabase: SupabaseClient,
  certificateId: string,
  pdfStoragePath: string,
): Promise<void> {
  const { error } = await supabase
    .from("medical_certificates")
    .update({ pdf_storage_path: pdfStoragePath })
    .eq("id", certificateId)

  if (error) {
    throw new Error(
      `[MEDICAL_CERTIFICATES] update pdf_storage_path failed: ${error.message}`,
    )
  }
}
