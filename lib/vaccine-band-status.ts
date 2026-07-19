/**
 * Aggregate "taken" progress of one age band, derived from the band's reference
 * item ids and the patient's TAKEN Set (union across BOTH datasets for that
 * band). Drives the age-timeline progress dot in the Calendário vacinal section.
 *
 * Pure. Position-only (D-11): reflects marked applied doses, never a pending /
 * late diff.
 */
export type BandStatus = "none" | "empty" | "partial" | "done"

/**
 * Counts how many of `itemIds` are present in `taken`. Ids in `taken` that are
 * not part of the band are ignored. Pure.
 */
export function countTaken(itemIds: string[], taken: Set<string>): number {
  let count = 0
  for (const id of itemIds) {
    if (taken.has(id)) count += 1
  }
  return count
}

/**
 * Classifies a band's taken progress:
 * - `none`    — the band has no reference items at all.
 * - `empty`   — the band has items, none taken.
 * - `partial` — some (but not all) items taken.
 * - `done`    — every item in the band is taken.
 *
 * @param itemIds Reference item ids belonging to the band (both datasets).
 * @param taken   The patient's TAKEN reference item ids.
 */
export function computeBandStatus(
  itemIds: string[],
  taken: Set<string>,
): BandStatus {
  if (itemIds.length === 0) return "none"
  const done = countTaken(itemIds, taken)
  if (done === 0) return "empty"
  if (done === itemIds.length) return "done"
  return "partial"
}
