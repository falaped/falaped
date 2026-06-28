import type { PatientProfileSnapshot } from "@/modules/falaped-assistant/contracts/assistant-types"
import {
  formatPatientSexForDisplay,
  normalizePatientSexFromDb,
} from "@/modules/patients/patient-sex"
import { computePediatricBmi } from "@/lib/parse-anthropometrics-for-bmi"
import { parseNumericValue } from "@/modules/falaped-assistant/lib/patient-profile-parsers"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { formatPediatricAge } from "@/lib/format-pediatric-age"

/**
 * Thin adapter over the shared pediatric-age engine (single source of truth —
 * Pitfall 5). Returns the by-extenso chronological age, or null on a
 * missing/invalid/future birth date so the `- Idade:` assistant line is omitted.
 * No inline date math here — the engine + formatter own the bands and wording.
 */
export function formatAgeFromBirthDate(birthDate: string | null | undefined): string | null {
  const age = computePediatricAge(birthDate)
  if (age.status !== "ok") return null
  const text = formatPediatricAge(age)
  return text === "" ? null : text
}

export function formatPtDecimal(value: number, fractionDigits = 1): string {
  return value.toFixed(fractionDigits).replace(".", ",")
}

export function formatBmiConfirmationReply(params: {
  bmiValue: string
  weightValue: string | null
  heightValue: string | null
}): string {
  const weightNumber = params.weightValue ? parseNumericValue(params.weightValue) : null
  const heightNumber = params.heightValue ? parseNumericValue(params.heightValue) : null
  const weightText = weightNumber != null ? `${weightNumber.toFixed(3).replace(/\.?0+$/, "")} kg` : null
  const heightText = heightNumber != null ? `${heightNumber.toFixed(1)} cm` : null

  if (weightText && heightText) {
    return `IMC confirmado: ${params.bmiValue}. Mantive o registro com peso ${weightText} e comprimento/altura ${heightText}.`
  }
  return `IMC confirmado: ${params.bmiValue}.`
}

export function buildAnthropometrySummaryLine(params: {
  weightKg: number | null
  heightM: number | null
}): string | null {
  if (params.weightKg == null && params.heightM == null) return null
  const parts: string[] = []
  if (params.weightKg != null) {
    parts.push(`peso ${params.weightKg.toFixed(3).replace(/\.?0+$/, "")} kg`)
  }
  if (params.heightM != null) {
    parts.push(`comprimento ${formatPtDecimal(params.heightM * 100, 1)} cm`)
  }
  if (params.weightKg != null && params.heightM != null) {
    const bmiResult = computePediatricBmi(params.weightKg, params.heightM)
    if (bmiResult.ok) {
      parts.push(`IMC ≈ ${formatPtDecimal(bmiResult.bmi, 1)}`)
    }
  }
  return `• Dados antropométricos: ${parts.join(", ")}.`
}

export function buildPatientDataAccessReply(
  patientProfile: PatientProfileSnapshot | undefined,
): string {
  if (!patientProfile) {
    return "Ainda não há paciente associado a este caso. Quando houver vínculo, eu consigo mostrar os dados clínicos disponíveis no cadastro."
  }

  const lines: string[] = ["Tenho acesso aos seguintes dados do paciente neste caso:"]
  lines.push(`- Nome: ${patientProfile.name?.trim() || "não informado"}`)
  const ageText = formatAgeFromBirthDate(patientProfile.birth_date)
  if (ageText) lines.push(`- Idade: ${ageText}`)
  if (patientProfile.weight?.trim()) lines.push(`- Peso: ${patientProfile.weight.trim()}`)
  if (patientProfile.height?.trim()) {
    lines.push(`- Comprimento/altura: ${patientProfile.height.trim()}`)
  }
  if (patientProfile.head_circumference?.trim()) {
    lines.push(`- Perímetro cefálico: ${patientProfile.head_circumference.trim()}`)
  }
  {
    const sexLine = formatPatientSexForDisplay(patientProfile.sex)
    if (sexLine) lines.push(`- Sexo: ${sexLine}`)
  }
  if (patientProfile.blood_type?.trim()) {
    lines.push(`- Tipo sanguíneo: ${patientProfile.blood_type.trim()}`)
  }
  if (patientProfile.responsible?.trim()) {
    lines.push(`- Responsável: ${patientProfile.responsible.trim()}`)
  }
  if (patientProfile.contact_phone?.trim()) {
    lines.push(`- Telefone de contato: ${patientProfile.contact_phone.trim()}`)
  }
  if (patientProfile.legal_guardian?.trim()) {
    lines.push(`- Responsável legal: ${patientProfile.legal_guardian.trim()}`)
  }
  if (patientProfile.allergies?.trim()) lines.push(`- Alergias: ${patientProfile.allergies.trim()}`)
  if (patientProfile.current_medications?.trim()) {
    lines.push(`- Medicações em uso: ${patientProfile.current_medications.trim()}`)
  }
  if (patientProfile.medical_history?.trim()) {
    lines.push(`- Histórico médico: ${patientProfile.medical_history.trim()}`)
  }

  return lines.join("\n")
}

export function buildPatientGrammarHintForGuardianQuestions(
  profile: PatientProfileSnapshot | undefined,
): string {
  if (!profile) {
    return "Use \"a criança\" nas perguntas quando o sexo não estiver claro; não assuma ele/ela sem dados."
  }
  const firstToken = profile.name?.trim().split(/\s+/).filter(Boolean)[0] ?? ""
  const sexKey = normalizePatientSexFromDb(profile.sex)
  const nameHint = firstToken
    ? `Primeiro nome do paciente para referência: ${firstToken}. `
    : ""

  if (sexKey === "masculino") {
    return `${nameHint}Concordância em masculino (ele, o menino); não use "ela" para o paciente.`
  }
  if (sexKey === "feminino") {
    return `${nameHint}Concordância em feminino (ela, a menina); não use "ele" para o paciente.`
  }
  return `${nameHint}Sexo não informado de forma clara: prefira "a criança" em vez de ele/ela.`
}
