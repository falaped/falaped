import { isBandCurrent } from "@/lib/vaccine-current-band"
import type {
  VaccineScheduleItem,
  VaccineScheduleWithItems,
} from "@/modules/vaccines/types"

/**
 * Resolves which `age_label` band is the child's CURRENT band (D-02), scanning
 * items across the given datasets. The first band whose `[age_months,
 * age_months_max ?? age_months]` window contains `currentMonths` wins; its
 * `age_label` identifies the band emphasized identically in every dataset.
 *
 * Returns null in standalone mode (`currentMonths` null) or when no band
 * contains the age (e.g. an older child past the last scheduled band, or a
 * child between milestones). Position-only (D-11) — never diff/pending logic
 * (that is Phase 6).
 *
 * Pure: no I/O. Shared by the full calendar view and the in-profile card so the
 * two surfaces resolve the SAME band from the SAME age.
 *
 * @param schedules Datasets to scan (nulls skipped).
 * @param currentMonths The child's whole-month age, or null.
 */
export function resolveCurrentBandLabel(
  schedules: Array<VaccineScheduleWithItems | null>,
  currentMonths: number | null,
): string | null {
  if (currentMonths === null) return null
  for (const schedule of schedules) {
    if (!schedule) continue
    for (const item of schedule.vaccine_schedule_items) {
      if (isBandCurrent(currentMonths, item.age_months, item.age_months_max)) {
        return item.age_label
      }
    }
  }
  return null
}

/**
 * Filters ONE dataset's items to the current band `age_label`, preserving the
 * source order (items arrive pre-sorted by `sort_order`).
 *
 * Returns an empty array when there is no current band (`bandLabel` null), the
 * schedule is absent (`null`), or the dataset simply has no item in that band —
 * callers render a friendly empty state rather than an empty box. Position-only
 * (D-11).
 *
 * Pure: no I/O.
 *
 * @param schedule The dataset to filter, or null.
 * @param bandLabel The current band's `age_label`, or null.
 */
export function itemsForCurrentBand(
  schedule: VaccineScheduleWithItems | null,
  bandLabel: string | null,
): VaccineScheduleItem[] {
  if (!schedule || bandLabel === null) return []
  return schedule.vaccine_schedule_items.filter(
    (item) => item.age_label === bandLabel,
  )
}
