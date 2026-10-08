import test from "node:test"
import assert from "node:assert/strict"

import { dailySeries, paymentSplit, revenueOverview } from "@/lib/financial-view"

test("formas de pagamento: soma sem anulados, maior primeiro", () => {
  const split = paymentSplit([
    { payment_method: "pix", amount_cents: 35000, voided_at: null },
    { payment_method: "card", amount_cents: 15000, voided_at: null },
    { payment_method: "pix", amount_cents: 35000, voided_at: "2026-10-06T10:00:00Z" },
  ])
  assert.deepEqual(split, [
    { method: "pix", cents: 35000, percent: 70 },
    { method: "card", cents: 15000, percent: 30 },
  ])
  assert.deepEqual(paymentSplit([]), [])
})

test("série diária: zero nos dias vazios, até o último dia pedido", () => {
  assert.deepEqual(dailySeries([{ received_on: "2026-10-02", cents: 700 }], 3), [
    { day: 1, cents: 0 },
    { day: 2, cents: 700 },
    { day: 3, cents: 0 },
  ])
})

test("faturamento: ano, desde o início e 12 meses", () => {
  const overview = revenueOverview(
    [
      { received_on: "2025-11-03", cents: 1000 },
      { received_on: "2026-03-10", cents: 2000 },
      { received_on: "2026-03-11", cents: 500 },
      { received_on: "2026-10-07", cents: 3000 },
    ],
    "2026-10",
  )
  assert.equal(overview.allTimeCents, 6500)
  assert.equal(overview.since, "2025-11")
  assert.equal(overview.yearCents, 5500)
  assert.equal(overview.yearMonths, 10)
  assert.equal(overview.months.length, 12)
  assert.deepEqual(overview.months[0], { ym: "2025-11", cents: 1000 })
  assert.deepEqual(overview.months[4], { ym: "2026-03", cents: 2500 })
  assert.deepEqual(overview.months[11], { ym: "2026-10", cents: 3000 })
  // Começou no meio do ano: a média conta a partir do primeiro mês.
  assert.equal(revenueOverview([{ received_on: "2026-08-01", cents: 100 }], "2026-10").yearMonths, 3)
  assert.equal(revenueOverview([], "2026-10").since, null)
})
