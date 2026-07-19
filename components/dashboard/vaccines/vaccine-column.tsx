import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { VaccineScheduleWithItems } from "@/modules/vaccines/types"
import { ScheduleProvenance } from "./schedule-provenance"

/**
 * Renders one reference dataset (e.g. SUS/PNI, Particular (SBIm)) as a Card: a
 * column header plus its items grouped by age band. NOT a vaccine×age grid,
 * NOT an accordion (C3).
 *
 * Alignment (C3): the column renders EVERY band in the shared `orderedBands`
 * union (computed by the parent across both datasets), not only its own bands.
 * Where this dataset has no vaccine for a band, an explicit `—` empty marker is
 * shown so the two columns read across at the same vertical rhythm instead of
 * silently misaligning.
 *
 * The per-dataset provenance caption + fixed advisory live in the card footer
 * (C6/D-09) — each column shows its own source, never a shared caption.
 */
export function VaccineColumn({
  title,
  schedule,
  orderedBands,
  currentBandLabel,
  className,
}: {
  title: string
  schedule: VaccineScheduleWithItems
  orderedBands: string[]
  /** The `age_label` of the child's current band (patient mode, D-02), or null.
   * When set, the matching band gets the accent highlight + "Idade atual" badge
   * in BOTH columns. Position-only — no diff/pending (D-11). */
  currentBandLabel?: string | null
  className?: string
}) {
  const itemsByBand = groupByAgeBand(schedule.vaccine_schedule_items)

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <CardTitle className="text-lg tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex flex-col gap-6">
          {orderedBands.map((label) => {
            const items = itemsByBand.get(label) ?? []
            const isCurrent = currentBandLabel != null && label === currentBandLabel
            return (
              <section
                key={label}
                aria-label={label}
                aria-current={isCurrent ? "true" : undefined}
                className={cn(
                  "flex flex-col gap-2",
                  // Current-age emphasis (C4): accent left border + subtle bg.
                  // The ONLY place bg-primary/10 appears in the columns.
                  isCurrent &&
                    "-ml-3 rounded-r-sm border-l-2 border-primary bg-primary/10 pl-3 pr-2 py-2",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
                    {label}
                  </h3>
                  {/* Color + text (Accessibility): never color alone. */}
                  {isCurrent ? (
                    <Badge className="shrink-0 text-[10px] uppercase tracking-wide">
                      Idade atual
                    </Badge>
                  ) : null}
                </div>
                {items.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {items.map((item) => (
                      <li key={item.id} className="text-sm">
                        <span className="font-medium">{item.vaccine}</span>
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
              </section>
            )
          })}
        </div>
      </CardContent>
      <CardFooter>
        <ScheduleProvenance schedule={schedule} />
      </CardFooter>
    </Card>
  )
}

/** Groups items by distinct `age_label` (input is pre-sorted by `sort_order`). */
function groupByAgeBand(
  items: VaccineScheduleWithItems["vaccine_schedule_items"],
): Map<string, VaccineScheduleWithItems["vaccine_schedule_items"]> {
  const byLabel = new Map<
    string,
    VaccineScheduleWithItems["vaccine_schedule_items"]
  >()
  for (const item of items) {
    const existing = byLabel.get(item.age_label)
    if (existing) {
      existing.push(item)
    } else {
      byLabel.set(item.age_label, [item])
    }
  }
  return byLabel
}
