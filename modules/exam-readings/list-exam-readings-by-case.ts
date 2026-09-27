import type { SupabaseClient } from "@supabase/supabase-js"

import type { ExamReading } from "@/modules/exam-readings/types"

/** Leituras de exame de um atendimento, mais recente primeiro. */
export async function listExamReadingsByCase(
  supabase: SupabaseClient,
  profileId: string,
  caseId: string,
): Promise<ExamReading[]> {
  const { data, error } = await supabase
    .from("case_exam_readings")
    .select("*")
    .eq("profile_id", profileId)
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
  if (error)
    throw new Error(`[EXAM_READINGS] list failed: ${error.message}`)
  return (data ?? []) as ExamReading[]
}
