import type { PaymentMethodInput } from "@/lib/schemas/financial-entry"

/** Quanto entrou por forma de pagamento (sem anulados), da maior para a menor, com a fatia em %. */
export function paymentSplit(
  entries: { payment_method: PaymentMethodInput; amount_cents: number; voided_at: string | null }[],
): { method: PaymentMethodInput; cents: number; percent: number }[] {
  const byMethod = new Map<PaymentMethodInput, number>()
  for (const entry of entries) {
    if (entry.voided_at) continue
    byMethod.set(entry.payment_method, (byMethod.get(entry.payment_method) ?? 0) + entry.amount_cents)
  }
  const total = [...byMethod.values()].reduce((sum, cents) => sum + cents, 0)
  return [...byMethod]
    .sort((a, b) => b[1] - a[1])
    .map(([method, cents]) => ({ method, cents, percent: total ? Math.round((cents / total) * 100) : 0 }))
}

/**
 * Um ponto por dia do mês, de 1 até `lastDay` (hoje no mês atual, o último dia num mês
 * passado), com zero nos dias sem recebimento. O dia sai da string, sem construir data.
 */
export function dailySeries(byDay: { received_on: string; cents: number }[], lastDay: number): { day: number; cents: number }[] {
  const cents = new Map(byDay.map((point) => [Number(point.received_on.slice(8, 10)), point.cents]))
  return Array.from({ length: lastDay }, (_, index) => ({ day: index + 1, cents: cents.get(index + 1) ?? 0 }))
}
