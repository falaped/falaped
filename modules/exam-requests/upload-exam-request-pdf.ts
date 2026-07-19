import type { SupabaseClient } from "@supabase/supabase-js"
import { EXAM_REQUESTS_BUCKET } from "@/lib/constants"

/**
 * Uploads an exam request PDF to storage.
 * Path: {profileId}/{examRequestId}.pdf — only the profile owner can access (RLS).
 *
 * @returns The storage path to save in exam_requests.pdf_storage_path
 */
export async function uploadExamRequestPdf(
  supabase: SupabaseClient,
  profileId: string,
  examRequestId: string,
  buffer: Buffer,
): Promise<string> {
  const path = `${profileId}/${examRequestId}.pdf`

  const { error } = await supabase.storage
    .from(EXAM_REQUESTS_BUCKET)
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (error) {
    throw new Error(`[EXAM_REQUESTS] Falha no upload do PDF: ${error.message}`)
  }

  return path
}
