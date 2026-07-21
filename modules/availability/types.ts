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

/**
 * Linha espelhando `public.availability_exceptions` (snake_case), estendida para
 * o modelo HÍBRIDO v2 (D-20): a mesma tabela guarda overrides ADITIVOS
 * (`override_type: "add"` — horário extra pontual com `slot_minutes` próprio) e
 * SUBTRATIVOS (`override_type: "subtract"` — folga dia inteiro ou faixa parcial,
 * `slot_minutes` null). A tabela mantém o nome v1 `availability_exceptions`.
 */
export type AvailabilityExceptionRow = {
  id: string
  profile_id: string
  exception_date: string
  start_minute: number | null
  end_minute: number | null
  override_type: "add" | "subtract"
  slot_minutes: number | null
  created_at: string
}

/** Alias semântico v2: uma linha de override (aditivo ou subtrativo). */
export type AvailabilityOverrideRow = AvailabilityExceptionRow
