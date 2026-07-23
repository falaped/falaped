import type { SupabaseClient } from "@supabase/supabase-js"
import type { AppointmentStatus } from "./types"

/** Projeção enxuta de uma consulta para a agenda (subset de AppointmentRow). */
export type AppointmentListRow = {
  id: string
  patient_id: string
  status: AppointmentStatus
  starts_at: string
  ends_at: string
}

/**
 * Lista as consultas do médico numa janela meio-aberta `[from, to)`, escopadas
 * por profile_id — o backstop de ownership / defesa contra IDOR (D-09): NUNCA ler
 * sem o filtro de profile_id. A janela casa com a semântica meio-aberta dos slots
 * da Fase 6 (D-10/D-11): `.gte("starts_at", from)` e `.lt("starts_at", to)`.
 * Ordena por starts_at para renderização estável sobre o calendário. Traz TODOS
 * os status (inclusive done/no_show/canceled) — a consulta histórica continua
 * visível na agenda mesmo sem "segurar" o horário (D-07).
 *
 * @param supabase Cliente por-requisição injetado.
 * @param profileId Id do perfil do médico dono.
 * @param from Início (inclusive) da janela — instante.
 * @param to Fim (exclusivo) da janela — instante.
 */
export async function listAppointmentsByProfileId(
  supabase: SupabaseClient,
  profileId: string,
  from: Date,
  to: Date,
): Promise<AppointmentListRow[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("id, patient_id, status, starts_at, ends_at")
    .eq("profile_id", profileId)
    .gte("starts_at", from.toISOString())
    .lt("starts_at", to.toISOString())
    .order("starts_at", { ascending: true })

  if (error)
    throw new Error(
      `[APPOINTMENTS] Failed to list appointments: ${error.message}`,
    )

  return (data ?? []) as AppointmentListRow[]
}
