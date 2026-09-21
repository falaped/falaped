import type { SupabaseClient } from "@supabase/supabase-js"

import { SCALE_RESULT_SELECT } from "./create-scale-result"
import type { ScaleResult } from "./types"

/**
 * Escalas aplicadas dentro de um atendimento, da mais recente para a mais antiga.
 * Escopado por profile_id E case_id (ownership backstop).
 */
export async function getScaleResultsByCase(
  supabase: SupabaseClient,
  profileId: string,
  caseId: string,
): Promise<ScaleResult[]> {
  const { data, error } = await supabase
    .from("patient_scale_results")
    .select(SCALE_RESULT_SELECT)
    .eq("profile_id", profileId)
    .eq("case_id", caseId)
    .order("applied_at", { ascending: false })

  if (error)
    throw new Error(
      `[SCALES] Failed to list scale results by case: ${error.message}`,
    )

  return (data ?? []) as ScaleResult[]
}
