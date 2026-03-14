import type { SupabaseClient } from "@supabase/supabase-js"
import { MEDICAL_CERTIFICATES_BUCKET } from "@/lib/constants"

/**
 * Uploads a medical certificate PDF to storage.
 * Path: {profileId}/{certificateId}.pdf — only the profile owner can access (RLS).
 *
 * @returns The storage path to save in medical_certificates.pdf_storage_path (e.g. "profile-uuid/cert-uuid.pdf")
 */
export async function uploadMedicalCertificatePdf(
  supabase: SupabaseClient,
  profileId: string,
  certificateId: string,
  buffer: Buffer
): Promise<string> {
  const path = `${profileId}/${certificateId}.pdf`

  const { error } = await supabase.storage
    .from(MEDICAL_CERTIFICATES_BUCKET)
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (error) {
    throw new Error(
      `[MEDICAL_CERTIFICATES] Falha no upload do PDF: ${error.message}`
    )
  }

  return path
}
