import type { SupabaseClient } from "@supabase/supabase-js"
import { PRESCRIPTIONS_BUCKET } from "@/lib/constants"

/**
 * Uploads a prescription PDF to storage.
 * Path: {profileId}/{prescriptionId}.pdf — only the profile owner can access (RLS).
 *
 * @returns The storage path to save in prescriptions.pdf_storage_path
 */
export async function uploadPrescriptionPdf(
  supabase: SupabaseClient,
  profileId: string,
  prescriptionId: string,
  buffer: Buffer,
): Promise<string> {
  const path = `${profileId}/${prescriptionId}.pdf`

  const { error } = await supabase.storage
    .from(PRESCRIPTIONS_BUCKET)
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (error) {
    throw new Error(
      `[PRESCRIPTIONS] Falha no upload do PDF: ${error.message}`,
    )
  }

  return path
}
