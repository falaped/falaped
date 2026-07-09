import test from "node:test"
import assert from "node:assert/strict"

import {
  getReferenceTable,
  type GrowthIndicator,
} from "@/lib/growth-reference"
import { lmsValueAtZ } from "@/lib/lms-zscore"
import { PATIENT_SEX_VALUES } from "@/modules/patients/patient-sex"

const INDICATORS: GrowthIndicator[] = [
  "weight-for-age",
  "height-for-age",
  "bmi-for-age",
  "head-circumference-for-age",
]

// Expected age ceilings per indicator (months) — D-03 / A5.
const AGE_MAX: Record<GrowthIndicator, number> = {
  "weight-for-age": 120,
  "height-for-age": 228,
  "bmi-for-age": 228,
  "head-circumference-for-age": 60,
}

test("getReferenceTable returns non-empty rows + provenance metadata for all 8 files", () => {
  for (const indicator of INDICATORS) {
    for (const sex of PATIENT_SEX_VALUES) {
      const table = getReferenceTable("WHO", indicator, sex)
      assert.ok(table.rows.length > 0, `${indicator}/${sex} has rows`)
      assert.ok(table.source && table.source.length > 0, `${indicator}/${sex} source`)
      assert.ok(table.version && table.version.length > 0, `${indicator}/${sex} version`)
      assert.equal(table.standard, "WHO")
      assert.equal(table.sex, sex)
      assert.equal(table.indicator, indicator)
      assert.equal(table.ageUnit, "months")
      assert.equal(table.ageMin, 0)
      assert.equal(table.ageMax, AGE_MAX[indicator], `${indicator} ageMax (D-03)`)
    }
  }
})

test("every row carries ageMonths + L/M/S; months are unique and ascending", () => {
  for (const indicator of INDICATORS) {
    for (const sex of PATIENT_SEX_VALUES) {
      const table = getReferenceTable("WHO", indicator, sex)
      let prev = -1
      for (const row of table.rows) {
        assert.equal(typeof row.ageMonths, "number")
        assert.equal(typeof row.L, "number")
        assert.equal(typeof row.M, "number")
        assert.equal(typeof row.S, "number")
        assert.ok(row.M > 0, `${indicator}/${sex} M>0 at ${row.ageMonths}`)
        assert.ok(row.ageMonths > prev, `${indicator}/${sex} months ascending`)
        prev = row.ageMonths
      }
      assert.equal(table.rows[0].ageMonths, table.ageMin)
      assert.equal(table.rows[table.rows.length - 1].ageMonths, table.ageMax)
    }
  }
})

// Spot-check the ingested DATA against WHO's published median (M == P50 == lmsValueAtZ(0)).
// weight-for-age boys: month 0 M≈3.3464 kg, month 12 M≈9.6479 kg (WHO z-score table).
test("ingested weight-for-age boys medians match WHO published M", () => {
  const t = getReferenceTable("WHO", "weight-for-age", "masculino")
  const m0 = t.rows.find((r) => r.ageMonths === 0)!
  const m12 = t.rows.find((r) => r.ageMonths === 12)!
  assert.ok(Math.abs(m0.M - 3.3464) < 1e-4)
  assert.ok(Math.abs(m12.M - 9.6479) < 1e-4)
  // And P50 reproduces the published rounded median.
  assert.ok(Math.abs(lmsValueAtZ(0, m0) - 3.3) < 0.05)
})

test("unsupported standard throws a tagged error", () => {
  assert.throws(
    // @ts-expect-error intentionally passing an invalid standard
    () => getReferenceTable("INTERGROWTH", "weight-for-age", "masculino"),
    /\[GROWTH-REFERENCE\]/,
  )
})
