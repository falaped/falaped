import type { PaymentMethodInput } from "@/lib/schemas/financial-entry"

/** Uma linha de `public.financial_entries` (EARN-02). Valores sempre em centavos inteiros. */
export type FinancialEntry = {
  id: string
  profile_id: string
  case_id: string | null
  description: string
  amount_cents: number
  payment_method: PaymentMethodInput
  received_on: string
  voided_at: string | null
  created_at: string
  updated_at: string
}

/**
 * O jsonb devolvido por `get_earnings_summary` (EARN-03/EARN-04).
 *
 * `today_cents`/`week_cents`/`month_cents` são relativos a `p_today` e INDEPENDENTES da
 * janela `[p_from, p_to)`. `attendances` conta atendimentos (casos distintos + avulsos),
 * não linhas. `by_day` é sempre array, nunca null.
 */
export type EarningsSummary = {
  today_cents: number
  week_cents: number
  month_cents: number
  period_cents: number
  attendances: number
  average_cents: number
  by_day: { received_on: string; cents: number }[]
}
