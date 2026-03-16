import type { SupabaseClient } from "@supabase/supabase-js"
import { PRESCRIPTIONS_BUCKET } from "@/lib/constants"

/**
 * Deletes a prescription by id. RLS ensures only the profile owner can delete.
 * Removes the PDF from storage if pdf_storage_path is set. Use storageClient
 * (e.g. admin) when the user client cannot delete due to RLS.
 */
export async function deletePrescription(
  supabase: SupabaseClient,
  prescriptionId: string,
  pdfStoragePath: string | null,
  storageClient?: SupabaseClient,
): Promise<void> {
  if (pdfStoragePath?.trim()) {
    const client = storageClient ?? supabase
    const { error: storageError } = await client.storage
      .from(PRESCRIPTIONS_BUCKET)
      .remove([pdfStoragePath])

    if (storageError) {
      console.error(
        `[PRESCRIPTIONS] Failed to remove PDF from storage: ${storageError.message}`,
      )
      throw new Error(
        `[PRESCRIPTIONS] Falha ao remover PDF do storage: ${storageError.message}`,
      )
    }
  }

  const { error } = await supabase
    .from("prescriptions")
    .delete()
    .eq("id", prescriptionId)

  if (error) {
    throw new Error(
      `[PRESCRIPTIONS] Failed to delete prescription: ${error.message}`,
    )
  }
}
