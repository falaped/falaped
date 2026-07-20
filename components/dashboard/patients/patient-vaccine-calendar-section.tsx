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
import { bandForItemMonths } from "@/lib/vaccine-bands"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScheduleProvenance } from "@/components/dashboard/vaccines/schedule-provenance"
import { togglePatientVaccineDoseAction } from "@/actions"
import type {
  VaccineScheduleItem,
  VaccineScheduleWithItems,
} from "@/modules/vaccines/types"

/**
 * Deep brand-blue for accent TEXT on light tints. The theme `--primary` (oklch
 * 0.76) is intentionally light for fills/badges, but reads washed-out as text on
 * white; this is the readable deep variant used by the approved design for the
 * icon chip, the active band label and current-band titles.
 */
const ACCENT_TEXT = "text-[oklch(0.52_0.12_255.41)]"

/**
 * "Calendário vacinal" section in the patient ficha (VAC-05, pulled forward).
 *
 * Two views over the SAME data (a tab switches between them):
 * - **Por idade** — an AGE TIMELINE over the reference calendar: one step per age
 *   band (the ordered UNION of canonical bands across BOTH datasets, SUS/PNI +
 *   Particular/SBIm). Each step carries a progress dot (done / partial / empty)
 *   and clicking it jumps to that band; the INITIAL band is the child's CURRENT
 *   age band (badge + timeline tick). The active band shows its SUS and SBIm
 *   vaccines in two columns.
 * - **Visão geral** — every band stacked at once, each with its state node, tally
 *   and both datasets, so the whole carteira reads top-to-bottom.
 *
 * The current band is resolved with the SAME engine + helpers the calendar uses
 * (`computeCurrentMonths` → `resolveCurrentBandLabel`), so positioning agrees.
 *
 * GRAIN (physician decision): the toggle is PER DISPLAYED ROW — SUS and SBIm
 * items are independent, keyed to the reference item id. Toggling calls
 * `togglePatientVaccineDoseAction` with optimistic UI (revert + PT-BR toast on
 * failure). Position-only (D-11): the toggle records applied doses but drives
 * NO pending/late diff (Phase 6). Toggling in either view updates both, the
 * timeline dots, the per-band tallies and the header progress — all derive from
 * the shared `taken` Set.
 *
 * Graceful degradation: both datasets null (upstream read error) → renders
 * nothing rather than crashing the ficha (WR-01). No DOB → timeline still works
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
  // Distinct from `activeIndex`: the band matching the child's age (badge/tick),
  // only when a current band actually resolved (DOB present).
  const currentIndex = currentBandLabel != null ? initialIndex : -1

  const susItems = itemsForBand(sus, activeLabel)
  const sbimItems = itemsForBand(sbim, activeLabel)
  const hasAnyItems = susItems.length > 0 || sbimItems.length > 0

  const activeItemIds = bandItemIds[activeIndex] ?? []
  const bandTakenCount = countTaken(activeItemIds, taken)
  const overallTaken = countTaken(allItemIds, taken)
  const overallTotal = allItemIds.length
  const overallPct =
    overallTotal > 0 ? Math.round((overallTaken / overallTotal) * 100) : 0

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
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10",
                ACCENT_TEXT,
              )}
            >
              <SyringeIcon className="h-4 w-4" />
            </span>
            <CardTitle className="text-lg tracking-tight">
              Calendário vacinal
            </CardTitle>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <div className="text-lg font-semibold leading-none tracking-tight tabular-nums">
              <span className="text-emerald-600 dark:text-emerald-500">
                {overallTaken}
              </span>
              /{overallTotal}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              Tomadas
            </div>
            <div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-600 transition-[width] duration-500 dark:bg-emerald-500"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>
        </div>
        <CardDescription className="mt-2">
          Navegue pelas faixas de idade e marque as vacinas já tomadas — SUS/PNI
          e particular (SBIm). Somente posição por idade.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <Tabs defaultValue="idade" className="gap-4">
          <TabsList className="w-fit lg:w-fit">
            <TabsTrigger value="idade" className="flex-none px-3">
              Por idade
            </TabsTrigger>
            <TabsTrigger value="geral" className="flex-none px-3">
              Visão geral
            </TabsTrigger>
          </TabsList>

          {/* ---------- View: Por idade ---------- */}
          <TabsContent value="idade" className="flex flex-col gap-4">
            {/* Age timeline: one step per band, clickable, with a spine line,
                progress dots and a tick under the child's current band. */}
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-card to-transparent"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-card to-transparent"
              />
              <div
                className="flex gap-0 overflow-x-auto px-1 pb-2 pt-1"
                role="tablist"
                aria-label="Faixas de idade"
              >
                {orderedBands.map((label, i) => {
                  const status = computeBandStatus(bandItemIds[i] ?? [], taken)
                  const isActive = i === activeIndex
                  const isCurrent = i === currentIndex
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
                        "group relative flex flex-[1_0_auto] flex-col items-center gap-2 rounded-md px-1 pb-1 pt-1.5",
                        "text-muted-foreground transition-colors hover:text-foreground",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        "before:absolute before:left-0 before:right-0 before:top-[13px] before:border-t before:border-dashed before:border-border before:content-['']",
                        "first:before:left-1/2 last:before:right-1/2",
                        isActive && ACCENT_TEXT,
                      )}
                    >
                      <TimelineDot status={status} isActive={isActive} />
                      <span
                        className={cn(
                          "relative whitespace-nowrap rounded-full px-2 py-0.5 text-xs transition-colors",
                          isActive && cn("bg-primary/10 font-semibold", ACCENT_TEXT),
                        )}
                      >
                        {label}
                      </span>
                      {isCurrent ? (
                        <span
                          aria-hidden
                          className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary"
                        />
                      ) : null}
                    </button>
                  )
                })}
              </div>
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
              <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
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
          </TabsContent>

          {/* ---------- View: Visão geral ---------- */}
          <TabsContent value="geral" className="flex flex-col gap-2">
            {orderedBands.map((label, i) => (
              <GeneralBand
                key={label}
                label={label}
                status={computeBandStatus(bandItemIds[i] ?? [], taken)}
                isCurrentBand={i === currentIndex}
                takenCount={countTaken(bandItemIds[i] ?? [], taken)}
                totalCount={(bandItemIds[i] ?? []).length}
                susItems={itemsForBand(sus, label)}
                sbimItems={itemsForBand(sbim, label)}
                taken={taken}
                pendingIds={pendingIds}
                onToggle={handleToggle}
              />
            ))}
          </TabsContent>
        </Tabs>

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
 * step gets a primary ring + slight scale so navigation reads distinctly from
 * progress. Sits above the timeline spine line.
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
        "relative z-10 h-3 w-3 rounded-full border bg-card transition-all",
        status === "done" &&
          "border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500",
        status === "partial" &&
          "border-emerald-600 bg-gradient-to-r from-emerald-600 from-50% to-card to-50% dark:border-emerald-500 dark:from-emerald-500",
        status === "empty" && "border-border bg-card",
        status === "none" && "border-dashed border-border bg-card",
        isActive && "scale-110 border-primary ring-4 ring-primary/15",
      )}
    />
  )
}

