import type { SupabaseClient } from "@supabase/supabase-js"
import { GUIDANCE_BUCKET } from "@/lib/constants"

/**
 * Envia o PDF de orientação ao storage.
 * Path: {profileId}/{guidanceDocumentId}.pdf — só o dono do profile acessa (RLS).
 *
 * @returns O storage path a salvar em guidance_documents.pdf_storage_path
 */
export async function uploadGuidancePdf(
  supabase: SupabaseClient,
  profileId: string,
  guidanceDocumentId: string,
  buffer: Buffer,
): Promise<string> {
  const path = `${profileId}/${guidanceDocumentId}.pdf`

  const { error } = await supabase.storage
    .from(GUIDANCE_BUCKET)
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (error) {
    throw new Error(`[GUIDANCE] Falha no upload do PDF: ${error.message}`)
  }

  return path
}
