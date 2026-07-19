/**
 * Reference vaccine calendar domain types (phase 05).
 *
 * DIVERGÊNCIA DELIBERADA (D-07): estes são dados de referência GLOBAIS, somente
 * leitura, compartilhados por todos os médicos. NÃO existe `profile_id` — não
 * adicione escopo por dono como no resto do repositório.
 */

/** Which reference calendar a schedule belongs to. */
export type VaccineSource = "SUS" | "SBIm" | "gestante"

/** Time axis used to position an item (child age vs gestational weeks, D-04). */
export type VaccineAxis = "child_age" | "gestational_weeks"

/** Parent metadata row (mirrors `public.vaccine_schedules`, snake_case). */
export type VaccineSchedule = {
  id: string
  source: VaccineSource
  axis: VaccineAxis
  version: string
  effective_date: string
  notes: string | null
}

/** Child item row (mirrors `public.vaccine_schedule_items`, snake_case). */
export type VaccineScheduleItem = {
  id: string
  vaccine: string
  dose: string | null
  age_months: number | null
  age_months_max: number | null
  week_min: number | null
  week_max: number | null
  age_label: string
  sort_order: number
  notes: string | null
}

/** A schedule joined with its items (ordered by `sort_order` ascending). */
export type VaccineScheduleWithItems = VaccineSchedule & {
  vaccine_schedule_items: VaccineScheduleItem[]
}