/**
 * Shared toggle list of vaccine items (checkbox rows). Each row is a full-width
 * target; taken rows read with a success-colored, animated check and a muted
 * label. Empty items list renders a discreet "sem vacina prevista". Reused by
 * the per-band column and the "Visão geral" band sections.
 */
function VaccineToggleList({
  items,
  label,
  taken,
  pendingIds,
  onToggle,
}: {
  items: VaccineScheduleItem[]
  label: string
  taken: Set<string>
  pendingIds: Set<string>
  onToggle: (itemId: string, nextTaken: boolean) => void
}) {
  if (items.length === 0) {
    return (
      <p
        className="px-2 py-1 text-sm text-muted-foreground"
        aria-label="Sem vacina prevista nesta faixa"
      >
        — sem vacina prevista
      </p>
    )
  }
  return (
    <ul
      className="flex flex-col divide-y divide-border/50"
      role="group"
      aria-label={label}
    >
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
                "flex w-full items-start gap-3 rounded-lg px-2.5 py-2.5 text-left",
                "transition-colors hover:bg-muted/70",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:cursor-not-allowed disabled:opacity-60",
                isTaken && "bg-emerald-600/[0.05] dark:bg-emerald-500/[0.06]",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "mt-px flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-[7px] border-[1.5px] transition-all active:scale-90",
                  isTaken
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 dark:border-emerald-500 dark:bg-emerald-500"
                    : "border-primary/70 bg-card group-hover:border-primary",
                )}
              >
                <CheckIcon
                  className={cn(
                    "h-3 w-3 transition-all duration-150",
                    isTaken ? "scale-100 opacity-100" : "scale-50 opacity-0",
                  )}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "text-sm font-medium leading-snug",
                    isTaken && "text-muted-foreground",
                  )}
                >
                  {item.vaccine}
                </span>
                {item.notes ? (
                  <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                    {item.notes}
                  </span>
                ) : null}
              </span>
              {item.dose ? (
                <span
                  className={cn(
                    "mt-px shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium",
                    isTaken
                      ? "bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {item.dose}
                </span>
              ) : null}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * One dataset's items for the active band as a bordered card. The header shows
 * the dataset name + a per-column tally (taken count in the success color); the
 * current band gets the accent treatment (accent ring + subtle bg). Provenance
 * (D-09) stays at the column footer.
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
        "flex h-full flex-col rounded-xl border border-border bg-card p-3 transition-[box-shadow,border-color]",
        isCurrentBand && "border-primary/60 bg-primary/[0.06] ring-[3px] ring-primary/10",
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

      <VaccineToggleList
        items={items}
        label={title}
        taken={taken}
        pendingIds={pendingIds}
        onToggle={onToggle}
      />

      {schedule ? (
        <ScheduleProvenance
          schedule={schedule}
          className="mt-auto border-t border-border pt-3"
        />
      ) : null}
    </section>
  )
}

