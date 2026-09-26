import type { SupabaseClient } from "@supabase/supabase-js"

import type { ExamReadingItem } from "@/modules/exam-readings/types"

/** Grava itens confirmados e/ou o texto do relatório. Só campos presentes mudam. */
export async function updateExamReading(
  supabase: SupabaseClient,
  profileId: string,
  readingId: string,
  patch: { items?: ExamReadingItem[]; report_text?: string | null },
): Promise<void> {
  const { error } = await supabase
    .from("case_exam_readings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("profile_id", profileId)
    .eq("id", readingId)
  if (error)
    throw new Error(`[EXAM_READINGS] update failed: ${error.message}`)
}
