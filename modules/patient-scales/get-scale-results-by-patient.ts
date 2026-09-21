import type { SupabaseClient } from "@supabase/supabase-js"

import { SCALE_RESULT_SELECT } from "./create-scale-result"
import type { ScaleResult } from "./types"

/**
 * Histórico de escalas de um paciente, da mais recente para a mais antiga.
 * Escopado por profile_id E patient_id (ownership backstop).
 */
export async function getScaleResultsByPatient(
  supabase: SupabaseClient,
  profileId: string,
  patientId: string,
): Promise<ScaleResult[]> {
  const { data, error } = await supabase
    .from("patient_scale_results")
    .select(SCALE_RESULT_SELECT)
    .eq("profile_id", profileId)
    .eq("patient_id", patientId)
    .order("applied_at", { ascending: false })

  if (error)
    throw new Error(
      `[SCALES] Failed to list scale results by patient: ${error.message}`,
    )

  return (data ?? []) as ScaleResult[]
}
