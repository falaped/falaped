import type { SupabaseClient } from "@supabase/supabase-js"

import { listCaseReminders } from "./list-case-reminders"

/** O que a consulta anterior deixou para a próxima. */
export type CaseCarryover = {
  caseId: string
  endedAt: string | null
  startedAt: string
  summary: string | null
  /** Lembretes daquele atendimento, um por item. */
  reminders: string[]
}

/**
 * Resumo e lembretes da ÚLTIMA consulta do mesmo paciente, tirando a atual.
 *
 * Devolve `null` quando não há consulta anterior ou quando a anterior não
 * deixou nem resumo nem lembrete — nesse caso não há o que mostrar, e um modal
 * vazio ao abrir o atendimento seria só fricção.
 *
 * Escopado por `user_phone` (a posse de `cases`) E `patient_id`. `currentCaseId`
 * null (ficha do paciente) não exclui nada: a última consulta é a que interessa.
 */
export async function getPreviousCaseCarryover(
  supabase: SupabaseClient,
  profileId: string,
  userPhone: string,
  patientId: string,
  currentCaseId: string | null = null,
): Promise<CaseCarryover | null> {
  let query = supabase
    .from("cases")
    .select("id, started_at, ended_at, summary")
    .eq("user_phone", userPhone)
    .eq("patient_id", patientId)

  // Sem caso atual (ficha do paciente), a última consulta É a que interessa.
  if (currentCaseId) query = query.neq("id", currentCaseId)

  const { data, error } = await query
    .order("started_at", { ascending: false })
    .limit(1)

  if (error)
    throw new Error(
      `[CASES] Failed to fetch previous case carryover: ${error.message}`,
    )

  const row = (data ?? [])[0] as
    | {
        id: string
        started_at: string
        ended_at: string | null
        summary: string | null
      }
    | undefined

  if (!row) return null

  const reminders = (await listCaseReminders(supabase, profileId, row.id)).map(
    (reminder) => reminder.text,
  )

  if (!row.summary?.trim() && reminders.length === 0) return null

  return {
    caseId: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    summary: row.summary?.trim() || null,
    reminders,
  }
}
