import { formatBrazilianPhone, formatDate } from "@/lib/formatters"
import type { CasePatientDetail } from "@/modules/cases/get-case-by-id"
import { formatPatientSexForDisplay } from "@/modules/patients/patient-sex"

const EMPTY_SECTION = "Sem informação registrada."

function pushLine(
  lines: string[],
  label: string,
  value: string | null | undefined,
): void {
  const trimmed = value?.trim()
  if (!trimmed) return
  lines.push(`${label}: ${trimmed}`)
}

/** App forms store weight as numeric text (kg); append unit if missing. */
function formatClinicalWeightDisplay(raw: string | null | undefined): string | null {
  const t = raw?.trim()
  if (!t) return null
  if (/kg|kilograma|grama(s)?\b/i.test(t)) return t
  if (/\d\s*g\b/i.test(t)) return t
  return `${t} kg`
}

/** App forms store height and head circumference in cm; append unit if missing. */
function formatClinicalLengthCmDisplay(raw: string | null | undefined): string | null {
  const t = raw?.trim()
  if (!t) return null
  if (
    /\b(cm|mm|m|centímetros?|centimetros?|milímetros?|metros?)\b/i.test(t) ||
    /cm$/i.test(t) ||
    /mm$/i.test(t) ||
    /m$/i.test(t)
  ) {
    return t
  }
  return `${t} cm`
}

/**
 * Plain text for the "Dados do paciente" fixed section (identity + contact only).
 */
export function formatPatientIdentitySectionContent(
  patient: CasePatientDetail | null,
): string {
  if (!patient) {
    return EMPTY_SECTION
  }
  const lines: string[] = []
  pushLine(lines, "Nome", patient.name)
  if (patient.birth_date) {
    pushLine(lines, "Data de nascimento", formatDate(patient.birth_date))
  }
  pushLine(lines, "Responsável", patient.responsible)
  const digits = patient.contact_phone?.replace(/\D/g, "") ?? ""
  const phoneDisplay = digits ? formatBrazilianPhone(digits) : null
  pushLine(lines, "Telefone de contato", phoneDisplay ?? patient.contact_phone)

  return lines.length > 0 ? lines.join("\n") : EMPTY_SECTION
}

/**
 * Plain text for the "Dados clínicos do paciente" fixed section.
 */
export function formatPatientClinicalSectionContent(
  patient: CasePatientDetail | null,
): string {
  if (!patient) {
    return EMPTY_SECTION
  }
  const lines: string[] = []
  pushLine(lines, "Sexo", formatPatientSexForDisplay(patient.sex) || null)
  pushLine(lines, "Responsável legal", patient.legal_guardian)
  pushLine(lines, "Tipo sanguíneo", patient.blood_type)
  const weightDisplay = formatClinicalWeightDisplay(patient.weight)
  if (weightDisplay) lines.push(`Peso: ${weightDisplay}`)
  const heightDisplay = formatClinicalLengthCmDisplay(patient.height)
  if (heightDisplay) lines.push(`Altura: ${heightDisplay}`)
  const pcDisplay = formatClinicalLengthCmDisplay(patient.head_circumference)
  if (pcDisplay) lines.push(`Perímetro cefálico: ${pcDisplay}`)
  pushLine(lines, "Alergias", patient.allergies)
  pushLine(lines, "Medicamentos em uso", patient.current_medications)
  pushLine(lines, "Histórico médico", patient.medical_history)

  return lines.length > 0 ? lines.join("\n") : EMPTY_SECTION
}
