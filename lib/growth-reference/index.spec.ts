import test from "node:test"
import assert from "node:assert/strict"

import {
  getReferenceTable,
  hasIntergrowthTable,
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

// --- INTERGROWTH-21st preterm/newborn tables (03-04) ---

const IG_INDICATORS: GrowthIndicator[] = [
  "weight-for-age",
  "height-for-age",
  "head-circumference-for-age",
]

test("getReferenceTable('intergrowth', ...) returns rows + provenance metadata", () => {
  for (const indicator of IG_INDICATORS) {
    for (const sex of PATIENT_SEX_VALUES) {
      const table = getReferenceTable("intergrowth", indicator, sex)
      assert.ok(table.rows.length > 0, `${indicator}/${sex} has rows`)
      assert.ok(table.source && table.source.length > 0, `${indicator}/${sex} source`)
      assert.ok(table.version && table.version.length > 0, `${indicator}/${sex} version`)
      assert.equal(table.standard, "intergrowth")
      assert.equal(table.sex, sex)
      assert.equal(table.indicator, indicator)
      assert.equal(table.ageUnit, "months")
      // Preterm/newborn period spans negative corrected months (before term) up
      // through ~5.5 months (PMA 27–64 weeks). ageMin/ageMax come from the file.
      assert.ok(table.ageMin < 0, `${indicator}/${sex} ageMin < 0 (pre-term)`)
      assert.ok(table.ageMax > 0, `${indicator}/${sex} ageMax > 0 (post-term)`)
      assert.equal(table.rows[0].ageMonths, table.ageMin)
      assert.equal(table.rows[table.rows.length - 1].ageMonths, table.ageMax)
    }
  }
})

test("BMI has no INTERGROWTH table — hasIntergrowthTable false + lookup throws", () => {
  assert.equal(hasIntergrowthTable("bmi-for-age"), false)
  assert.equal(hasIntergrowthTable("weight-for-age"), true)
  assert.throws(
    () => getReferenceTable("intergrowth", "bmi-for-age", "masculino"),
    /\[GROWTH-REFERENCE\]/,
  )
})

// Spot-check the ingested DATA against INTERGROWTH's published z-score table
// (Villar et al. Lancet Glob Health 2015; intergrowth21.com preterm z-score PDFs).
// Weight boys at PMA 40 weeks (corrected age 0 months): published values are
// z=-2 → 2.59 kg, z=0 (P50/median) → 3.43 kg, z=+2 → 4.54 kg.
test("ingested INTERGROWTH weight boys at term reproduces published z-scores", () => {
  const t = getReferenceTable("intergrowth", "weight-for-age", "masculino")
  const term = t.rows.find((r) => r.ageMonths === 0)
  assert.ok(term, "corrected age 0 (PMA 40 weeks) row exists")
  // P50 == M == published median (Pitfall 3): lmsValueAtZ(0) must equal source M.
  assert.equal(lmsValueAtZ(0, term!), term!.M)
  assert.ok(Math.abs(term!.M - 3.43) < 1e-9, "M equals published z=0 value 3.43")
  // Cross-check the published ±2 SD values within rounding (0.01 kg precision).
  assert.ok(Math.abs(lmsValueAtZ(-2, term!) - 2.59) < 0.02, "z=-2 ≈ 2.59 kg")
  assert.ok(Math.abs(lmsValueAtZ(2, term!) - 4.54) < 0.02, "z=+2 ≈ 4.54 kg")
})

// Length boys at PMA 40 (corrected 0): published z=0 → 50.9 cm, z=-2 → 47.3, z=+2 → 54.8.
test("ingested INTERGROWTH length boys at term reproduces published z-scores", () => {
  const t = getReferenceTable("intergrowth", "height-for-age", "masculino")
  const term = t.rows.find((r) => r.ageMonths === 0)!
  assert.equal(lmsValueAtZ(0, term), term.M)
  assert.ok(Math.abs(term.M - 50.9) < 1e-9, "M equals published z=0 value 50.9 cm")
  assert.ok(Math.abs(lmsValueAtZ(-2, term) - 47.3) < 0.15, "z=-2 ≈ 47.3 cm")
  assert.ok(Math.abs(lmsValueAtZ(2, term) - 54.8) < 0.15, "z=+2 ≈ 54.8 cm")
})
