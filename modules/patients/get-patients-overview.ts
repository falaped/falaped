import type { SupabaseClient } from "@supabase/supabase-js"

import { caseSummaryHeadline } from "@/lib/case-summary-headline"
import type { CaseOrigin } from "@/modules/cases/types"
import type { Patient } from "@/modules/patients/types"

/** Uma linha da lista de Pacientes (protótipo b4). */
export type PatientOverview = {
  patient: Patient
  /** Consulta mais recente (ISO) e o motivo dela; null se nunca foi atendida. */
  lastConsultAt: string | null
  lastReason: string | null
  /** Data (yyyy-MM-dd) da última medida de peso/altura; null se nunca foi medida. */
  lastMeasuredOn: string | null
}

export type PatientsOverview = {
  rows: PatientOverview[]
  /** Consulta aberta agora com paciente, para a linha dele mostrar "Voltar à consulta". */
  activeCase: { id: string; origin: CaseOrigin; patientId: string } | null
}

/**
 * Pacientes do médico com a última consulta e a última medida de cada um, e a consulta aberta.
 * @throws Error("[PATIENTS] ...") se alguma consulta falhar
 */
export async function getPatientsOverview(
  supabase: SupabaseClient,
  patients: Patient[],
  profileId: string,
): Promise<PatientsOverview> {
  // ponytail: tudo de uma vez, sem paginar; paginar quando um médico passar de alguns milhares.
  const [casesResult, measurementsResult] = await Promise.all([
    supabase
      .from("cases")
      .select("id, origin, status, patient_id, started_at, summary")
      .eq("profile_id", profileId)
      .not("patient_id", "is", null)
      .order("started_at", { ascending: false }),
    supabase
      .from("patient_measurements")
      .select("patient_id, measured_on")
      .eq("profile_id", profileId)
      .order("measured_on", { ascending: false }),
  ])
  if (casesResult.error) throw new Error(`[PATIENTS] Failed to load last consults: ${casesResult.error.message}`)
  if (measurementsResult.error) throw new Error(`[PATIENTS] Failed to load measurements: ${measurementsResult.error.message}`)

  // As duas listas vêm da mais recente para a mais antiga: a primeira de cada criança é a última.
  const lastCase = new Map<string, { started_at: string; summary: string | null }>()
  let activeCase: PatientsOverview["activeCase"] = null
  for (const row of casesResult.data ?? []) {
    if (!lastCase.has(row.patient_id as string)) lastCase.set(row.patient_id as string, row)
    if (!activeCase && row.status === "active") activeCase = { id: row.id, origin: row.origin, patientId: row.patient_id }
  }
  const lastMeasure = new Map<string, string>()
  for (const row of measurementsResult.data ?? []) {
    if (!lastMeasure.has(row.patient_id as string)) lastMeasure.set(row.patient_id as string, row.measured_on as string)
  }

  return {
    activeCase,
    rows: patients.map((patient) => {
      const last = lastCase.get(patient.id)
      return {
        patient,
        lastConsultAt: last?.started_at ?? null,
        lastReason: last ? caseSummaryHeadline(last.summary) : null,
        lastMeasuredOn: lastMeasure.get(patient.id) ?? null,
      }
    }),
  }
}
