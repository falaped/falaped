"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowUpRightIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SyringeIcon,
} from "lucide-react"
import { toast } from "sonner"

import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { computeCurrentMonths } from "@/lib/vaccine-current-band"
import { resolveCurrentBandLabel } from "@/lib/vaccine-current-band-items"
import {
  computeOrderedBands,
  resolveCurrentBandIndex,
} from "@/lib/vaccine-band-carousel"
import {
  computeBandStatus,
  countTaken,
  type BandStatus,
} from "@/lib/vaccine-band-status"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
 * An AGE TIMELINE over the reference calendar: one step per age band (the
 * ordered UNION of `age_label`s across BOTH datasets, SUS/PNI + Particular/
 * SBIm). Each step carries a progress dot (done / partial / empty) derived from
 * the taken Set across both datasets, and clicking it jumps to that band. The
 * INITIAL band is the child's CURRENT age band; prev/next arrows flank the slide
 * header as secondary controls. Each band shows its SUS and SBIm vaccines in two
 * columns, each row a clickable toggle reflecting whether the patient has
 * already TAKEN that specific reference item.
 *
 * The current band is resolved with the SAME engine + helpers the calendar uses
 * (`computeCurrentMonths` → `resolveCurrentBandLabel`), so positioning agrees.
 * Preterm infants use the CORRECTED age (CR-01) via `corrected.totalDays`; term
 * / missing GA falls back to chronological.
 *
 * GRAIN (physician decision): the toggle is PER DISPLAYED ROW — SUS and SBIm
 * items are independent, keyed to the reference item id. Toggling calls
 * `togglePatientVaccineDoseAction` with optimistic UI (revert + PT-BR toast on
 * failure). Position-only (D-11): the toggle records applied doses but drives
 * NO pending/late diff (Phase 6).
 *
 * Graceful degradation: both datasets null (upstream read error) → renders
 * nothing rather than crashing the ficha (WR-01). No DOB → timeline still works
 * but opens on the first band (no current-age resolution).
 *
 * PRESENTATION redesign (physician review): the bare prev/next + "3/9" indicator
 * was replaced by a scrollable age timeline with progress dots; columns became
 * bordered cards with per-column tallies; rows became full-width toggle targets
 * with a clear success-colored taken state. Logic/data layer unchanged.
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

  // Reference item ids per band (union across both datasets), used for the
  // timeline progress dots and the per-band / overall tallies. Pure derivation.
  const bandItemIds = useMemo(
    () =>
      orderedBands.map((label) => [
        ...itemsForBand(sus, label).map((item) => item.id),
        ...itemsForBand(sbim, label).map((item) => item.id),
      ]),
    [orderedBands, sus, sbim],
  )
  const allItemIds = useMemo(
    () => bandItemIds.flat(),
    [bandItemIds],
  )

  const [index, setIndex] = useState(initialIndex)
  // WR-01: `useState(initialIndex)` only reads its argument on first render, so a
  // birth_date / gestational_age edit (which re-renders via `router.refresh()`
  // WITHOUT remounting — `key={patient.id}` is unchanged) would leave the slide
  // frozen on the band computed from the OLD DOB while the "Idade atual" badge
  // moves. Re-sync the slide to the resolved current band whenever it changes.
  // Keyed on `currentBandLabel` (not every `initialIndex` recompute) so deliberate
  // user navigation within the same current-band context is preserved.
  useEffect(() => {
    setIndex(initialIndex)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBandLabel])
  // Local optimistic taken state (Set of reference item ids).
  const [taken, setTaken] = useState<Set<string>>(() => new Set(takenItemIds))
  // WR-03: reconcile the optimistic Set with server truth whenever the
  // authoritative `takenItemIds` prop changes (e.g. after `router.refresh()`
  // on a failed toggle, or a patient/ficha reload). `useState` only seeds on
  // first render, so without this the refreshed doses would be ignored.
  const takenKey = useMemo(
    () => [...takenItemIds].sort().join(","),
    [takenItemIds],
  )
  useEffect(() => {
    setTaken(new Set(takenItemIds))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [takenKey])
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set())
  const [, startTransition] = useTransition()
  const stepRefs = useRef<Array<HTMLButtonElement | null>>([])
  const router = useRouter()

  if (orderedBands.length === 0) return null

  // Clamp defensively in case the band list changed between renders.
  const activeIndex = Math.min(Math.max(index, 0), orderedBands.length - 1)
  const activeLabel = orderedBands[activeIndex]
  const isCurrentBand =
    currentBandLabel != null && activeLabel === currentBandLabel

  const susItems = itemsForBand(sus, activeLabel)
  const sbimItems = itemsForBand(sbim, activeLabel)
  const hasAnyItems = susItems.length > 0 || sbimItems.length > 0

  const activeItemIds = bandItemIds[activeIndex] ?? []
  const bandTakenCount = countTaken(activeItemIds, taken)
  const overallTaken = countTaken(allItemIds, taken)
  const overallTotal = allItemIds.length

  function goPrev() {
    setIndex((i) => Math.max(0, i - 1))
  }
  function goNext() {
    setIndex((i) => Math.min(orderedBands.length - 1, i + 1))
  }
  function goTo(target: number) {
    setIndex(target)
    stepRefs.current[target]?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    })
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
        // Optimistic revert (WR-03): re-apply the assumed prior state for an
        // immediate correction, then `router.refresh()` to reconcile the taken
        // Set with server truth. The blind local revert alone can diverge from
        // the DB if the action failed AFTER the row was actually written (e.g.
        // a lost response), so the refresh re-reads the authoritative doses.
        setTaken((prev) => {
          const next = new Set(prev)
          if (nextTaken) next.delete(itemId)
          else next.add(itemId)
          return next
        })
        toast.error(getFriendlyToastMessage(result.error))
        router.refresh()
      }
    })
  }

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
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
          <div className="shrink-0 text-right">
            <div className="text-lg font-semibold tabular-nums tracking-tight leading-none">
              {overallTaken}/{overallTotal}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              Tomadas
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Age timeline: one step per band, clickable, with progress dots. */}
        <div
          className="-mx-1 flex justify-between gap-1 overflow-x-auto px-1 pb-2 pt-1"
          role="tablist"
          aria-label="Faixas de idade"
        >
          {orderedBands.map((label, i) => {
            const status = computeBandStatus(bandItemIds[i] ?? [], taken)
            const isActive = i === activeIndex
            return (
              <button
                key={label}
                ref={(el) => {
                  stepRefs.current[i] = el
                }}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Faixa ${label}`}
                onClick={() => goTo(i)}
                className={cn(
                  "group flex shrink-0 flex-col items-center gap-1.5 rounded-md px-1 py-1",
                  "text-muted-foreground transition-colors hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive && "text-primary",
                )}
              >
                <TimelineDot status={status} isActive={isActive} />
                <span
                  className={cn(
                    "whitespace-nowrap rounded-full px-2 py-0.5 text-xs transition-colors",
                    isActive && "bg-primary/10 font-semibold text-primary",
                  )}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Slide header: large age + Idade atual badge + prev/next + tally. */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={goPrev}
            disabled={activeIndex === 0}
            aria-label="Faixa anterior"
          >
            <ChevronLeftIcon className="h-4 w-4" aria-hidden />
          </Button>

          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3
              aria-live="polite"
              className="text-xl font-semibold tracking-tight"
            >
              {activeLabel}
            </h3>
            {isCurrentBand ? (
              <Badge className="text-[10px] uppercase tracking-wide">
                Idade atual
              </Badge>
            ) : null}
            <span className="ml-auto whitespace-nowrap text-xs tabular-nums text-muted-foreground">
              {bandTakenCount}/{activeItemIds.length} tomadas · faixa{" "}
              {activeIndex + 1}/{orderedBands.length}
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={goNext}
            disabled={activeIndex === orderedBands.length - 1}
            aria-label="Próxima faixa"
          >
            <ChevronRightIcon className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        {/* Active slide: SUS + SBIm columns for this band. */}
        {hasAnyItems ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <DatasetColumn
              title="SUS / PNI"
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
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma vacina prevista para esta faixa de idade.
          </div>
        )}

        {/* Footer: discreet link to the full reference calendar. */}
        <div className="flex justify-end pt-1">
          <a
            href={`/dashboard/vaccines?patientId=${patientId}`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            Ver calendário completo
            <ArrowUpRightIcon className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Age-timeline progress dot. `done` (all taken) → filled success color;
 * `partial` → half-filled success outline; `empty` / `none` → hollow. The active
 * step gets a primary ring so navigation reads distinctly from progress.
 */
function TimelineDot({
  status,
  isActive,
}: {
  status: BandStatus
  isActive: boolean
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "h-2.5 w-2.5 rounded-full border transition-colors",
        status === "done" &&
          "border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500",
        status === "partial" &&
          "border-emerald-600 bg-gradient-to-r from-emerald-600 from-50% to-transparent to-50% dark:border-emerald-500 dark:from-emerald-500",
        (status === "empty" || status === "none") &&
          "border-border bg-card",
        isActive &&
          "border-primary ring-2 ring-primary/20",
      )}
    />
  )
}

/**
 * One dataset's items for the active band as a bordered card. The header shows
 * the dataset name + a per-column tally (taken count in the success color); the
 * current band gets the accent treatment (accent border + subtle bg). Rows are
 * full-width toggle targets; taken rows read with a success-colored check and
 * muted label. Provenance (D-09) stays at the column footer.
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
  const columnItemIds = items.map((item) => item.id)
  const columnTaken = countTaken(columnItemIds, taken)

  return (
    <section
      aria-label={title}
      aria-current={isCurrentBand ? "true" : undefined}
      className={cn(
        "flex flex-col rounded-lg border border-border bg-card p-3",
        isCurrentBand && "border-primary bg-primary/10",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h4>
        {items.length > 0 ? (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            <span className="font-semibold text-emerald-600 dark:text-emerald-500">
              {columnTaken}
            </span>
            /{items.length} tomadas
          </span>
        ) : null}
      </div>

      {items.length > 0 ? (
        <ul className="flex flex-col gap-0.5" role="group" aria-label={title}>
          {items.map((item) => {
            const isTaken = taken.has(item.id)
            const isPending = pendingIds.has(item.id)
            return (
              <li key={item.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isTaken}
                  aria-label={`Marcar ${item.vaccine} como tomada`}
                  disabled={isPending}
                  onClick={() => onToggle(item.id, !isTaken)}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-md p-2 text-left",
                    "transition-colors hover:bg-foreground/5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
                      isTaken
                        ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500"
                        : "border-primary bg-card",
                    )}
                  >
                    <CheckIcon
                      className={cn(
                        "h-3 w-3 transition-opacity",
                        isTaken ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </span>
                  <span className="min-w-0 text-sm">
                    <span
                      className={cn(
                        "font-medium",
                        isTaken && "text-muted-foreground",
                      )}
                    >
                      {item.vaccine}
                    </span>
                    {item.dose ? (
                      <span className="text-muted-foreground">
                        {" "}
                        — {item.dose}
                      </span>
                    ) : null}
                    {item.notes ? (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {item.notes}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p
          className="px-2 py-1 text-sm text-muted-foreground"
          aria-label="Sem vacina prevista nesta faixa"
        >
          — sem vacina prevista
        </p>
      )}

      {schedule ? (
        <ScheduleProvenance
          schedule={schedule}
          className="mt-3 border-t border-border pt-2"
        />
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
