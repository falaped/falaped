import { differenceInCalendarDays } from "date-fns"

import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { formatPediatricAge } from "@/lib/format-pediatric-age"
import { PATIENT_SEX_LABELS, type PatientSex } from "@/modules/patients/patient-sex"
import type { ExamReadingInfo } from "@/modules/exam-readings/types"

export type CasePatientForExam = {
  name: string
  /** ISO (yyyy-mm-dd) ou null. */
  birth_date: string | null
  sex: PatientSex | null
}

export type ResolvedExamPatient = {
  name: string
  /** dd/mm/aaaa ou null. */
  birthDateLabel: string | null
  /** Por extenso ("2 anos e 4 meses") ou null. */
  ageLabel: string | null
  /** Rótulo "Masculino"/"Feminino" ou null. */
  sexLabel: string | null
  /** De onde veio a idade usada: do laudo ou do cadastro do caso. */
  source: "exam" | "case"
  /** Idade em dias na coleta (para escolher faixa por idade por código) ou null. */
  ageDays: number | null
  sexKey: PatientSex | null
}

/** "27/04/2024" → "2024-04-27"; qualquer outra coisa → null. */
export function brDateToIso(value: string | null | undefined): string | null {
  const m = value?.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

function isoToBr(iso: string): string {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

/**
 * Quem é o paciente do exame: o que está IMPRESSO no laudo manda, campo a
 * campo; o cadastro do caso só entra no que o laudo não traz. A idade é
 * calculada na data da COLETA quando o laudo a traz (é a idade que vale para a
 * faixa de referência), e por extenso do laudo quando não há data de nascimento.
 */
export function resolveExamPatient(
  exam: ExamReadingInfo,
  casePatient: CasePatientForExam,
  now: Date = new Date(),
): ResolvedExamPatient {
  const examBirthIso = brDateToIso(exam.patient_birth_date)
  const collectedIso = brDateToIso(exam.collected_at)
  const at = collectedIso ? new Date(collectedIso + "T12:00:00") : now

  const birthIso = examBirthIso ?? casePatient.birth_date
  const computed = birthIso ? computePediatricAge(birthIso, at) : null
  // Total em meses junto do texto: é o que o modelo compara com "de 1 a 23 meses"
  // ou "de 2 a 12 anos" sem precisar converter unidade.
  const ageFromBirth =
    computed && formatPediatricAge(computed)
      ? `${formatPediatricAge(computed)}${computed.totalMonths != null ? ` (${computed.totalMonths} meses)` : ""}`
      : ""

  const ageLabel = examBirthIso
    ? ageFromBirth || null
    : (exam.patient_age ?? (ageFromBirth || null))

  const sexKey: PatientSex | null = exam.patient_sex ?? casePatient.sex

  const ageDays = birthIso
    ? Math.max(0, differenceInCalendarDays(at, new Date(birthIso + "T12:00:00")))
    : null

  return {
    name: exam.patient_name ?? casePatient.name,
    birthDateLabel: birthIso ? isoToBr(birthIso) : null,
    ageLabel,
    sexLabel: sexKey ? PATIENT_SEX_LABELS[sexKey] : null,
    source: examBirthIso || exam.patient_age ? "exam" : "case",
    ageDays,
    sexKey,
  }
}
