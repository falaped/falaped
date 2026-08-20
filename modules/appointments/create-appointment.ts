import type { SupabaseClient } from "@supabase/supabase-js"
import type { AppointmentRow, AppointmentStatus, AppointmentType } from "./types"

/** Dados de uma consulta a criar (sem profile_id — stampado server-side). */
export type CreateAppointmentData = {
  patient_id: string
  status: AppointmentStatus
  type: AppointmentType
  reason?: string | null
  starts_at: string
  ends_at: string
}

/**
 * Cria uma consulta para o médico (APPT-01, D-01/D-02/D-05), stampando profile_id
 * server-side (nunca confiar no cliente) — defesa contra IDOR (D-09). starts_at/
 * ends_at são instantes UTC (ISO) vindos de expandAvailability (Fase 6); o banco
 * grava timestamptz direto (D-10, sem re-derivação de fuso).
 *
 * CONTRATO MÓDULO↔ACTION (Pitfall 3 / Pattern 4): o não-double-booking é imposto
 * pela exclusion constraint parcial do banco (Plano 01). Uma colisão dispara o
 * SQLSTATE `23P01` (exclusion_violation). Este módulo NÃO faz `throw new
 * Error(message)` cru — ele PRESERVA `error.code` no Error relançado para que o
 * action possa ramificar de forma estável (23P01 → copy PT-BR "horário já
 * ocupado"), em vez de fazer matching frágil por substring de mensagem. Este é o
 * único ponto do repo que preserva o code (desvio deliberado do padrão bare
 * error.message).
 *
 * @param supabase Cliente por-requisição injetado.
 * @param profileId Id do perfil do médico dono.
 * @param input Paciente, status inicial e intervalo do slot livre.
 */
export async function createAppointment(
  supabase: SupabaseClient,
  profileId: string,
  input: CreateAppointmentData,
): Promise<AppointmentRow> {
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      profile_id: profileId,
      patient_id: input.patient_id,
      status: input.status,
      type: input.type,
      reason: input.reason ?? null,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
    })
    .select(
      "id, profile_id, patient_id, status, reason, type, starts_at, ends_at, created_at, updated_at",
    )
    .single()

  if (error) {
    // PRESERVA o SQLSTATE (Pitfall 3): o action ramifica por error.code === "23P01".
    const e = new Error(
      `[APPOINTMENTS] Failed to create appointment: ${error.message}`,
    )
    ;(e as { code?: string }).code = error.code
    throw e
  }

  return data as AppointmentRow
}
