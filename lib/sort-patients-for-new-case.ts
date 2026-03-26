import type { Patient } from "@/modules/patients/types"

/**
 * Sorts patients for the "Novo caso" picker: those with an active case first, then by name (A–Z, pt-BR).
 */
export function sortPatientsForNewCase(
  patients: Patient[],
  activePatientIds: ReadonlySet<string>,
): Patient[] {
  return [...patients].sort((a, b) => {
    const aActive = activePatientIds.has(a.id)
    const bActive = activePatientIds.has(b.id)
    if (aActive !== bActive) {
      return aActive ? -1 : 1
    }
    return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
  })
}
