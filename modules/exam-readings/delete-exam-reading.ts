import type { SupabaseClient } from "@supabase/supabase-js"

import { PATIENT_ATTACHMENTS_BUCKET } from "@/lib/constants"

/** Apaga as páginas do storage e depois a linha. Arquivo órfão é pior que linha órfã. */
export async function deleteExamReading(
  supabase: SupabaseClient,
  profileId: string,
  readingId: string,
  pagePaths: string[],
): Promise<void> {
  if (pagePaths.length > 0) {
    const { error } = await supabase.storage
      .from(PATIENT_ATTACHMENTS_BUCKET)
      .remove(pagePaths)
    if (error)
      throw new Error(`[EXAM_READINGS] remove pages failed: ${error.message}`)
  }
  const { error } = await supabase
    .from("case_exam_readings")
    .delete()
    .eq("profile_id", profileId)
    .eq("id", readingId)
  if (error)
    throw new Error(`[EXAM_READINGS] delete failed: ${error.message}`)
}
