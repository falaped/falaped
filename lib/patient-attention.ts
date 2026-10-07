import { differenceInMonths, format, subDays } from "date-fns"

import { isPatientChartIncomplete } from "@/components/dashboard/patients/patient-chart-incomplete"
import type { Patient } from "@/modules/patients/types"

/** Mesma régua do Início: atendida nos últimos 90 dias e sem medida há mais de 180. */
const RECENT_DAYS = 90
const STALE_MEASURE_DAYS = 180

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export type PatientAttention = {
  /** O que falta na ficha ("Falta o responsável e o telefone."), ou null. */
  incomplete: string | null
  /** Há quanto tempo não mede peso e altura, ou null. */
  measure: string | null
}

/** O que pede atenção na criança (Pacientes e Ficha); alergia é informação e não entra aqui. */
export function getPatientAttention(
  row: { patient: Patient; lastConsultAt: string | null; lastMeasuredOn: string | null },
  now: Date,
): PatientAttention {
  const { patient } = row
  const missing = [
    !patient.birth_date ? "a data de nascimento" : null,
    !patient.responsible?.trim() ? "o responsável" : null,
    !patient.contact_phone?.trim() ? "o telefone" : null,
  ].filter(Boolean)
  const recent = !!row.lastConsultAt && row.lastConsultAt >= subDays(now, RECENT_DAYS).toISOString()
  const stale =
    recent && (!row.lastMeasuredOn || row.lastMeasuredOn < format(subDays(now, STALE_MEASURE_DAYS), "yyyy-MM-dd"))
  const last = row.lastMeasuredOn ? new Date(`${row.lastMeasuredOn}T12:00:00`) : null
  return {
    incomplete: isPatientChartIncomplete(patient) ? `Falta ${missing.join(", ").replace(/, ([^,]*)$/, " e $1")}.` : null,
    measure: stale
      ? last
        ? `Última medida de peso e altura há ${plural(differenceInMonths(now, last), "mês", "meses")}.`
        : "Nenhuma medida de peso e altura registrada."
      : null,
  }
}
