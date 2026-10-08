import test from "node:test"
import assert from "node:assert/strict"

import { dailySeries, paymentSplit } from "@/lib/financial-view"

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
