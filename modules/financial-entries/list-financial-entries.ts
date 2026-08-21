import type { SupabaseClient } from "@supabase/supabase-js"

import type { FinancialEntry } from "@/modules/financial-entries/types"

/** Uma linha do livro-caixa mais o rótulo do caso, pronto para a tabela. */
export type FinancialEntryListRow = FinancialEntry & {
  /** Nome do paciente (ou do responsável) do caso. `null` no lançamento avulso. */
  case_label: string | null
}

export type ListFinancialEntriesOptions = {
  /** Início da janela, inclusivo (`yyyy-MM-dd`). */
  from?: string
  /** Fim da janela, EXCLUSIVO (`yyyy-MM-dd`) — igual à janela da função SQL. */
  to?: string
  /** Restringe a um caso. */
  caseId?: string
  /** Somente quando explicitamente verdadeiro as linhas anuladas vêm. */
  includeVoided?: boolean
}

type RawRow = FinancialEntry & {
  case_ref: { id: string; patient: { name: string | null } | null } | null
}

/**
 * Lista os lançamentos do livro-caixa de um perfil (EARN-03/EARN-05).
 *
 * ⚠️ **Nenhum total sai daqui.** Os seis escalares do painel e a série diária vêm de
 * `get_earnings_summary`, numa chamada só. Este módulo não soma, não divide e não
 * calcula média — ele lista linhas. Somar as linhas em JavaScript para exibir um total
 * é o caminho pelo qual a tela passa a divergir do banco (T-10-38).
 *
 * **O default é seguro (D-21):** sem `includeVoided`, as linhas anuladas não vêm. Toda
 * tela que apenas lista lançamentos herda o comportamento correto sem pedir por ele; só
 * quem quer auditoria pede explicitamente. Travado por spec.
 *
 * A ordenação (data de recebimento, desempatada pela data de criação) é ESPECIFICADA,
 * não incidental: é ela que faz as linhas anuladas aparecerem intercaladas na ordem de
 * data quando o filtro está ligado, em vez de empilhadas no fim. Ordenar vive no SQL.
 *
 * O join do caso serve ao rótulo de exibição e é a segunda camada contra um `case_id`
 * plantado: a RLS de `public.cases` nega linha alheia nesse join.
 */
export async function listFinancialEntries(
  supabase: SupabaseClient,
  profileId: string,
  opts: ListFinancialEntriesOptions = {},
): Promise<FinancialEntryListRow[]> {
  let query = supabase
    .from("financial_entries")
    .select(
      `
      id,
      profile_id,
      case_id,
      description,
      amount_cents,
      payment_method,
      received_on,
      voided_at,
      created_at,
      updated_at,
      case_ref:cases(id, patient:patients(name))
    `,
    )
    .eq("profile_id", profileId)

  if (opts.from) query = query.gte("received_on", opts.from)
  if (opts.to) query = query.lt("received_on", opts.to)
  if (opts.caseId) query = query.eq("case_id", opts.caseId)
  if (!opts.includeVoided) query = query.is("voided_at", null)

  const { data, error } = await query
    .order("received_on", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(`[EARNINGS] Failed to list entries: ${error.message}`)
  }

  const rows = (data ?? []) as unknown as RawRow[]
  return rows.map(({ case_ref, ...row }) => ({
    ...row,
    case_label: case_ref?.patient?.name ?? null,
  }))
}
