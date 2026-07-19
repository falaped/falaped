import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { cn } from "@/lib/utils"
import type { VaccineSchedule } from "@/modules/vaccines/types"

/**
 * Per-dataset provenance caption + the fixed persistent advisory (D-08/D-09).
 *
 * Renders `Fonte: {version} · vigência {mmm/yyyy}` from the dataset's own
 * metadata (NOT a single detached global banner) plus the always-visible,
 * muted advisory. Never destructive/red — this is standing guidance, not an
 * error.
 */
export function ScheduleProvenance({
  schedule,
  className,
}: {
  schedule: Pick<VaccineSchedule, "version" | "effective_date">
  className?: string
}) {
  const effective = parseEffectiveDate(schedule.effective_date)
  const vigencia = effective
    ? format(effective, "MMM/yyyy", { locale: ptBR })
    : schedule.effective_date

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <p className="text-xs tracking-wide text-muted-foreground">
        Fonte: {schedule.version} · vigência {vigencia}
      </p>
      <p className="text-xs tracking-wide text-muted-foreground">
        Confira sempre contra o calendário oficial atual.
      </p>
    </div>
  )
}

/** Parses a `YYYY-MM-DD` date at local midnight (never `new Date("YYYY-MM-DD")`, Pitfall 5). */
function parseEffectiveDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}
