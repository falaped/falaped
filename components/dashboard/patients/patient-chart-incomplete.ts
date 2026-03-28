import type { Patient } from "@/modules/patients/types"

/**
 * True when key pediatric chart fields are missing (contact / guardian / age context).
 */
export function isPatientChartIncomplete(patient: Patient): boolean {
  return (
    !patient.birth_date ||
    !patient.contact_phone?.trim() ||
    !patient.responsible?.trim()
  )
}
