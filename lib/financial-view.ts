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

export type RevenueOverview = {
  /** Tudo o que já foi lançado (sem anulados). */
  allTimeCents: number
  /** yyyy-MM do primeiro recebimento; null sem nenhum. */
  since: string | null
  /** Do ano de `currentYm` até hoje. */
  yearCents: number
  /** Meses do ano contados na média: de janeiro (ou do primeiro recebimento) até o atual. */
  yearMonths: number
  /** Os 12 meses até `currentYm`, do mais antigo ao atual. */
  months: { ym: string; cents: number }[]
}

/**
 * Faturamento do ano e desde o início a partir da série diária de `get_earnings_summary`
 * (já somada e sem anulados no SQL). Aqui só se agrupa por mês, pela string da data.
 */
export function revenueOverview(byDay: { received_on: string; cents: number }[], currentYm: string): RevenueOverview {
  const byMonth = new Map<string, number>()
  for (const point of byDay) {
    const ym = point.received_on.slice(0, 7)
    byMonth.set(ym, (byMonth.get(ym) ?? 0) + point.cents)
  }
  const since = byDay.length ? byDay.reduce((first, point) => (point.received_on < first ? point.received_on : first), byDay[0].received_on).slice(0, 7) : null
  const year = currentYm.slice(0, 4)
  const [y, m] = currentYm.split("-").map(Number)
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(y, m - 12 + index, 1))
    const ym = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
    return { ym, cents: byMonth.get(ym) ?? 0 }
  })
  const firstMonthOfYear = since && since.slice(0, 4) === year ? Number(since.slice(5, 7)) : 1
  return {
    allTimeCents: [...byMonth.values()].reduce((sum, cents) => sum + cents, 0),
    since,
    yearCents: [...byMonth].filter(([ym]) => ym.startsWith(year) && ym <= currentYm).reduce((sum, [, cents]) => sum + cents, 0),
    yearMonths: since ? Math.max(1, m - firstMonthOfYear + 1) : 0,
    months,
  }
}
