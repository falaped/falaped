import type { SupabaseClient } from "@supabase/supabase-js"

export type CaseEarningsTotals = {
  /** Quantos lançamentos não-anulados o caso tem. */
  count: number
  /** Quanto eles somam, em centavos inteiros. A soma acontece AQUI, no servidor. */
  totalCents: number
}

/**
 * Contagem e soma dos lançamentos não-anulados de um caso — a fonte de
 * `earningsCount`/`earningsTotalCents` do diálogo de "Excluir caso" (S7).
 *
 * A soma é feita aqui em inteiros, nunca no componente: nenhuma aritmética de dinheiro
 * roda em JavaScript sobre valores formatados.
 *
 * Mesmos três filtros da guarda D-10 (`profile_id` + `case_id` + `voided_at is null`) —
 * uma linha anulada não representa dinheiro e não entra na contagem.
 */
export async function getCaseEarningsTotals(
  supabase: SupabaseClient,
  profileId: string,
  caseId: string,
): Promise<CaseEarningsTotals> {
  const { data, error } = await supabase
    .from("financial_entries")
    .select("amount_cents")
    .eq("profile_id", profileId)
    .eq("case_id", caseId)
    .is("voided_at", null)

  if (error) {
    throw new Error(`[EARNINGS] Failed to load case totals: ${error.message}`)
  }

  const rows = (data ?? []) as { amount_cents: number }[]
  return {
    count: rows.length,
    totalCents: rows.reduce((sum, row) => sum + row.amount_cents, 0),
  }
}
