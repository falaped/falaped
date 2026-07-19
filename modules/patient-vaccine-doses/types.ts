/**
 * Applied vaccine doses domain types (VAC-05, pulled forward from Phase 6).
 *
 * OWNED clinical data (unlike the GLOBAL reference vaccine_schedules): every row
 * is scoped by profile_id + patient_id. Boolean grain — a row's presence means
 * the physician marked that specific reference item (`schedule_item_id`) as
 * TAKEN. Position-only display: no pending/late diff (that is Phase 6).
 */

/** Row mirroring `public.patient_vaccine_doses` (snake_case). */
export type PatientVaccineDose = {
  id: string
  profile_id: string
  patient_id: string
  schedule_item_id: string
  taken_at: string
  created_at: string
}
