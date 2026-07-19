import type { PediatricAge } from "@/lib/compute-pediatric-age"

/** Average days per month used to project a banded age onto the schedule's
 * month axis (D-02). Position-only — this drives highlight placement, never any
 * diff/pending computation (that is Phase 6, D-11). */
const AVG_DAYS_PER_MONTH = 30.4375

/**
 * Projects a `PediatricAge` onto the vaccine schedule's month axis.
 *
 * Returns the child's whole-month age when the age is well-formed (`status ===
 * "ok"`), or `null` for every non-ok status (missing / invalid / future) so the
 * caller renders no highlight. Pure: no I/O, no date math (the engine already
 * did it) — just projects `totalDays` onto months.
 *
 * @param age Result of `computePediatricAge`.
 * @returns Whole months (floored), or `null` when no highlight should show.
 */
export function computeCurrentMonths(age: PediatricAge): number | null {
  if (age.status !== "ok") return null
  return Math.floor((age.totalDays ?? 0) / AVG_DAYS_PER_MONTH)
}

/**
 * Decides whether a schedule band is the child's CURRENT band (D-02).
 *
 * A band is current when `currentMonths` falls inside the inclusive window
 * `[ageMonths, ageMonthsMax ?? ageMonths]`. When `age_months_max` is null the
 * band is a single point (`ageMonths`). Returns `false` whenever `currentMonths`
 * is null (standalone / invalid age) or the band is unpositioned (`ageMonths`
 * null), so those bands never highlight.
 *
 * Position-only: this predicate expresses "onde estamos", never "já tomou /
 * está pendente" (D-11 — that is Phase 6).
 *
 * @param currentMonths The child's whole-month age, or null.
 * @param ageMonths The band's lower bound in months (`age_months`), or null.
 * @param ageMonthsMax The band's upper bound in months (`age_months_max`), or null.
 */
export function isBandCurrent(
  currentMonths: number | null,
  ageMonths: number | null,
  ageMonthsMax: number | null,
): boolean {
  if (currentMonths === null || ageMonths === null) return false
  const upper = ageMonthsMax ?? ageMonths
  return currentMonths >= ageMonths && currentMonths <= upper
}
