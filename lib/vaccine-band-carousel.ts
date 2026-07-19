import type { VaccineScheduleWithItems } from "@/modules/vaccines/types"

/**
 * Computes the ordered UNION of distinct age bands across the given datasets.
 * A band is keyed by `age_label`; its order is the smallest `sort_order` seen
 * for that label in any dataset, so bands read in a single ascending-by-age
 * rhythm even when a dataset omits some bands.
 *
 * This is the SAME band-ordering logic the full calendar column layout uses,
 * lifted here so the carousel's slide order agrees with the calendar. Pure.
 *
 * @param schedules Datasets to scan (nulls skipped).
 */
export function computeOrderedBands(
  schedules: Array<VaccineScheduleWithItems | null>,
): string[] {
  const minSort = new Map<string, number>()
  for (const schedule of schedules) {
    if (!schedule) continue
    for (const item of schedule.vaccine_schedule_items) {
      const current = minSort.get(item.age_label)
      if (current === undefined || item.sort_order < current) {
        minSort.set(item.age_label, item.sort_order)
      }
    }
  }
  return [...minSort.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([label]) => label)
}

/**
 * Resolves the carousel's INITIAL slide index: the position of the child's
 * current band label within `orderedBands`. Falls back to 0 (first age band)
 * when there is no current band (standalone/older child) or the label is not in
 * the union — so the carousel always opens on a valid slide.
 *
 * The `currentBandLabel` MUST come from the same `resolveCurrentBandLabel`
 * (fed by corrected-age via `computeCurrentMonths`) the calendar/card use, so
 * the carousel opens on the SAME band those surfaces emphasize. Pure.
 *
 * @param orderedBands The ordered union of band labels.
 * @param currentBandLabel The child's current band label, or null.
 */
export function resolveCurrentBandIndex(
  orderedBands: string[],
  currentBandLabel: string | null,
): number {
  if (currentBandLabel === null) return 0
  const index = orderedBands.indexOf(currentBandLabel)
  return index >= 0 ? index : 0
}
