import test from "node:test"
import assert from "node:assert/strict"

import { dailySeries, monthRange, paymentSplit, periodRows, sumByMonth } from "@/lib/financial-view"

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

test("períodos: soma por mês, intervalo de meses e linhas por mês ou ano", () => {
  const byMonth = sumByMonth([
    { received_on: "2025-11-03", cents: 1000 },
    { received_on: "2026-03-10", cents: 2000 },
    { received_on: "2026-03-11", cents: 500 },
  ])
  assert.deepEqual(byMonth, { "2025-11": 1000, "2026-03": 2500 })
  assert.deepEqual(monthRange("2025-11", "2026-02"), ["2025-11", "2025-12", "2026-01", "2026-02"])
  assert.deepEqual(monthRange("2026-03", "2026-02"), [])
  const consults = { "2025-11": 2, "2026-03": 5 }
  assert.deepEqual(periodRows(["2026-03"], byMonth, consults), [{ key: "2026-03", cents: 2500, consults: 5 }])
  assert.deepEqual(periodRows(["2025", "2026"], byMonth, consults), [
    { key: "2025", cents: 1000, consults: 2 },
    { key: "2026", cents: 2500, consults: 5 },
  ])
})
