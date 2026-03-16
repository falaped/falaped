import type { SupabaseClient } from "@supabase/supabase-js"
import { MEDICAL_CERTIFICATES_BUCKET } from "@/lib/constants"

/**
 * Deletes a medical certificate by id. Removes the PDF from storage if
 * pdf_storage_path is set. Use storageClient (e.g. admin) when the user client
 * cannot delete due to RLS; otherwise storage is removed with supabase.
 */
export async function deleteMedicalCertificate(
  supabase: SupabaseClient,
  certificateId: string,
  pdfStoragePath: string | null,
  storageClient?: SupabaseClient,
): Promise<void> {
  if (pdfStoragePath?.trim()) {
    const client = storageClient ?? supabase
    const { error: storageError } = await client.storage
      .from(MEDICAL_CERTIFICATES_BUCKET)
      .remove([pdfStoragePath])

    if (storageError) {
      console.error(
        `[MEDICAL_CERTIFICATES] Failed to remove PDF from storage: ${storageError.message}`,
      )
      throw new Error(
        `[MEDICAL_CERTIFICATES] Falha ao remover PDF do storage: ${storageError.message}`,
      )
    }
  }

  const { error } = await supabase
    .from("medical_certificates")
    .delete()
    .eq("id", certificateId)

  if (error) {
    throw new Error(
      `[MEDICAL_CERTIFICATES] Failed to delete certificate: ${error.message}`,
    )
  }
}
