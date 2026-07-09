import type { Lms } from "@/lib/lms-zscore"
import type { PatientSex } from "@/modules/patients/patient-sex"

import headCircumferenceNewbornBoys from "./intergrowth/head-circumference-newborn-boys.json"
import headCircumferenceNewbornGirls from "./intergrowth/head-circumference-newborn-girls.json"
import lengthNewbornBoys from "./intergrowth/length-newborn-boys.json"
import lengthNewbornGirls from "./intergrowth/length-newborn-girls.json"
import weightNewbornBoys from "./intergrowth/weight-newborn-boys.json"
import weightNewbornGirls from "./intergrowth/weight-newborn-girls.json"
import bmiForAgeBoys from "./who/bmi-for-age-boys.json"
import bmiForAgeGirls from "./who/bmi-for-age-girls.json"
import headCircumferenceForAgeBoys from "./who/head-circumference-for-age-boys.json"
import headCircumferenceForAgeGirls from "./who/head-circumference-for-age-girls.json"
import heightForAgeBoys from "./who/height-for-age-boys.json"
import heightForAgeGirls from "./who/height-for-age-girls.json"
import weightForAgeBoys from "./who/weight-for-age-boys.json"
import weightForAgeGirls from "./who/weight-for-age-girls.json"

/** The four sex-specific growth indicators plotted per age (D-02). */
export type GrowthIndicator =
  | "weight-for-age"
  | "height-for-age"
  | "bmi-for-age"
  | "head-circumference-for-age"

/**
 * Reference standard family:
 * - `"WHO"` — WHO Child Growth Standards / Growth Reference (03-02).
 * - `"intergrowth"` — INTERGROWTH-21st preterm/newborn period, used before the
 *   corrected term and then handed off to WHO (D-01 / D-04; see preterm-transition).
 */
export type GrowthStandard = "WHO" | "intergrowth"

/** One reference row: LMS parameters at a given age in months. */
export type GrowthReferenceRow = Lms & { ageMonths: number }

/**
 * A full reference table plus the provenance metadata the UI MUST display
 * (D-03: source + covered age range visible on-screen).
 */
export type GrowthReferenceTable = {
  source: string
  standard: GrowthStandard
  sex: PatientSex
  indicator: GrowthIndicator
  ageUnit: "months"
  ageMin: number
  ageMax: number
  version: string
  rows: GrowthReferenceRow[]
}

const WHO_TABLES: Record<
  GrowthIndicator,
  Record<PatientSex, GrowthReferenceTable>
> = {
  "weight-for-age": {
    masculino: weightForAgeBoys as GrowthReferenceTable,
    feminino: weightForAgeGirls as GrowthReferenceTable,
  },
  "height-for-age": {
    masculino: heightForAgeBoys as GrowthReferenceTable,
    feminino: heightForAgeGirls as GrowthReferenceTable,
  },
  "bmi-for-age": {
    masculino: bmiForAgeBoys as GrowthReferenceTable,
    feminino: bmiForAgeGirls as GrowthReferenceTable,
  },
  "head-circumference-for-age": {
    masculino: headCircumferenceForAgeBoys as GrowthReferenceTable,
    feminino: headCircumferenceForAgeGirls as GrowthReferenceTable,
  },
}

/**
 * INTERGROWTH-21st preterm/newborn tables. Only weight, length (→ height-for-age)
 * and head circumference are INTERGROWTH standards for this period — BMI is not,
 * so `bmi-for-age` is intentionally absent and stays WHO-only (D-04). Indexed by
 * corrected age in months (PMA − 40 weeks), so rows span negative months pre-term.
 */
const INTERGROWTH_TABLES: Partial<
  Record<GrowthIndicator, Record<PatientSex, GrowthReferenceTable>>
> = {
  "weight-for-age": {
    masculino: weightNewbornBoys as GrowthReferenceTable,
    feminino: weightNewbornGirls as GrowthReferenceTable,
  },
  "height-for-age": {
    masculino: lengthNewbornBoys as GrowthReferenceTable,
    feminino: lengthNewbornGirls as GrowthReferenceTable,
  },
  "head-circumference-for-age": {
    masculino: headCircumferenceNewbornBoys as GrowthReferenceTable,
    feminino: headCircumferenceNewbornGirls as GrowthReferenceTable,
  },
}

/**
 * Whether the INTERGROWTH-21st preterm standard covers an indicator. BMI has no
 * INTERGROWTH newborn table, so the chart keeps it WHO-only (D-04).
 */
export function hasIntergrowthTable(indicator: GrowthIndicator): boolean {
  return INTERGROWTH_TABLES[indicator] != null
}

/**
 * Look up the static reference table for a (standard, indicator, sex), returning its
 * LMS rows plus the `source`/`version`/`ageMin`/`ageMax` metadata the chart must
 * render (D-03). Data is read-only, tenant-identical, versioned JSON — never a DB
 * query. Both standards resolve through this one function (no forked lookup).
 *
 * @param standard reference family — `"WHO"` (03-02) or `"intergrowth"` (03-04).
 * @param indicator one of the four growth indicators (D-02). INTERGROWTH covers all
 *   but `bmi-for-age`; requesting BMI for `"intergrowth"` throws.
 * @param sex patient sex — curves are sex-specific (Pitfall 5). Caller handles null.
 */
export function getReferenceTable(
  standard: GrowthStandard,
  indicator: GrowthIndicator,
  sex: PatientSex,
): GrowthReferenceTable {
  if (standard === "WHO") {
    return WHO_TABLES[indicator][sex]
  }
  if (standard === "intergrowth") {
    const byIndicator = INTERGROWTH_TABLES[indicator]
    if (byIndicator == null) {
      throw new Error(
        `[GROWTH-REFERENCE] No INTERGROWTH-21st table for indicator: ${indicator}`,
      )
    }
    return byIndicator[sex]
  }
  throw new Error(`[GROWTH-REFERENCE] Unsupported standard: ${standard}`)
}
