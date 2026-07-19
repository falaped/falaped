"use client"

import { useMemo, useState, useTransition } from "react"
import { ChevronLeftIcon, ChevronRightIcon, SyringeIcon } from "lucide-react"
import { toast } from "sonner"

import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { computeCurrentMonths } from "@/lib/vaccine-current-band"
import { resolveCurrentBandLabel } from "@/lib/vaccine-current-band-items"
import {
  computeOrderedBands,
  resolveCurrentBandIndex,
} from "@/lib/vaccine-band-carousel"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScheduleProvenance } from "@/components/dashboard/vaccines/schedule-provenance"
import { togglePatientVaccineDoseAction } from "@/actions"
import type {
  VaccineScheduleItem,
  VaccineScheduleWithItems,
} from "@/modules/vaccines/types"

/**
 * "Calendário vacinal" section in the patient ficha (VAC-05, pulled forward).
 *
 * A CAROUSEL over the reference calendar: one slide per age band (the ordered
 * UNION of `age_label`s across BOTH datasets, SUS/PNI + Particular/SBIm). The
 * INITIAL slide is the child's CURRENT age band ("Vacinas para a idade atual");
 * the physician navigates prev/next between ages. Each slide shows that band's
 * SUS and SBIm vaccines together, each row with a checkbox reflecting whether
 * the patient has already TAKEN that specific reference item.
 *
 * The current band is resolved with the SAME engine + helpers the calendar uses
 * (`computeCurrentMonths` → `resolveCurrentBandLabel`), so positioning agrees.
 * Preterm infants use the CORRECTED age (CR-01) via `corrected.totalDays`; term
 * / missing GA falls back to chronological.
 *
 * GRAIN (physician decision): the checkbox is PER DISPLAYED ROW — SUS and SBIm
 * items are independent, keyed to the reference item id. Toggling calls
 * `togglePatientVaccineDoseAction` with optimistic UI (revert + PT-BR toast on
 * failure). Position-only (D-11): the checkbox records applied doses but drives
 * NO pending/late diff (Phase 6).
 *
 * Graceful degradation: both datasets null (upstream read error) → renders
 * nothing rather than crashing the ficha (WR-01). No DOB → carousel still works
 * but opens on the first band (no current-age resolution).
 */
