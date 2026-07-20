import test from "node:test"
import assert from "node:assert/strict"

import {
  CANONICAL_VACCINE_BANDS,
  bandForItemMonths,
  resolveBandForMonths,
} from "@/lib/vaccine-bands"

// ── CANONICAL_VACCINE_BANDS: the 11 physician-locked bands, fixed order ───────

test("exposes the 11 canonical bands in the locked order and starts", () => {
  assert.deepEqual(
    CANONICAL_VACCINE_BANDS.map((b) => [b.label, b.startMonths]),
    [
      ["Ao nascer", 0],
      ["2 meses", 2],
      ["3 meses", 3],
      ["4 meses", 4],
      ["5 meses", 5],
      ["6 meses", 6],
      ["7 meses", 7],
      ["9 meses", 9],
      ["12 a 18 meses", 12],
      ["4 a 6 anos", 48],
      ["7 a 14 anos", 84],
    ],
  )
})

// ── resolveBandForMonths: "faixa anterior" (greatest start <= months) ─────────

const label = (months: number | null) => resolveBandForMonths(months)?.label ?? null

test("resolveBandForMonths covers every boundary", () => {
  assert.equal(label(0), "Ao nascer")
  assert.equal(label(1), "Ao nascer")
  assert.equal(label(2), "2 meses")
  assert.equal(label(6), "6 meses") // regression: NOT "5 meses"
  assert.equal(label(8), "7 meses")
  assert.equal(label(9), "9 meses")
  assert.equal(label(11), "9 meses")
  assert.equal(label(12), "12 a 18 meses")
  assert.equal(label(18), "12 a 18 meses")
  assert.equal(label(26), "12 a 18 meses")
  assert.equal(label(47), "12 a 18 meses")
  assert.equal(label(48), "4 a 6 anos")
  assert.equal(label(83), "4 a 6 anos")
  assert.equal(label(84), "7 a 14 anos")
  assert.equal(label(168), "7 a 14 anos")
  assert.equal(label(200), "7 a 14 anos")
})

test("resolveBandForMonths(null) → null", () => {
  assert.equal(resolveBandForMonths(null), null)
})

test("resolveBandForMonths below 0 → null", () => {
  assert.equal(resolveBandForMonths(-1), null)
})

// ── bandForItemMonths: same rule, reused for item age_months mapping ──────────

test("bandForItemMonths maps a vaccine item's age_months to its band", () => {
  assert.equal(bandForItemMonths(0)?.label, "Ao nascer")
  assert.equal(bandForItemMonths(12)?.label, "12 a 18 meses")
  assert.equal(bandForItemMonths(null), null)
})
