import type { SupabaseClient } from "@supabase/supabase-js"
import type { EarningsSummary } from "./types"

const EMPTY: EarningsSummary = {
  today_cents: 0,
  week_cents: 0,
  month_cents: 0,
  period_cents: 0,
  attendances: 0,
  average_cents: 0,
  by_day: [],
}

/**
 * Lê os seis números do painel de Ganhos num único round-trip (EARN-03/EARN-04).
 *
 * O filtro de anulados, os buckets hoje/semana/mês e a média com arredondamento único
 * vivem DENTRO da função SQL — este módulo não filtra e não calcula nada.
 *
 * `from`/`to`/`today` são datas ISO (yyyy-mm-dd) já resolvidas no fuso da clínica pelo
 * chamador: a função SQL não converte fuso nenhum. A janela é meio-aberta `[from, to)`.
 */
export async function getEarningsSummary(
  supabase: SupabaseClient,
  profileId: string,
  from: string,
  to: string,
  today: string,
): Promise<EarningsSummary> {
  const { data, error } = await supabase.rpc("get_earnings_summary", {
    p_profile_id: profileId,
    p_from: from,
    p_to: to,
    p_today: today,
  })

  if (error) {
    throw new Error(`[EARNINGS] Failed to load summary: ${error.message}`)
  }

  return (data ?? EMPTY) as EarningsSummary
}