export function PatientVaccineCalendarSection({
  patientId,
  birthDate,
  gestationalAgeWeeks,
  sus,
  sbim,
  takenItemIds,
  className,
}: {
  patientId: string
  birthDate?: string | null
  gestationalAgeWeeks?: number | null
  sus: VaccineScheduleWithItems | null
  sbim: VaccineScheduleWithItems | null
  /** Reference item ids already marked TAKEN for this patient. */
  takenItemIds: string[]
  className?: string
}) {
  // No reference data at all (both reads failed/unseeded) → nothing to show.
  const orderedBands = useMemo(
    () => computeOrderedBands([sus, sbim]),
    [sus, sbim],
  )

  // Resolve the current band exactly as the calendar does (corrected age for
  // preterm, chronological fallback). Standalone / no DOB → null. Position-only.
  const currentBandLabel = useMemo(() => {
    if (!birthDate) return null
    const months = computeCurrentMonths(
      computePediatricAge(birthDate, new Date(), gestationalAgeWeeks),
    )
    return resolveCurrentBandLabel([sus, sbim], months)
  }, [birthDate, gestationalAgeWeeks, sus, sbim])

  const initialIndex = useMemo(
    () => resolveCurrentBandIndex(orderedBands, currentBandLabel),
    [orderedBands, currentBandLabel],
  )

  const [index, setIndex] = useState(initialIndex)
  // Local optimistic taken state (Set of reference item ids).
  const [taken, setTaken] = useState<Set<string>>(() => new Set(takenItemIds))
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set())
  const [, startTransition] = useTransition()

  if (orderedBands.length === 0) return null

  // Clamp defensively in case the band list changed between renders.
  const activeIndex = Math.min(Math.max(index, 0), orderedBands.length - 1)
  const activeLabel = orderedBands[activeIndex]
  const isCurrentBand =
    currentBandLabel != null && activeLabel === currentBandLabel

  const susItems = itemsForBand(sus, activeLabel)
  const sbimItems = itemsForBand(sbim, activeLabel)
  const hasAnyItems = susItems.length > 0 || sbimItems.length > 0

  function goPrev() {
    setIndex((i) => Math.max(0, i - 1))
  }
  function goNext() {
    setIndex((i) => Math.min(orderedBands.length - 1, i + 1))
  }

  function handleToggle(itemId: string, nextTaken: boolean) {
    // Optimistic update.
    setTaken((prev) => {
      const next = new Set(prev)
      if (nextTaken) next.add(itemId)
      else next.delete(itemId)
      return next
    })
    setPendingIds((prev) => new Set(prev).add(itemId))

    startTransition(async () => {
      const result = await togglePatientVaccineDoseAction({
        patientId,
        scheduleItemId: itemId,
        taken: nextTaken,
      })
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
      if (!result.ok) {
        // Revert on failure.
        setTaken((prev) => {
          const next = new Set(prev)
          if (nextTaken) next.delete(itemId)
          else next.add(itemId)
          return next
        })
        toast.error(getFriendlyToastMessage(result.error))
      }
    })
  }

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg tracking-tight">
              <SyringeIcon
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              Calendário vacinal
            </CardTitle>
            <CardDescription className="mt-1">
              Navegue pelas faixas de idade e marque as vacinas já tomadas —
              SUS/PNI e particular (SBIm). Somente posição por idade.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Carousel controls: prev/next + position indicator. */}
        <div
          className="flex items-center justify-between gap-3"
          role="group"
          aria-label="Navegação por faixa de idade"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={goPrev}
            disabled={activeIndex === 0}
            aria-label="Faixa anterior"
          >
            <ChevronLeftIcon className="h-4 w-4" aria-hidden />
          </Button>

          <div className="flex min-w-0 flex-col items-center gap-1 text-center">
            <div className="flex items-center gap-2">
              <h3
                aria-live="polite"
                className="truncate text-sm font-medium tracking-tight"
              >
                {activeLabel}
              </h3>
              {isCurrentBand ? (
                <Badge className="shrink-0 text-[10px] uppercase tracking-wide">
                  Idade atual
                </Badge>
              ) : null}
            </div>
            <span className="text-xs text-muted-foreground">
              {activeIndex + 1}/{orderedBands.length}
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={goNext}
            disabled={activeIndex === orderedBands.length - 1}
            aria-label="Próxima faixa"
          >
            <ChevronRightIcon className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        {/* Active slide: SUS + SBIm columns for this band. */}
        {hasAnyItems ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DatasetColumn
              title="SUS/PNI"
              schedule={sus}
              items={susItems}
              isCurrentBand={isCurrentBand}
              taken={taken}
              pendingIds={pendingIds}
              onToggle={handleToggle}
            />
            <DatasetColumn
              title="Particular (SBIm)"
              schedule={sbim}
              items={sbimItems}
              isCurrentBand={isCurrentBand}
              taken={taken}
              pendingIds={pendingIds}
              onToggle={handleToggle}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma vacina prevista para esta faixa de idade.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * One dataset's items for the active band, each row a checkbox reflecting the
 * patient's TAKEN state. The current band gets the SAME accent idiom the
 * calendar uses (accent left border + subtle bg). Keeps its own provenance
 * caption (D-09).
 */
function DatasetColumn({
  title,
  schedule,
  items,
  isCurrentBand,
  taken,
  pendingIds,
  onToggle,
}: {
  title: string
  schedule: VaccineScheduleWithItems | null
  items: VaccineScheduleItem[]
  isCurrentBand: boolean
  taken: Set<string>
  pendingIds: Set<string>
  onToggle: (itemId: string, nextTaken: boolean) => void
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h4 className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {items.length > 0 ? (
        <ul
          aria-current={isCurrentBand ? "true" : undefined}
          className={cn(
            "flex flex-col gap-2",
            isCurrentBand &&
              "-ml-3 rounded-r-sm border-l-2 border-primary bg-primary/10 py-2 pl-3 pr-2",
          )}
        >
          {items.map((item) => {
            const isTaken = taken.has(item.id)
            const isPending = pendingIds.has(item.id)
            const checkboxId = `vac-dose-${item.id}`
            return (
              <li key={item.id} className="flex items-start gap-2 text-sm">
                <Checkbox
                  id={checkboxId}
                  checked={isTaken}
                  disabled={isPending}
                  onCheckedChange={(value) =>
                    onToggle(item.id, value === true)
                  }
                  className="mt-0.5"
                  aria-label={`Marcar ${item.vaccine} como tomada`}
                />
                <label htmlFor={checkboxId} className="min-w-0 cursor-pointer">
                  <span className="font-medium">{item.vaccine}</span>
                  {item.dose ? (
                    <span className="text-muted-foreground"> — {item.dose}</span>
                  ) : null}
                  {item.notes ? (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {item.notes}
                    </span>
                  ) : null}
                </label>
              </li>
            )
          })}
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

/**
 * Filters ONE dataset's items to the given band `age_label`, preserving source
 * order (items arrive pre-sorted by `sort_order`). Empty when the dataset is
 * absent or has no item in that band. Pure.
 */
function itemsForBand(
  schedule: VaccineScheduleWithItems | null,
  bandLabel: string,
): VaccineScheduleItem[] {
  if (!schedule) return []
  return schedule.vaccine_schedule_items.filter(
    (item) => item.age_label === bandLabel,
  )
}
