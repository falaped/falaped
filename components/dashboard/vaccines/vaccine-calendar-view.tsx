"use client"

import { cn } from "@/lib/utils"
import type { VaccineScheduleWithItems } from "@/modules/vaccines/types"
import { VaccineColumn } from "./vaccine-column"

/**
 * Reference vaccine calendar view.
 *
 * Slice 05-02: renders SUS/PNI and Particular (SBIm) as two parallel columns
 * inside the "Criança" area (C3). Both columns read across at the same
 * age-band rhythm: the view computes the ordered UNION of age bands across
 * both datasets and passes it to each column, so where one dataset lacks a
 * band the column shows an explicit empty marker (`—`) rather than silently
 * misaligning (C3). Each column keeps its own provenance caption (C6/D-09).
 *
 * The prop surface stays forward-compatible: plan 03 adds `gestante`, plan 04
 * adds an optional `birthDate` for the current-age highlight.
 */
export function VaccineCalendarView({
  sus,
  sbim,
  className,
}: {
  sus: VaccineScheduleWithItems | null
  sbim: VaccineScheduleWithItems | null
  className?: string
}) {
  const orderedBands = computeOrderedBands([sus, sbim])

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sus ? (
          <VaccineColumn
            title="SUS/PNI"
            schedule={sus}
            orderedBands={orderedBands}
          />
        ) : null}
        {sbim ? (
          <VaccineColumn
            title="Particular (SBIm)"
            schedule={sbim}
            orderedBands={orderedBands}
          />
        ) : null}
      </div>
    </div>
  )
}

/**
 * Computes the ordered union of distinct age bands across the given datasets.
 * A band is keyed by `age_label`; its order is the smallest `sort_order` seen
 * for that label in any dataset, so bands read across both columns in a single
 * ascending-by-age rhythm even when a dataset omits some bands.
 */
function computeOrderedBands(
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
