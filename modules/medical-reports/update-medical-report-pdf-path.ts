import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Updates the pdf_storage_path for a medical report after upload.
 * Scoped by profile_id as defense-in-depth (D-15).
 */
export async function updateMedicalReportPdfPath(
  supabase: SupabaseClient,
  medicalReportId: string,
  profileId: string,
  pdfStoragePath: string,
): Promise<void> {
  const { error } = await supabase
    .from("medical_reports")
    .update({ pdf_storage_path: pdfStoragePath })
    .eq("id", medicalReportId)
    .eq("profile_id", profileId)

  if (error) {
    throw new Error(
      `[MEDICAL_REPORTS] update pdf_storage_path failed: ${error.message}`,
    )
  }
}
