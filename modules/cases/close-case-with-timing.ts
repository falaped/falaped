import type { SupabaseClient } from "@supabase/supabase-js"

import { closeTiming } from "@/lib/consult-idle"
import { listCaseActivityTimes } from "@/modules/cases/list-case-activity-times"

export type CaseTimerRow = {
  id: string
  started_at: string
  consultation_paused_ms: number | null
  consultation_paused_at: string | null
  patient_id: string | null
}

/**
 * Encerra a consulta gravando a duração real: esquecida aberta, termina na última
 * atividade, e os intervalos parados viram pausa (ver `lib/consult-idle.ts`).
 * `endedAt` é o horário informado pela médica. Dono já conferido por quem chama.
 * @throws Error("[CASES] ...") se a leitura ou o update falharem
 */
export async function closeCaseWithTiming(
  supabase: SupabaseClient,
  row: CaseTimerRow,
  endedAt?: string,
): Promise<void> {
  const activity = await listCaseActivityTimes(supabase, row.id, row.patient_id, row.started_at)
  const timing = closeTiming(
    {
      startedAt: row.started_at,
      pausedMs: Number(row.consultation_paused_ms ?? 0),
      pausedAt: row.consultation_paused_at,
    },
    activity,
    Date.now(),
    endedAt,
  )
  const { error } = await supabase
    .from("cases")
    .update({
      status: "closed",
      ended_at: timing.endedAt,
      consultation_paused_ms: timing.pausedMs,
      consultation_paused_at: null,
    })
    .eq("id", row.id)
  if (error) throw new Error(`[CASES] Failed to close case: ${error.message}`)
}
