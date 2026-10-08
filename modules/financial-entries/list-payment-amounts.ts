import type { SupabaseClient } from "@supabase/supabase-js"

import type { PaymentMethodInput } from "@/lib/schemas/financial-entry"

/**
 * Forma e valor dos lançamentos válidos na janela [from, to) — só o que "Como recebeu"
 * precisa nas abas Ano e Desde o início. Sem `from`, desde o primeiro lançamento.
 * @throws Error("[EARNINGS] ...") se a leitura falhar
 */
export async function listPaymentAmounts(
  supabase: SupabaseClient,
  profileId: string,
  window: { from?: string; to: string },
): Promise<{ payment_method: PaymentMethodInput; amount_cents: number; voided_at: null }[]> {
  let query = supabase
    .from("financial_entries")
    .select("payment_method, amount_cents")
    .eq("profile_id", profileId)
    .is("voided_at", null)
    .lt("received_on", window.to)
  if (window.from) query = query.gte("received_on", window.from)
  const { data, error } = await query
  if (error) throw new Error(`[EARNINGS] Failed to list payment amounts: ${error.message}`)
  return (data ?? []).map((row) => ({
    payment_method: row.payment_method as PaymentMethodInput,
    amount_cents: row.amount_cents as number,
    voided_at: null,
  }))
}
