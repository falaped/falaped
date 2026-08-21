import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Conta os lançamentos NÃO-anulados de um caso — o mecanismo da guarda D-10:
 * re-encerrar um caso que já faturou não pergunta nada e não relança.
 *
 * O filtro de `profile_id` vem SEMPRE junto do de `case_id`: a policy de RLS de
 * `financial_entries` ancora só em `profile_id` e nunca olha para `public.cases`, então
 * `case_id` sozinho não é um escopo de posse (T-10-23).
 *
 * `count: "exact", head: true` não trafega linha nenhuma, e o predicado
 * (`case_id` + `voided_at is null`) é exatamente o do índice parcial criado em 10-01.
 */
export async function countNonVoidedEntriesForCase(
  supabase: SupabaseClient,
  profileId: string,
  caseId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("financial_entries")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("case_id", caseId)
    .is("voided_at", null)

  if (error) {
    throw new Error(`[EARNINGS] Failed to count case entries: ${error.message}`)
  }

  return count ?? 0
}
