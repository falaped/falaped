/**
 * Canonical patient sex stored in DB (`public.patient_sex` enum) and used in app logic.
 * Keys: lowercase Portuguese; UI labels: Masculino / Feminino.
 */
export const PATIENT_SEX_VALUES = ["masculino", "feminino"] as const

export type PatientSex = (typeof PATIENT_SEX_VALUES)[number]

export const PATIENT_SEX_LABELS: Record<PatientSex, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
}

export const PATIENT_SEX_FORM_OPTIONS: { value: PatientSex; label: string }[] =
  PATIENT_SEX_VALUES.map((value) => ({
    value,
    label: PATIENT_SEX_LABELS[value],
  }))

export function isPatientSex(value: string): value is PatientSex {
  return (PATIENT_SEX_VALUES as readonly string[]).includes(value)
}

/**
 * Maps legacy or noisy values (M, F, male, Masculino, etc.) to the DB enum key, or null.
 */
export function normalizePatientSexFromDb(
  raw: string | null | undefined,
): PatientSex | null {
  if (raw == null) return null
  const trimmed = raw.trim()
  if (trimmed === "") return null
  const lower = trimmed.toLowerCase()
  if (lower === "masculino" || lower === "m" || lower === "male") {
    return "masculino"
  }
  if (lower === "feminino" || lower === "f" || lower === "female") {
    return "feminino"
  }
  if (trimmed === "Masculino") return "masculino"
  if (trimmed === "Feminino") return "feminino"
  return null
}

/** PT-BR label for dashboard / assistant replies; empty if unknown. */
export function formatPatientSexForDisplay(
  raw: string | null | undefined,
): string {
  const key = normalizePatientSexFromDb(raw)
  return key ? PATIENT_SEX_LABELS[key] : ""
}
