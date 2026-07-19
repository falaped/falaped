import type { SupabaseClient } from "@supabase/supabase-js"
import { MEDICAL_REPORTS_BUCKET } from "@/lib/constants"

/**
 * Uploads a medical report PDF to storage.
 * Path: {profileId}/{medicalReportId}.pdf — only the profile owner can access (RLS).
 *
 * @returns The storage path to save in medical_reports.pdf_storage_path
 */
export async function uploadMedicalReportPdf(
  supabase: SupabaseClient,
  profileId: string,
  medicalReportId: string,
  buffer: Buffer,
): Promise<string> {
  const path = `${profileId}/${medicalReportId}.pdf`

  const { error } = await supabase.storage
    .from(MEDICAL_REPORTS_BUCKET)
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (error) {
    throw new Error(`[MEDICAL_REPORTS] Falha no upload do PDF: ${error.message}`)
  }

  return path
}
