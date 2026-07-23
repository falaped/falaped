/**
 * Appointments domain types (APPT-01..04, Fase 7).
 *
 * OWNED data: toda linha é escopada por profile_id (o médico dono). RLS +
 * filtro .eq("profile_id") em código são a defesa-em-profundidade contra IDOR
 * cross-profile (D-09). starts_at/ends_at são instantes UTC gravados de
 * expandAvailability (Fase 6) — sem re-derivação de fuso no banco (D-10).
 */

/**
 * Ciclo de status da consulta (APPT-02 / D-06), espelhando o pg enum
 * `public.appointment_status`. pending+confirmed "seguram" o horário (entram na
 * exclusion constraint); done/no_show/canceled são finais e não seguram. no_show
 * (falta) é distinta de canceled.
 */
export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "done"
  | "no_show"
  | "canceled"

/** Linha espelhando `public.appointments` (snake_case). */
export type AppointmentRow = {
  id: string
  profile_id: string
  patient_id: string
  status: AppointmentStatus
  starts_at: string
  ends_at: string
  created_at: string
  updated_at: string
}
