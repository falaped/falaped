"use client"

import Link from "next/link"
import { ArrowUpRightIcon, SyringeIcon } from "lucide-react"

import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { computeCurrentMonths } from "@/lib/vaccine-current-band"
import {
  itemsForCurrentBand,
  resolveCurrentBandLabel,
} from "@/lib/vaccine-current-band-items"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScheduleProvenance } from "@/components/dashboard/vaccines/schedule-provenance"
import type {
  VaccineScheduleItem,
  VaccineScheduleWithItems,
} from "@/modules/vaccines/types"

/**
 * In-profile current-age vaccine card (D-03, revised entry point).
 *
 * Shows — directly in the patient ficha — the vaccines scheduled for the
 * child's CURRENT age band, in BOTH datasets (SUS/PNI and Particular/SBIm),
 * each labeled with its provenance. Position-only (D-11): "o que está previsto
 * nesta idade", never dose diff/pending (that is Phase 6).
 *
 * The current band is resolved with the SAME engine + helper the full calendar
 * uses (`computeCurrentMonths` + `resolveCurrentBandLabel`), so the card and the
 * calendar agree on which band is current. Preterm infants use the CORRECTED
 * age (CR-01) via the engine's `corrected.totalDays`; term / missing GA falls
 * back to chronological.
 *
 * A DISCREET secondary "Ver calendário completo" link opens the standalone
 * calendar with patient context preserved (`?patientId`). It is secondary, not
 * the primary action.
 *
 * Graceful degradation: when both datasets failed to load (a Supabase read
 * error upstream degrades to `null`), the card renders nothing rather than
 * crashing the profile (pre-empts WR-01). No DOB → renders nothing (the ficha
 * already surfaces the missing-DOB state elsewhere). No band with items for the
 * current age → a friendly empty state.
 */
export function PatientVaccineAgeCard({
  patientId,
  birthDate,
  gestationalAgeWeeks,
  sus,
  sbim,
  className,
}: {
  patientId: string
  birthDate?: string | null
  gestationalAgeWeeks?: number | null
  sus: VaccineScheduleWithItems | null
  sbim: VaccineScheduleWithItems | null
  className?: string
}) {
  // No reference data at all (both reads failed/unseeded) → nothing to show.
  if (!sus && !sbim) return null
  // No birth date → don't render the card (the ficha handles missing-DOB
  // elsewhere; a current-age card is meaningless without an age).
  if (!birthDate) return null

  // Resolve the current band exactly as the calendar does (corrected age for
  // preterm, chronological fallback). Position-only.
  const currentMonths = computeCurrentMonths(
    computePediatricAge(birthDate, new Date(), gestationalAgeWeeks),
  )
  const currentBandLabel = resolveCurrentBandLabel([sus, sbim], currentMonths)

  const susItems = itemsForCurrentBand(sus, currentBandLabel)
  const sbimItems = itemsForCurrentBand(sbim, currentBandLabel)
  const hasAnyItems = susItems.length > 0 || sbimItems.length > 0

  const fullCalendarHref = `/dashboard/vaccines?patientId=${encodeURIComponent(patientId)}`

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg tracking-tight">
              <SyringeIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              Vacinas para a idade atual
              {currentBandLabel ? (
                <Badge className="shrink-0 text-[10px] uppercase tracking-wide">
                  {currentBandLabel}
                </Badge>
              ) : null}
            </CardTitle>
            <CardDescription className="mt-1">
              Previstas nesta faixa etária — SUS/PNI e particular (SBIm). Somente
              posição por idade.
            </CardDescription>
          </div>
          {/* Discreet secondary link (D-03) — not the primary action. */}
          <Link
            href={fullCalendarHref}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-normal text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Ver calendário completo
            <ArrowUpRightIcon className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {hasAnyItems ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DatasetPanel title="SUS/PNI" schedule={sus} items={susItems} />
            <DatasetPanel
              title="Particular (SBIm)"
              schedule={sbim}
              items={sbimItems}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma vacina prevista para a faixa de idade atual.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * One dataset's current-band items, highlighted with the SAME accent idiom the
 * calendar column uses (accent left border + subtle bg — the emphasis reserved
 * for the current band). Each panel keeps its own provenance caption (D-09).
 */
function DatasetPanel({
  title,
  schedule,
  items,
}: {
  title: string
  schedule: VaccineScheduleWithItems | null
  items: VaccineScheduleItem[]
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h3 className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {items.length > 0 ? (
        <ul
          aria-current="true"
          className="-ml-3 flex flex-col gap-2 rounded-r-sm border-l-2 border-primary bg-primary/10 py-2 pl-3 pr-2"
        >
          {items.map((item) => (
            <li key={item.id} className="text-sm">
              <span className="font-medium">{item.vaccine}</span>
              {item.dose ? (
                <span className="text-muted-foreground"> — {item.dose}</span>
              ) : null}
              {item.notes ? (
                <span className="mt-1 block text-xs text-muted-foreground">
                  {item.notes}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p
          className="text-sm text-muted-foreground"
          aria-label="Sem vacina prevista nesta faixa"
        >
          —
        </p>
      )}
      {schedule ? (
        <ScheduleProvenance schedule={schedule} className="mt-1" />
      ) : null}
    </section>
  )
}
