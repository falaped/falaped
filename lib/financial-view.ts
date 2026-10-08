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

/** Soma a série diária de `get_earnings_summary` (já sem anulados) por mês, pela string da data. */
export function sumByMonth(byDay: { received_on: string; cents: number }[]): Record<string, number> {
  const byMonth: Record<string, number> = {}
  for (const point of byDay) {
    const ym = point.received_on.slice(0, 7)
    byMonth[ym] = (byMonth[ym] ?? 0) + point.cents
  }
  return byMonth
}

/** Meses de `from` a `to` (yyyy-MM), inclusive. */
export function monthRange(from: string, to: string): string[] {
  const months: string[] = []
  let [y, m] = from.split("-").map(Number)
  for (let guard = 0; guard < 1200; guard++) {
    const ym = `${y}-${String(m).padStart(2, "0")}`
    if (ym > to) break
    months.push(ym)
    if (++m > 12) [y, m] = [y + 1, 1]
  }
  return months
}

export type PeriodRow = { key: string; cents: number; consults: number }

/**
 * Linhas de um período (meses de um ano ou anos desde o início): recebido e consultas
 * encerradas por chave. `key` é yyyy-MM ou yyyy; um ano soma os meses com o prefixo.
 */
export function periodRows(keys: string[], centsByMonth: Record<string, number>, consultsByMonth: Record<string, number>): PeriodRow[] {
  const sum = (byMonth: Record<string, number>, key: string) =>
    Object.entries(byMonth).reduce((total, [ym, value]) => (ym.startsWith(key) ? total + value : total), 0)
  return keys.map((key) => ({ key, cents: sum(centsByMonth, key), consults: sum(consultsByMonth, key) }))
}