/**
 * One age band in the "Visão geral" view: a state node + label + current-band
 * badge + tally with a mini progress bar, and both datasets' items side by side.
 * The current band section gets the accent treatment. Uses the SAME toggle rows
 * as the per-band view so behavior is identical across views.
 */
function GeneralBand({
  label,
  status,
  isCurrentBand,
  takenCount,
  totalCount,
  susItems,
  sbimItems,
  taken,
  pendingIds,
  onToggle,
}: {
  label: string
  status: BandStatus
  isCurrentBand: boolean
  takenCount: number
  totalCount: number
  susItems: VaccineScheduleItem[]
  sbimItems: VaccineScheduleItem[]
  taken: Set<string>
  pendingIds: Set<string>
  onToggle: (itemId: string, nextTaken: boolean) => void
}) {
  const pct = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0
  return (
    <section
      aria-label={label}
      aria-current={isCurrentBand ? "true" : undefined}
      className={cn(
        "rounded-xl border border-border bg-card p-3",
        isCurrentBand && "border-primary/60 bg-primary/[0.06] ring-[3px] ring-primary/10",
      )}
    >
      <div className="mb-2.5 flex items-center gap-2.5">
        <span
          aria-hidden
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] text-white transition-colors",
            status === "done" &&
              "border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500",
            status === "partial" &&
              "border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-500",
            status === "empty" && "border-border",
            status === "none" && "border-dashed border-border",
            isCurrentBand && "border-primary bg-primary",
          )}
        >
          {status === "done" ? <CheckIcon className="h-3 w-3" /> : null}
        </span>
        <h4
          className={cn(
            "text-sm font-semibold tracking-tight",
            isCurrentBand && ACCENT_TEXT,
          )}
        >
          {label}
        </h4>
        {isCurrentBand ? (
          <Badge className="text-[10px] uppercase tracking-wide">
            Idade atual
          </Badge>
        ) : null}
        <div className="ml-auto flex items-center gap-2.5">
          {totalCount > 0 ? (
            <>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                <span className="font-semibold text-emerald-600 dark:text-emerald-500">
                  {takenCount}
                </span>
                /{totalCount}
              </span>
              <span className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
                  style={{ width: `${pct}%` }}
                />
              </span>
            </>
          ) : (
            <span className="text-[11px] text-muted-foreground">sem vacina</span>
          )}
        </div>
      </div>

      {totalCount > 0 ? (
        <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
          <div>
            <p className="mb-1 pl-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
              SUS / PNI
            </p>
            <VaccineToggleList
              items={susItems}
              label={`SUS / PNI — ${label}`}
              taken={taken}
              pendingIds={pendingIds}
              onToggle={onToggle}
            />
          </div>
          <div>
            <p className="mb-1 pl-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
              Particular (SBIm)
            </p>
            <VaccineToggleList
              items={sbimItems}
              label={`Particular (SBIm) — ${label}`}
              taken={taken}
              pendingIds={pendingIds}
              onToggle={onToggle}
            />
          </div>
        </div>
      ) : (
        <p className="px-2 py-1 text-sm text-muted-foreground">
          — sem vacina prevista nesta faixa
        </p>
      )}
    </section>
  )
}

/**
 * Filters ONE dataset's items to the given canonical band, grouping each item by
 * the band its `age_months` maps to (`bandForItemMonths`), NOT by `age_label` —
 * so grouping is data-independent and aligns with the canonical `orderedBands`.
 * Preserves source order (items arrive pre-sorted by `sort_order`). Empty when
 * the dataset is absent or has no item in that band. Pure.
 */
function itemsForBand(
  schedule: VaccineScheduleWithItems | null,
  bandLabel: string,
): VaccineScheduleItem[] {
  if (!schedule) return []
  return schedule.vaccine_schedule_items.filter(
    (item) => bandForItemMonths(item.age_months)?.label === bandLabel,
  )
}
