import type { Lms } from "@/lib/lms-zscore"
import type { PatientSex } from "@/modules/patients/patient-sex"

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

/** Reference standard family. Only WHO is ingested in this slice (Intergrowth in 03-04). */
export type GrowthStandard = "WHO"

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
 * Look up the static WHO reference table for an (indicator, sex), returning its LMS
 * rows plus the `source`/`version`/`ageMin`/`ageMax` metadata the chart must render
 * (D-03). Data is read-only, tenant-identical, versioned JSON — never a DB query.
 *
 * @param standard reference family (only `"WHO"` in this slice).
 * @param indicator one of the four growth indicators (D-02).
 * @param sex patient sex — curves are sex-specific (Pitfall 5). Caller handles null.
 */
export function getReferenceTable(
  standard: GrowthStandard,
  indicator: GrowthIndicator,
  sex: PatientSex,
): GrowthReferenceTable {
  if (standard !== "WHO") {
    throw new Error(`[GROWTH-REFERENCE] Unsupported standard: ${standard}`)
  }
  return WHO_TABLES[indicator][sex]
}
