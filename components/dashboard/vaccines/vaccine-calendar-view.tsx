"use client"

import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { VaccineScheduleWithItems } from "@/modules/vaccines/types"
import { GestanteList } from "./gestante-list"
import { VaccineColumn } from "./vaccine-column"

/**
 * Reference vaccine calendar view.
 *
 * Slice 05-03: introduces the top-level Tabs shell (C2/D-04) — "Criança
 * (SUS × SBIm)" (default) and "Gestante". The active tab uses the accent
 * (primary) indicator per UI-SPEC §Color (accent reserved for orientation).
 *
 * Criança tab: renders SUS/PNI and Particular (SBIm) as two parallel columns
 * (C3, from slice 05-02). Both columns read across at the same age-band rhythm
 * via the ordered UNION of age bands, so where one dataset lacks a band the
 * column shows an explicit empty marker (`—`) rather than silently misaligning.
 *
 * Gestante tab: a single list by vaccine with the gestational-week window in
 * text (C5/D-05) — a different axis than the child calendar. Each dataset keeps
 * its own provenance caption (C6/D-09).
 *
 * The prop surface stays forward-compatible: plan 04 adds an optional
 * `birthDate` for the current-age highlight.
 */
export function VaccineCalendarView({
  sus,
  sbim,
  gestante,
  className,
}: {
  sus: VaccineScheduleWithItems | null
  sbim: VaccineScheduleWithItems | null
  gestante: VaccineScheduleWithItems | null
  className?: string
}) {
  const orderedBands = computeOrderedBands([sus, sbim])

  return (
    <Tabs defaultValue="crianca" className={cn("flex flex-col gap-6", className)}>
      <TabsList className="lg:w-full">
        <TabsTrigger
          value="crianca"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          Criança (SUS × SBIm)
        </TabsTrigger>
        <TabsTrigger
          value="gestante"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          Gestante
        </TabsTrigger>
      </TabsList>

      <TabsContent value="crianca">
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
      </TabsContent>

      <TabsContent value="gestante">
        {gestante ? (
          <GestanteList schedule={gestante} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Calendário da gestante indisponível. Atualize a página ou tente
            novamente mais tarde.
          </p>
        )}
      </TabsContent>
    </Tabs>
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
