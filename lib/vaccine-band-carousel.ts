import { CANONICAL_VACCINE_BANDS } from "@/lib/vaccine-bands"
import type { VaccineScheduleWithItems } from "@/modules/vaccines/types"

/**
 * Returns the 11 canonical band labels in fixed, ascending-by-age order
 * (`lib/vaccine-bands.ts`), regardless of the datasets passed. Data-independent:
 * the timeline reads the SAME order everywhere and bands without seed vaccines
 * still appear (empty state).
 *
 * The `schedules` argument is kept for signature compatibility but is ignored.
 *
 * @param _schedules Unused (kept for signature compatibility).
 */
export function computeOrderedBands(
  _schedules: Array<VaccineScheduleWithItems | null>,
): string[] {
  return CANONICAL_VACCINE_BANDS.map((band) => band.label)
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
