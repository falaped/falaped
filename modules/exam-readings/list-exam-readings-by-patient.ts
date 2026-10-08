import type { SupabaseClient } from "@supabase/supabase-js"

import type { ExamReading } from "@/modules/exam-readings/types"

/** Leituras de exame de uma criança (pela ficha e nas consultas), mais recente primeiro. */
export async function listExamReadingsByPatient(
  supabase: SupabaseClient,
  profileId: string,
  patientId: string,
): Promise<ExamReading[]> {
  const { data, error } = await supabase
    .from("case_exam_readings")
    .select("*")
    .eq("profile_id", profileId)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
  if (error)
    throw new Error(`[EXAM_READINGS] list failed: ${error.message}`)
  return (data ?? []) as ExamReading[]
}
