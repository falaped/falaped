import type { Patient } from "@/modules/patients/types"

import { getPatientChartBmiPresentation } from "@/lib/patient-bmi-ui-status"

/**
 * Returns a display BMI string (pt-BR decimal) when weight + height allow a plausible pediatric IMC.
 */
export function getPatientChartBmiLabel(patient: Patient): string | null {
  const presentation = getPatientChartBmiPresentation(patient)
  if (presentation.kind !== "value") return null
  return presentation.label
}
