import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Updates the pdf_storage_path for a prescription after upload.
 */
export async function updatePrescriptionPdfPath(
  supabase: SupabaseClient,
  prescriptionId: string,
  pdfStoragePath: string,
): Promise<void> {
  const { error } = await supabase
    .from("prescriptions")
    .update({ pdf_storage_path: pdfStoragePath })
    .eq("id", prescriptionId)

  if (error) {
    throw new Error(
      `[PRESCRIPTIONS] update pdf_storage_path failed: ${error.message}`,
    )
  }
}
