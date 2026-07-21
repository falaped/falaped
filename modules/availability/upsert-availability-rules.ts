import type { SupabaseClient } from "@supabase/supabase-js"

/** Uma faixa da grade semanal a persistir (sem profile_id — stampado server-side). */
export type AvailabilityRuleUpsertInput = {
  weekday: number
  start_minute: number
  end_minute: number
  slot_minutes: number
}

/**
 * SUBSTITUI a grade semanal inteira do médico: apaga todas as faixas atuais e
 * insere as novas, tudo escopado por profile_id. O profile_id é SEMPRE stampado
 * server-side (nunca confiar no cliente) — defesa contra IDOR (D-13). Múltiplas
 * faixas por weekday são permitidas (D-02).
 *
 * Estratégia delete-then-insert: simples e correta para "grade inteira". Se o
 * array vier vazio, a grade é limpa (delete sem insert).
 *
 * @param supabase Cliente por-requisição injetado.
 * @param profileId Id do perfil do médico dono.
 * @param rules Faixas da nova grade (substituem completamente as anteriores).
 */
export async function upsertAvailabilityRules(
  supabase: SupabaseClient,
  profileId: string,
  rules: AvailabilityRuleUpsertInput[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("availability_rules")
    .delete()
    .eq("profile_id", profileId)

  if (deleteError)
    throw new Error(
      `[AVAILABILITY] Failed to clear availability rules: ${deleteError.message}`,
    )

  if (rules.length === 0) return

  const rows = rules.map((rule) => ({
    profile_id: profileId,
    weekday: rule.weekday,
    start_minute: rule.start_minute,
    end_minute: rule.end_minute,
    slot_minutes: rule.slot_minutes,
  }))

  const { error: insertError } = await supabase
    .from("availability_rules")
    .insert(rows)

  if (insertError)
    throw new Error(
      `[AVAILABILITY] Failed to save availability rules: ${insertError.message}`,
    )
}
