"use client"

import { cn } from "@/lib/utils"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { computeCurrentMonths } from "@/lib/vaccine-current-band"
import { resolveCurrentBandLabel } from "@/lib/vaccine-current-band-items"
import { computeOrderedBands } from "@/lib/vaccine-band-carousel"
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
  birthDate,
  gestationalAgeWeeks,
  className,
}: {
  sus: VaccineScheduleWithItems | null
  sbim: VaccineScheduleWithItems | null
  gestante: VaccineScheduleWithItems | null
  /** Patient mode (D-02/D-03): the child's DOB drives the current-age highlight.
   * Absent/null (standalone) → no highlight. */
  birthDate?: string | null
  /** Corrected-age input for preterm infants (mirrors the hero convention). */
  gestationalAgeWeeks?: number | null
  className?: string
}) {
  const orderedBands = computeOrderedBands([sus, sbim])

  // Current-age highlight (D-02/D-11). Patient mode only: reuse the tested age
  // engine (never re-parse the date — Pitfall 5), project onto the month axis,
  // then resolve WHICH age band label is current across both datasets so the
  // SAME band is emphasized in the SUS and SBIm columns. Position-only — no
  // diff/pending logic (that is Phase 6). Standalone (no birthDate) → null.
  const currentMonths = birthDate
    ? computeCurrentMonths(
        computePediatricAge(birthDate, new Date(), gestationalAgeWeeks),
      )
    : null
  const currentBandLabel = resolveCurrentBandLabel([sus, sbim], currentMonths)

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
              currentBandLabel={currentBandLabel}
            />
          ) : null}
          {sbim ? (
            <VaccineColumn
              title="Particular (SBIm)"
              schedule={sbim}
              orderedBands={orderedBands}
              currentBandLabel={currentBandLabel}
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
