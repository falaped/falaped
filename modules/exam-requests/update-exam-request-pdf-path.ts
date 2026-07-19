import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Updates the pdf_storage_path for an exam request after upload.
 * Scoped by profile_id as defense-in-depth (D-15).
 */
export async function updateExamRequestPdfPath(
  supabase: SupabaseClient,
  examRequestId: string,
  profileId: string,
  pdfStoragePath: string,
): Promise<void> {
  const { error } = await supabase
    .from("exam_requests")
    .update({ pdf_storage_path: pdfStoragePath })
    .eq("id", examRequestId)
    .eq("profile_id", profileId)

  if (error) {
    throw new Error(
      `[EXAM_REQUESTS] update pdf_storage_path failed: ${error.message}`,
    )
  }
}
