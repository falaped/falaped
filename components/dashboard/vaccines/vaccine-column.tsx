import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { VaccineScheduleWithItems } from "@/modules/vaccines/types"
import { ScheduleProvenance } from "./schedule-provenance"

type AgeBand = {
  label: string
  items: VaccineScheduleWithItems["vaccine_schedule_items"]
}

/**
 * Renders one reference dataset (e.g. SUS/PNI) as a Card: a column header plus
 * its items grouped by age band (grouped by distinct `age_label`, ordered by
 * `sort_order`). NOT a vaccine×age grid, NOT an accordion (C3). The per-dataset
 * provenance caption + fixed advisory live in the card footer (C6).
 */
export function VaccineColumn({
  title,
  schedule,
  className,
}: {
  title: string
  schedule: VaccineScheduleWithItems
  className?: string
}) {
  const bands = groupByAgeBand(schedule.vaccine_schedule_items)

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <CardTitle className="text-lg tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex flex-col gap-6">
          {bands.map((band) => (
            <section
              key={band.label}
              aria-label={band.label}
              className="flex flex-col gap-2"
            >
              <h3 className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
                {band.label}
              </h3>
              <ul className="flex flex-col gap-2">
                {band.items.map((item) => (
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
            </section>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <ScheduleProvenance schedule={schedule} />
      </CardFooter>
    </Card>
  )
}

/** Groups items into ordered age bands by distinct `age_label` (input is pre-sorted by `sort_order`). */
function groupByAgeBand(
  items: VaccineScheduleWithItems["vaccine_schedule_items"],
): AgeBand[] {
  const bands: AgeBand[] = []
  const index = new Map<string, AgeBand>()
  for (const item of items) {
    let band = index.get(item.age_label)
    if (!band) {
      band = { label: item.age_label, items: [] }
      index.set(item.age_label, band)
      bands.push(band)
    }
    band.items.push(item)
  }
  return bands
}
