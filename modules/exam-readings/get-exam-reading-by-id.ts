import type { SupabaseClient } from "@supabase/supabase-js"

import type { ExamReading } from "@/modules/exam-readings/types"

/** Uma leitura do médico logado; null quando não existe ou não é dele. */
export async function getExamReadingById(
  supabase: SupabaseClient,
  profileId: string,
  readingId: string,
): Promise<ExamReading | null> {
  const { data, error } = await supabase
    .from("case_exam_readings")
    .select("*")
    .eq("profile_id", profileId)
    .eq("id", readingId)
    .maybeSingle()
  if (error)
    throw new Error(`[EXAM_READINGS] get failed: ${error.message}`)
  return (data as ExamReading | null) ?? null
}
