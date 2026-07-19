import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Atualiza o pdf_storage_path de um documento de orientação após o upload.
 * Escopado por profile_id como defense-in-depth (D-15).
 */
export async function updateGuidancePdfPath(
  supabase: SupabaseClient,
  guidanceDocumentId: string,
  profileId: string,
  pdfStoragePath: string,
): Promise<void> {
  const { error } = await supabase
    .from("guidance_documents")
    .update({ pdf_storage_path: pdfStoragePath })
    .eq("id", guidanceDocumentId)
    .eq("profile_id", profileId)

  if (error) {
    throw new Error(
      `[GUIDANCE] update pdf_storage_path failed: ${error.message}`,
    )
  }
}
