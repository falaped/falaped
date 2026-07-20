import type { PediatricAge } from "@/lib/compute-pediatric-age"

/**
 * Projects a `PediatricAge` onto the vaccine schedule's month axis.
 *
 * Returns the child's CHRONOLOGICAL whole-month age when the age is well-formed
 * (`status === "ok"`), or `null` for every non-ok status (missing / invalid /
 * future) so the caller renders no highlight. Pure: no I/O, no date math (the
 * engine already did it) — just reads `age.totalMonths`.
 *
 * Vaccine positioning is chronological only: the engine's `totalMonths`
 * (`differenceInMonths(today, birth)`) is calendar-correct across ALL bands,
 * including the days/weeks bands where `parts.months` is absent (a real
 * 2-month-old yields 2, not 0). The preterm `corrected` age is deliberately
 * ignored here — corrected age no longer drives vaccine band placement.
 *
 * @param age Result of `computePediatricAge`.
 * @returns Chronological whole months, or `null` when no highlight should show.
 */
export function computeCurrentMonths(age: PediatricAge): number | null {
  if (age.status !== "ok") return null
  return age.totalMonths ?? null
}
