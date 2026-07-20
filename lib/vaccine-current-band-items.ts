import { bandForItemMonths, resolveBandForMonths } from "@/lib/vaccine-bands"
import type {
  VaccineScheduleItem,
  VaccineScheduleWithItems,
} from "@/modules/vaccines/types"

/**
 * Resolves the child's CURRENT canonical band label from their whole-month age
 * (D-02). Data-independent: it applies the "faixa anterior" rule over the fixed
 * canonical bands (`lib/vaccine-bands.ts`) and no longer scans seed windows, so
 * the resolved band never drifts with the dataset.
 *
 * The `schedules` argument is kept for signature compatibility (callers pass
 * `[sus, sbim]`) but is ignored — resolution depends only on `currentMonths`.
 * Returns null in standalone mode (`currentMonths` null). Position-only (D-11).
 *
 * Pure: no I/O. Shared by the full calendar view and the in-profile card so the
 * two surfaces resolve the SAME band from the SAME age.
 *
 * @param _schedules Unused (kept for signature compatibility).
 * @param currentMonths The child's chronological whole-month age, or null.
 */
export function resolveCurrentBandLabel(
  _schedules: Array<VaccineScheduleWithItems | null>,
  currentMonths: number | null,
): string | null {
  return resolveBandForMonths(currentMonths)?.label ?? null
}

/**
 * Filters ONE dataset's items to a canonical band, grouping each item by the
 * band its `age_months` maps to (`bandForItemMonths`), NOT by `age_label`
 * equality — so grouping is data-independent. Preserves the source order (items
 * arrive pre-sorted by `sort_order`).
 *
 * Returns an empty array when `bandLabel` is null, the schedule is absent
 * (`null`), or the dataset has no item in that band. Items with a null
 * `age_months` fall into no band (excluded). Position-only (D-11).
 *
 * Pure: no I/O.
 *
 * @param schedule The dataset to filter, or null.
 * @param bandLabel The current canonical band label, or null.
 */
export function itemsForCurrentBand(
  schedule: VaccineScheduleWithItems | null,
  bandLabel: string | null,
): VaccineScheduleItem[] {
  if (!schedule || bandLabel === null) return []
  return schedule.vaccine_schedule_items.filter(
    (item) => bandForItemMonths(item.age_months)?.label === bandLabel,
  )
}
