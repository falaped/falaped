import type { SupabaseClient } from "@supabase/supabase-js"

import type { CreateScaleResultPayload, ScaleResult } from "./types"

export const SCALE_RESULT_SELECT =
  "id, profile_id, patient_id, case_id, scale_key, answers, score, interpretation, applied_at, created_at"

/**
 * Registra uma aplicação de escala para um paciente do perfil informado.
 * O escore e a interpretação vêm já calculados pela action a partir da definição
 * em `lib/scales/` — este módulo só persiste.
 */
export async function createScaleResult(
  supabase: SupabaseClient,
  profileId: string,
  payload: CreateScaleResultPayload,
): Promise<ScaleResult> {
  const { data, error } = await supabase
    .from("patient_scale_results")
    .insert({
      profile_id: profileId,
      patient_id: payload.patient_id,
      case_id: payload.case_id,
      scale_key: payload.scale_key,
      answers: payload.answers,
      score: payload.score,
      interpretation: payload.interpretation,
    })
    .select(SCALE_RESULT_SELECT)
    .single()

  if (error)
    throw new Error(`[SCALES] Failed to create scale result: ${error.message}`)

  return data as ScaleResult
}
