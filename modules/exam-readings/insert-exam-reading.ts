import type { SupabaseClient } from "@supabase/supabase-js"

import type { CreateExamReadingPayload } from "@/modules/exam-readings/types"

/** Insere a leitura com o id gerado pela action (o mesmo do path das páginas). */
export async function insertExamReading(
  supabase: SupabaseClient,
  profileId: string,
  readingId: string,
  payload: CreateExamReadingPayload,
): Promise<void> {
  const { error } = await supabase.from("case_exam_readings").insert({
    id: readingId,
    profile_id: profileId,
    ...payload,
  })
  if (error)
    throw new Error(`[EXAM_READINGS] insert failed: ${error.message}`)
}
