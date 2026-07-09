"use client"

import type { PatientBmiUiStatus } from "@/lib/patient-bmi-ui-status"
import { cn } from "@/lib/utils"

/** Position status → border/bg tokens. Same color language as the BMI card (D-13). */
function statusClass(status: PatientBmiUiStatus): string {
  if (status === "good") return "border-chart-2/50 bg-chart-2/10"
  if (status === "warn") return "border-chart-4/55 bg-chart-4/10"
  return "border-destructive/50 bg-destructive/10"
}

/** Format a z-score with a sign and 2 decimals (e.g. `+1.23`, `-0.45`). */
function formatZ(z: number): string {
  const sign = z >= 0 ? "+" : "−"
  return `${sign}${Math.abs(z).toFixed(2).replace(".", ",")}`
}

/** Format a percentile: exact whole number in-band, `> P97` / `< P3` out-of-band. */
function formatPercentile(percentile: number): string {
  if (percentile > 97) return "> P97"
  if (percentile < 3) return "< P3"
  return `P${Math.round(percentile)}`
}

/**
 * Per-measurement position readout (D-13): percentile + z-score + WHO classification,
 * colored via the shared good/warn/bad map. Mirrors the MetricTile visual.
 */
export function GrowthPositionReadout({
  measuredOnLabel,
  percentile,
  zScore,
  classificationLabel,
  positionLabel,
  status,
}: {
  measuredOnLabel: string
  percentile: number
  zScore: number
  classificationLabel: string
  positionLabel: string
  status: PatientBmiUiStatus
}) {
  return (
    <div className={cn("flex flex-col rounded-lg border p-4", statusClass(status))}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Posição · {measuredOnLabel}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {classificationLabel}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-3">
        <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
          {formatPercentile(percentile)}
        </p>
        <p className="text-lg font-semibold tabular-nums text-muted-foreground">
          z {formatZ(zScore)}
        </p>
      </div>
      <p className="mt-0.5 text-sm text-muted-foreground">{positionLabel}</p>
    </div>
  )
}
