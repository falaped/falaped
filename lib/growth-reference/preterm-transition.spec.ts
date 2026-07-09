import test from "node:test"
import assert from "node:assert/strict"

import { resolveReferenceStandard } from "@/lib/growth-reference/preterm-transition"

test("preterm before corrected term → intergrowth (RESEARCH A1)", () => {
  assert.equal(
    resolveReferenceStandard({ gestationalAgeWeeks: 32, correctedAgeMonths: -1 }),
    "intergrowth",
  )
})

test("preterm from corrected term onward → WHO (RESEARCH A1)", () => {
  assert.equal(
    resolveReferenceStandard({ gestationalAgeWeeks: 32, correctedAgeMonths: 2 }),
    "WHO",
  )
})

test("preterm exactly at corrected term (0 months) → WHO", () => {
  assert.equal(
    resolveReferenceStandard({ gestationalAgeWeeks: 32, correctedAgeMonths: 0 }),
    "WHO",
  )
})

test("full-term (>= 37 weeks) → always WHO, even before term-equivalent", () => {
  assert.equal(
    resolveReferenceStandard({ gestationalAgeWeeks: 39, correctedAgeMonths: -1 }),
    "WHO",
  )
})

test("unknown gestational age → treated as full-term (WHO)", () => {
  assert.equal(
    resolveReferenceStandard({ gestationalAgeWeeks: null, correctedAgeMonths: -1 }),
    "WHO",
  )
  assert.equal(
    resolveReferenceStandard({ gestationalAgeWeeks: undefined, correctedAgeMonths: -1 }),
    "WHO",
  )
})
