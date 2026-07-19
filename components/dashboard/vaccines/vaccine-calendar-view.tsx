"use client"

import { cn } from "@/lib/utils"
import type { VaccineScheduleWithItems } from "@/modules/vaccines/types"
import { VaccineColumn } from "./vaccine-column"

/**
 * Reference vaccine calendar view.
 *
 * Foundation slice (05-01): renders a SINGLE column (SUS/PNI) inside the
 * "Criança" area. The prop surface is kept forward-compatible on purpose:
 * plan 02 adds `sbim` (SBIm second column), plan 03 adds `gestante`, and
 * plan 04 adds an optional `birthDate` for the current-age highlight. Keeping
 * the shape stable now avoids churning every consumer later.
 */
export function VaccineCalendarView({
  sus,
  className,
}: {
  sus: VaccineScheduleWithItems
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <VaccineColumn title="SUS/PNI" schedule={sus} />
      </div>
    </div>
  )
}
