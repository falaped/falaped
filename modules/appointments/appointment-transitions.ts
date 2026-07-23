import type { AppointmentStatus } from "@/modules/appointments/types"

/**
 * Máquina de transições legais do ciclo de status da consulta (APPT-02 / D-06).
 *
 * O pg enum `appointment_status` só garante que o VALOR existe; a LEGALIDADE das
 * transições (`confirmed -> done` sim, `canceled -> confirmed` não) é regra de
 * app — Postgres não impõe máquina de estado. Este módulo é puro, sem efeitos
 * colaterais, e é consumido pelo action antes do UPDATE (mesma convenção de
 * modules/patients/patient-sex.ts).
 *
 * Recusar (pending -> canceled) e cancelar (confirmed -> canceled) são os dois
 * caminhos para canceled (D-06). done/no_show/canceled são estados FINAIS: sem
 * transição de saída nesta fase.
 */
export const APPOINTMENT_TRANSITIONS: Record<
  AppointmentStatus,
  AppointmentStatus[]
> = {
  pending: ["confirmed", "canceled"], // confirmar | recusar (= cancelar)
  confirmed: ["done", "no_show", "canceled"], // realizada | falta | cancelar
  done: [], // final
  no_show: [], // final
  canceled: [], // final
}

/**
 * Retorna se a transição `from -> to` é legal segundo APPOINTMENT_TRANSITIONS.
 * Estados finais (done/no_show/canceled) não têm transição de saída → sempre false.
 */
export function isLegalTransition(
  from: AppointmentStatus,
  to: AppointmentStatus,
): boolean {
  return APPOINTMENT_TRANSITIONS[from]?.includes(to) ?? false
}
