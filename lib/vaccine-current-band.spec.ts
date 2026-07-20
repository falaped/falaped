import test from "node:test"
import assert from "node:assert/strict"

import { computeCurrentMonths } from "@/lib/vaccine-current-band"
import type { PediatricAge } from "@/lib/compute-pediatric-age"

const ok = (totalMonths: number): PediatricAge => ({
  status: "ok",
  totalMonths,
})

// ── computeCurrentMonths: only "ok" yields a number (D-02) ────────────────────

test("missing_birth_date → null", () => {
  assert.equal(computeCurrentMonths({ status: "missing_birth_date" }), null)
})

test("invalid → null", () => {
  assert.equal(computeCurrentMonths({ status: "invalid" }), null)
})

test("future → null", () => {
  assert.equal(computeCurrentMonths({ status: "future" }), null)
})

test("ok with totalMonths 0 → 0", () => {
  assert.equal(computeCurrentMonths(ok(0)), 0)
})

test("ok with totalMonths 2 (weeks-band 2-month-old) → 2 (NOT 0)", () => {
  // The engine's days/weeks bands do not populate parts.months; the chronological
  // totalMonths is the source of truth so a real 2-month-old maps to "2 meses".
  assert.equal(computeCurrentMonths(ok(2)), 2)
})

test("ok with totalMonths 6 → 6 (regression: NOT 5)", () => {
  assert.equal(computeCurrentMonths(ok(6)), 6)
})

test("ok with totalMonths 14 → 14", () => {
  assert.equal(computeCurrentMonths(ok(14)), 14)
})

test("ok with undefined totalMonths → null (defensive)", () => {
  assert.equal(computeCurrentMonths({ status: "ok" }), null)
})

// ── Preterm: vaccine positioning uses CHRONOLOGICAL months (corrected ignored) ─

test("preterm: chronological totalMonths wins, corrected ignored", () => {
  const age: PediatricAge = {
    status: "ok",
    totalMonths: 12,
    corrected: {
      band: "weeks",
      parts: {},
      appliesUntilMonths: 24,
      totalDays: 35,
    },
  }
  assert.equal(computeCurrentMonths(age), 12)
})
