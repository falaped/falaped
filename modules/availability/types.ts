/**
 * Availability domain types (AGENDA-01/AGENDA-03, Fase 6).
 *
 * OWNED data: toda linha é escopada por profile_id (o médico dono). RLS +
 * filtro .eq("profile_id") em código são a defesa-em-profundidade contra IDOR
 * cross-profile (D-13). Somente REGRAS + EXCEÇÕES são persistidas — nenhum slot
 * individual (D-12); a expansão em slots é pura/derivada (Plano 02).
 */

/** Linha espelhando `public.availability_rules` (snake_case). */
export type AvailabilityRuleRow = {
  id: string
  profile_id: string
  weekday: number
  start_minute: number
  end_minute: number
  slot_minutes: number
  created_at: string
}

/** Linha espelhando `public.availability_exceptions` (snake_case). */
export type AvailabilityExceptionRow = {
  id: string
  profile_id: string
  exception_date: string
  start_minute: number | null
  end_minute: number | null
  created_at: string
}
