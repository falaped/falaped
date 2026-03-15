import type { SupabaseClient } from "@supabase/supabase-js"
import { PRESCRIPTIONS_BUCKET } from "@/lib/constants"

/**
 * Deletes a prescription by id. RLS ensures only the profile owner can delete.
 * Removes the PDF from storage if pdf_storage_path is set.
 */
export async function deletePrescription(
  supabase: SupabaseClient,
  prescriptionId: string,
  pdfStoragePath: string | null,
): Promise<void> {
  if (pdfStoragePath?.trim()) {
    const { error: storageError } = await supabase.storage
      .from(PRESCRIPTIONS_BUCKET)
      .remove([pdfStoragePath])

    if (storageError) {
      console.error(
        `[PRESCRIPTIONS] Failed to remove PDF from storage: ${storageError.message}`,
      )
      // Continue to delete the row so the record is removed
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
