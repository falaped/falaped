import type { SupabaseClient } from "@supabase/supabase-js"

export type HomeAttentionPatient = {
  patientId: string
  name: string
  birthDate: string | null
}

export type HomeAttention = {
  /** Consultas encerradas desde `monthStartIso` sem lançamento financeiro válido. */
  unbilledCount: number
  /** Atendidos desde `recentSinceIso` sem sexo ou sem data de nascimento (a curva depende dos dois). */
  incomplete: (HomeAttentionPatient & { missing: ("sex" | "birth_date")[] })[]
  /** Atendidos desde `recentSinceIso` sem medida de peso/altura desde `measuredSinceIso` (ou nunca medidos). */
  staleMeasure: (HomeAttentionPatient & { lastMeasuredOn: string | null })[]
}

export type HomeAttentionWindow = {
  /** Início do mês corrente no fuso da clínica, ISO. */
  monthStartIso: string
  /** Só entram crianças com consulta a partir desta data, ISO. */
  recentSinceIso: string
  /** Medida mais antiga que esta data (yyyy-MM-dd) conta como "sem medida recente". */
  measuredSinceIso: string
}

/**
 * Pendências do Início ("Precisam de atenção"), todas a partir de dados que já existem:
 * cobrança das consultas do mês, ficha incompleta e falta de medida recente das crianças
 * atendidas há pouco. Não calcula vacina atrasada: o calendário vacinal do app só mostra
 * a posição da criança, nunca atraso (D-11).
 * @throws Error("[DASHBOARD_HOME] ...") se alguma consulta falhar
 */
export async function getHomeAttention(
  supabase: SupabaseClient,
  profileId: string,
  window: HomeAttentionWindow,
): Promise<HomeAttention> {
  const [closedResult, recentResult] = await Promise.all([
    supabase
      .from("cases")
      .select("id")
      .eq("profile_id", profileId)
      .eq("status", "closed")
      .gte("ended_at", window.monthStartIso),
    supabase
      .from("cases")
      .select("patient_id")
      .eq("profile_id", profileId)
      .not("patient_id", "is", null)
      .gte("started_at", window.recentSinceIso)
      .order("started_at", { ascending: false })
      // ponytail: últimas 300 consultas bastam para a lista curta do Início.
      .limit(300),
  ])
  if (closedResult.error) throw new Error(`[DASHBOARD_HOME] Failed to load closed cases: ${closedResult.error.message}`)
  if (recentResult.error) throw new Error(`[DASHBOARD_HOME] Failed to load recent cases: ${recentResult.error.message}`)

  const closedIds = (closedResult.data ?? []).map((row) => row.id as string)
  const patientIds = [...new Set((recentResult.data ?? []).map((row) => row.patient_id as string))]

  const [entriesResult, patientsResult, measurementsResult] = await Promise.all([
    closedIds.length
      ? supabase
          .from("financial_entries")
          .select("case_id")
          .eq("profile_id", profileId)
          .is("voided_at", null)
          .in("case_id", closedIds)
      : Promise.resolve({ data: [], error: null }),
    patientIds.length
      ? supabase.from("patients").select("id, name, birth_date, sex").eq("profile_id", profileId).in("id", patientIds)
      : Promise.resolve({ data: [], error: null }),
    patientIds.length
      ? supabase
          .from("patient_measurements")
          .select("patient_id, measured_on")
          .eq("profile_id", profileId)
          .in("patient_id", patientIds)
          .order("measured_on", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ])
  if (entriesResult.error) throw new Error(`[DASHBOARD_HOME] Failed to load entries: ${entriesResult.error.message}`)
  if (patientsResult.error) throw new Error(`[DASHBOARD_HOME] Failed to load patients: ${patientsResult.error.message}`)
  if (measurementsResult.error)
    throw new Error(`[DASHBOARD_HOME] Failed to load measurements: ${measurementsResult.error.message}`)

  const billed = new Set((entriesResult.data ?? []).map((row) => row.case_id as string))
  const lastMeasured = new Map<string, string>()
  for (const row of measurementsResult.data ?? []) {
    if (!lastMeasured.has(row.patient_id as string)) lastMeasured.set(row.patient_id as string, row.measured_on as string)
  }

  // Mantém a ordem "atendido mais recentemente primeiro".
  const byId = new Map((patientsResult.data ?? []).map((p) => [p.id as string, p]))
  const incomplete: HomeAttention["incomplete"] = []
  const staleMeasure: HomeAttention["staleMeasure"] = []
  for (const id of patientIds) {
    const p = byId.get(id)
    if (!p) continue
    const base = { patientId: id, name: p.name as string, birthDate: (p.birth_date as string | null) ?? null }
    const missing: ("sex" | "birth_date")[] = []
    if (!p.sex) missing.push("sex")
    if (!p.birth_date) missing.push("birth_date")
    if (missing.length) incomplete.push({ ...base, missing })
    const last = lastMeasured.get(id) ?? null
    if (!last || last < window.measuredSinceIso) staleMeasure.push({ ...base, lastMeasuredOn: last })
  }

  return {
    unbilledCount: closedIds.filter((id) => !billed.has(id)).length,
    incomplete,
    staleMeasure,
  }
}
