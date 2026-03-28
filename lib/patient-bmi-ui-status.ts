import { computePediatricBmi } from "@/lib/parse-anthropometrics-for-bmi"
import { formatPtDecimal } from "@/modules/falaped-assistant/lib/formatters"
import {
  normalizePatientHeightToCm,
  parseNumericValue,
} from "@/modules/falaped-assistant/lib/patient-profile-parsers"
import type { Patient } from "@/modules/patients/types"

export type PatientBmiUiStatus = "good" | "warn" | "bad"

export type PatientChartBmiPresentation =
  | { kind: "none" }
  | { kind: "invalid"; message: string }
  | { kind: "value"; label: string; numeric: number; status: PatientBmiUiStatus }

function getAgeInMonthsFromBirthDate(birthDate: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(`${birthDate}T12:00:00`)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (now.getDate() < birth.getDate()) months -= 1
  return Math.max(0, months)
}

/**
 * Simplified pediatric IMC bands by age (months) for UI-only hints — not a clinical diagnosis.
 */
function classifyBmiByAge(bmi: number, ageMonths: number | null): PatientBmiUiStatus {
  if (ageMonths == null) {
    if (bmi < 14 || bmi > 30) return "bad"
    if (bmi < 16 || bmi > 26) return "warn"
    return "good"
  }

  if (ageMonths < 24) {
    if (bmi < 12 || bmi > 24) return "bad"
    if (bmi < 13.5 || bmi > 21) return "warn"
    return "good"
  }

  if (ageMonths < 60) {
    if (bmi < 13 || bmi > 22) return "bad"
    if (bmi < 14 || bmi > 19) return "warn"
    return "good"
  }

  if (bmi < 14 || bmi > 30) return "bad"
  if (bmi < 16 || bmi > 25) return "warn"
  return "good"
}

/**
 * BMI display for the patient chart: formatted value, invalid reason, or none.
 */
export function getPatientChartBmiPresentation(patient: Patient): PatientChartBmiPresentation {
  const weightKg = patient.weight ? parseNumericValue(patient.weight) : null
  const heightCm = patient.height ? normalizePatientHeightToCm(patient.height) : null
  if (weightKg == null || heightCm == null) return { kind: "none" }

  const result = computePediatricBmi(weightKg, heightCm / 100)
  if (!result.ok) {
    return { kind: "invalid", message: result.reason }
  }

  const ageMonths = getAgeInMonthsFromBirthDate(patient.birth_date)
  const status = classifyBmiByAge(result.bmi, ageMonths)
  return {
    kind: "value",
    label: formatPtDecimal(result.bmi, 1),
    numeric: result.bmi,
    status,
  }
}
