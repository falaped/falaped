import type { SupabaseClient } from "@supabase/supabase-js"

import { PATIENT_ATTACHMENTS_BUCKET } from "@/lib/constants"

/**
 * Sobe as páginas (já JPEG, convertidas no browser) para o bucket privado de
 * anexos, em `{profileId}/{patientId}/exam-readings/{readingId}/{n}.jpg`. O
 * prefixo `profileId/` É o escopo da RLS de storage, igual aos anexos.
 * Devolve os paths na ordem das páginas.
 */
export async function uploadExamReadingPages(
  supabase: SupabaseClient,
  profileId: string,
  patientId: string,
  readingId: string,
  pages: Blob[],
): Promise<string[]> {
  const paths: string[] = []
  for (const [i, page] of pages.entries()) {
    const path = `${profileId}/${patientId}/exam-readings/${readingId}/${i + 1}.jpg`
    const { error } = await supabase.storage
      .from(PATIENT_ATTACHMENTS_BUCKET)
      .upload(path, page, { upsert: false, contentType: "image/jpeg" })
    if (error)
      throw new Error(`[EXAM_READINGS] upload page ${i + 1} failed: ${error.message}`)
    paths.push(path)
  }
  return paths
}
