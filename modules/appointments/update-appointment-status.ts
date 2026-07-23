import type { SupabaseClient } from "@supabase/supabase-js"
import type { AppointmentStatus } from "./types"

/**
 * Resultado do compare-and-set: `matched=false` quando 0 linhas foram afetadas
 * (nenhuma consulta com profile_id+id AINDA no status `from`), sinalizando ao
 * action uma transição concorrente / estado já mudado — sem ser um erro do banco.
 */
export type UpdateAppointmentStatusResult = {
  matched: boolean
  id: string | null
  status: AppointmentStatus | null
}

/**
 * Atualiza o status de uma consulta via COMPARE-AND-SET (APPT-02/APPT-03, D-06),
 * escopado por AMBOS profile_id e id — o backstop de ownership contra IDOR (D-09):
 * NUNCA atualizar por id sozinho (permitiria mutar a consulta de outro médico).
 * A guarda extra `.eq("status", from)` é o CONCURRENCY GUARD (Pattern 2): o UPDATE
 * só afeta a linha se ela AINDA estiver em `from`, evitando sobrescrever uma
 * transição concorrente. A LEGALIDADE (from -> to) é checada por isLegalTransition
 * no action, ANTES desta chamada — Postgres não impõe máquina de estado.
 *
 * Distingue 0-rows-afetadas (`matched: false` — miss do compare-and-set, sem row)
 * de um erro real do banco (throw). PRESERVA `error.code` como o create (Pitfall
 * 3/4): confirmar um pending pode disparar 23P01 no UPDATE se o horário foi tomado
 * no meio — o action ramifica pelo SQLSTATE.
 *
 * @param supabase Cliente por-requisição injetado.
 * @param profileId Id do perfil do médico dono.
 * @param id Id da consulta a transicionar.
 * @param from Status esperado atual (compare-and-set).
 * @param to Novo status (já validado como transição legal no action).
 */
export async function updateAppointmentStatus(
  supabase: SupabaseClient,
  profileId: string,
  id: string,
  from: AppointmentStatus,
  to: AppointmentStatus,
): Promise<UpdateAppointmentStatusResult> {
  const { data, error } = await supabase
    .from("appointments")
    .update({ status: to, updated_at: new Date().toISOString() })
    .eq("profile_id", profileId)
    .eq("id", id)
    .eq("status", from)
    .select("id, status")
    .maybeSingle()

  if (error) {
    // PRESERVA o SQLSTATE (Pitfall 3/4): 23P01 pode disparar no confirmar.
    const e = new Error(
      `[APPOINTMENTS] Failed to update appointment status: ${error.message}`,
    )
    ;(e as { code?: string }).code = error.code
    throw e
  }

  // 0 linhas afetadas: nenhuma consulta em profile_id+id AINDA no status `from`.
  if (!data) return { matched: false, id: null, status: null }

  const row = data as { id: string; status: AppointmentStatus }
  return { matched: true, id: row.id, status: row.status }
}
