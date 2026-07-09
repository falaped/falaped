"use client"

import { useMemo, useState } from "react"
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Button } from "@/components/ui/button"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import {
  classifyGrowthByZScore,
  percentilePositionLabel,
  type GrowthClassification,
} from "@/lib/growth-classification"
import {
  getReferenceTable,
  hasIntergrowthTable,
  type GrowthIndicator,
  type GrowthReferenceTable,
} from "@/lib/growth-reference"
import { resolveReferenceStandard } from "@/lib/growth-reference/preterm-transition"
import {
  lmsValueAtZ,
  lmsZScore,
  percentileFromZ,
  PERCENTILE_Z_MAP,
  type Lms,
} from "@/lib/lms-zscore"
import type { PatientBmiUiStatus } from "@/lib/patient-bmi-ui-status"
import { cn } from "@/lib/utils"
import type { Patient } from "@/modules/patients/types"
import type { Measurement } from "@/modules/patient-growth/types"

import { GrowthPositionReadout } from "./growth-position-readout"

type BandMode = "percentil" | "z"
type AgeBasis = "chronological" | "corrected"

const PRETERM_THRESHOLD_WEEKS = 37

/** z-score band lines drawn in the escore-z view (−3..+3). */
const Z_LINES = [-3, -2, -1, 0, 1, 2, 3]

/** PT-BR indicator noun for position labels + y-axis. */
const INDICATOR_META: Record<
  GrowthIndicator,
  { noun: string; unit: string; toValue: (m: Measurement) => number | null }
> = {
  "weight-for-age": {
    noun: "Peso",
    unit: "kg",
    toValue: (m) => (m.weight_grams == null ? null : m.weight_grams / 1000),
  },
  "height-for-age": {
    noun: "Estatura",
    unit: "cm",
    toValue: (m) => (m.length_height_mm == null ? null : m.length_height_mm / 10),
  },
  "bmi-for-age": {
    noun: "IMC",
    unit: "kg/m²",
    toValue: (m) => {
      if (m.weight_grams == null || m.length_height_mm == null) return null
      const meters = m.length_height_mm / 10 / 100
      if (meters <= 0) return null
      return m.weight_grams / 1000 / (meters * meters)
    },
  },
  "head-circumference-for-age": {
    noun: "PC",
    unit: "cm",
    toValue: (m) =>
      m.head_circumference_mm == null ? null : m.head_circumference_mm / 10,
  },
}

/** Interpolate LMS between the two nearest monthly rows for a fractional age. */
function lmsAtAge(
  rows: { ageMonths: number; L: number; M: number; S: number }[],
  ageMonths: number,
): Lms | null {
  if (rows.length === 0) return null
  if (ageMonths <= rows[0].ageMonths) return rows[0]
  const last = rows[rows.length - 1]
  if (ageMonths >= last.ageMonths) return last
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i]
    const b = rows[i + 1]
    if (ageMonths >= a.ageMonths && ageMonths <= b.ageMonths) {
      const t = (ageMonths - a.ageMonths) / (b.ageMonths - a.ageMonths)
      return {
        L: a.L + (b.L - a.L) * t,
        M: a.M + (b.M - a.M) * t,
        S: a.S + (b.S - a.S) * t,
      }
    }
  }
  return last
}

/** Format a yyyy-mm-dd date-only string as dd/mm/aaaa without timezone drift. */
function formatMeasuredOn(iso: string): string {
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

type PatientPoint = {
  ageMonths: number
  value: number
  measuredOn: string
  z: number
  percentile: number
  classification: GrowthClassification
  positionLabel: string
  basis: AgeBasis
}

export function GrowthChart({
  indicator,
  patient,
  measurements,
}: {
  indicator: GrowthIndicator
  patient: Patient
  measurements: Measurement[]
}) {
  const isPreterm =
    typeof patient.gestational_age_weeks === "number" &&
    patient.gestational_age_weeks < PRETERM_THRESHOLD_WEEKS

  const [bandMode, setBandMode] = useState<BandMode>("percentil")
  const [ageBasis, setAgeBasis] = useState<AgeBasis>(
    isPreterm ? "corrected" : "chronological",
  )

  const meta = INDICATOR_META[indicator]

  // Sex-specific curves (Pitfall 5): no sex → no reference table (guard below).
  const sex = patient.sex
  const table = sex == null ? null : getReferenceTable("WHO", indicator, sex)

  // For a preterm infant viewed on the corrected-age axis, draw INTERGROWTH-21st
  // over the pre-term segment (corrected months < 0) and hand off to WHO from
  // corrected term onward (D-04 / RESEARCH A1). Only when the indicator has an
  // INTERGROWTH table (BMI stays WHO-only) and we are on the corrected axis.
  const intergrowthTable =
    sex != null &&
    isPreterm &&
    ageBasis === "corrected" &&
    hasIntergrowthTable(indicator)
      ? getReferenceTable("intergrowth", indicator, sex)
      : null

  // x-domain: extend to the INTERGROWTH pre-term floor when present, else WHO 0.
  const ageMin = intergrowthTable?.ageMin ?? table?.ageMin ?? 0
  const ageMax = table?.ageMax ?? 0

  // z-score / percentile lines to draw, shared by both standards + both toggle modes.
  const zLines = useMemo(
    () =>
      bandMode === "percentil"
        ? PERCENTILE_Z_MAP.map((p) => ({
            key: `P${p.percentile}`,
            z: p.z,
            emphasized: p.percentile === 50,
          }))
        : Z_LINES.map((z) => ({
            key: z === 0 ? "z0" : `z${z > 0 ? "+" : ""}${z}`,
            z,
            emphasized: z === 0,
          })),
    [bandMode],
  )

  // Reference band lines — evaluated from the SAME LMS dataset for both toggle modes.
  // Two contiguous segments on the corrected-age axis for preterm: INTERGROWTH rows
  // with ageMonths < 0 (through corrected term for a seamless join) + WHO rows from
  // corrected term (ageMonths >= 0). Non-preterm / WHO-only: a single WHO segment.
  const referenceLines = useMemo(() => {
    if (table == null) return []

    const bandFor = (t: GrowthReferenceTable, key: string, rows: typeof t.rows) =>
      zLines.map((line) => ({
        key: `${key}-${line.key}`,
        z: line.z,
        emphasized: line.emphasized,
        points: rows.map((row) => ({
          ageMonths: row.ageMonths,
          value: lmsValueAtZ(line.z, row),
        })),
      }))

    if (intergrowthTable == null) {
      return bandFor(table, "who", table.rows)
    }
    // INTERGROWTH segment: pre-term rows plus the corrected-term row (ageMonths 0)
    // so it visually meets the WHO segment which starts there.
    const igRows = intergrowthTable.rows.filter((r) => r.ageMonths <= 0)
    const whoRows = table.rows.filter((r) => r.ageMonths >= 0)
    return [
      ...bandFor(intergrowthTable, "ig", igRows),
      ...bandFor(table, "who", whoRows),
    ]
  }, [table, intergrowthTable, zLines])

  // Patient points positioned by pediatric age (corrected to 36m for preterm).
  const patientPoints = useMemo<PatientPoint[]>(() => {
    if (table == null) return []
    const points: PatientPoint[] = []
    for (const m of measurements) {
      const value = meta.toValue(m)
      if (value == null) continue

      const age = computePediatricAge(
        patient.birth_date,
        new Date(`${m.measured_on}T12:00:00`),
        patient.gestational_age_weeks,
        { correctedAgeCutoffMonths: 36 }, // GROWTH_CORRECTED_AGE_CUTOFF_MONTHS (D-05)
      )
      if (age.status !== "ok" || age.totalDays == null) continue

      const chronoMonths = age.totalDays / 30.4375
      const correctedMonths =
        age.corrected != null
          ? chronoMonths -
            ((patient.gestational_age_weeks
              ? 40 - patient.gestational_age_weeks
              : 0) *
              7) /
              30.4375
          : null

      const activeMonths =
        ageBasis === "corrected" && correctedMonths != null
          ? correctedMonths
          : chronoMonths
      if (activeMonths < ageMin || activeMonths > ageMax) continue

      // On the corrected axis a pre-term point (corrected months < 0) is scored
      // against INTERGROWTH-21st, then WHO from corrected term onward (D-04 / A1).
      const standard =
        ageBasis === "corrected"
          ? resolveReferenceStandard({
              gestationalAgeWeeks: patient.gestational_age_weeks,
              correctedAgeMonths: activeMonths,
            })
          : "WHO"
      const scoringRows =
        standard === "intergrowth" && intergrowthTable != null
          ? intergrowthTable.rows
          : table.rows

      const lms = lmsAtAge(scoringRows, activeMonths)
      if (lms == null) continue
      const z = lmsZScore(value, lms)
      points.push({
        ageMonths: Number(activeMonths.toFixed(2)),
        value: Number(value.toFixed(2)),
        measuredOn: m.measured_on,
        z,
        percentile: percentileFromZ(z),
        classification: classifyGrowthByZScore(z, indicator),
        positionLabel: percentilePositionLabel(z, meta.noun),
        basis: ageBasis,
      })
    }
    return points.sort((a, b) => a.ageMonths - b.ageMonths)
  }, [
    measurements,
    meta,
    patient,
    ageBasis,
    table,
    intergrowthTable,
    ageMin,
    ageMax,
    indicator,
  ])

  // All hooks are called above; now it is safe to branch on the null-sex prompt state.
  if (table == null) {
    return (
      <EmptyState
        heading="Informe o sexo do paciente"
        body="A curva de crescimento é específica por sexo. Edite o paciente e informe o sexo para exibir a referência da OMS."
      />
    )
  }

  const hasPoints = patientPoints.length > 0
  const latest =
    hasPoints
      ? patientPoints.reduce((a, b) =>
          b.measuredOn > a.measuredOn ? b : a,
        )
      : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          value={bandMode}
          onChange={(v) => setBandMode(v as BandMode)}
          options={[
            { value: "percentil", label: "Percentil" },
            { value: "z", label: "Escore-z" },
          ]}
        />
        {isPreterm ? (
          <ToggleGroup
            value={ageBasis}
            onChange={(v) => setAgeBasis(v as AgeBasis)}
            options={[
              { value: "chronological", label: "Idade cronológica" },
              { value: "corrected", label: "Idade corrigida" },
            ]}
          />
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              type="number"
              dataKey="ageMonths"
              domain={[ageMin, ageMax]}
              tick={{ fontSize: 11 }}
              label={{ value: "Idade (meses)", position: "insideBottom", offset: -4, fontSize: 11 }}
            />
            <YAxis
              type="number"
              tick={{ fontSize: 11 }}
              width={44}
              label={{ value: meta.unit, angle: -90, position: "insideLeft", fontSize: 11 }}
            />
            <Tooltip
              formatter={(value) => Number(value).toFixed(2).replace(".", ",")}
              labelFormatter={(label) => `${Math.round(Number(label))} meses`}
            />
            {referenceLines.map((line) => (
              <Line
                key={line.key}
                data={line.points}
                dataKey="value"
                type="monotone"
                dot={false}
                isAnimationActive={false}
                stroke={line.emphasized ? "var(--chart-1)" : "var(--muted-foreground)"}
                strokeOpacity={line.emphasized ? 1 : 0.35}
                strokeWidth={line.emphasized ? 2 : 1}
              />
            ))}
            <Scatter
              data={patientPoints}
              dataKey="value"
              fill="var(--primary)"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {!hasPoints ? (
          <p className="mt-2 text-center text-sm text-muted-foreground">
            A curva aparece aqui quando houver medições registradas.
          </p>
        ) : null}

        {intergrowthTable != null ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Fonte: Intergrowth-21st · RN/prematuro (segmento pré-termo)
          </p>
        ) : null}
        <p
          className={cn(
            "text-xs text-muted-foreground",
            intergrowthTable != null ? "mt-1" : "mt-3",
          )}
        >
          Fonte: OMS (WHO) · faixa {table.ageMin}–{table.ageMax} meses
          {intergrowthTable != null ? " (a partir do termo corrigido)" : ""}
        </p>
        {isPreterm ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Prematuro (&lt; 37 sem): idade corrigida aplicada até 36 meses.
          </p>
        ) : null}
      </div>

      {latest ? (
        <GrowthPositionReadout
          measuredOnLabel={formatMeasuredOn(latest.measuredOn)}
          percentile={latest.percentile}
          zScore={latest.z}
          classificationLabel={latest.classification.label}
          positionLabel={latest.positionLabel}
          status={latest.classification.status as PatientBmiUiStatus}
        />
      ) : null}
    </div>
  )
}

function ToggleGroup({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="inline-flex rounded-lg bg-muted p-1">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <Button
            key={opt.value}
            type="button"
            size="sm"
            variant="ghost"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-7 px-3 text-xs font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-xs hover:bg-background"
                : "text-muted-foreground hover:bg-transparent hover:text-foreground",
            )}
          >
            {opt.label}
          </Button>
        )
      })}
    </div>
  )
}

function EmptyState({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/5 p-8 text-center">
      <p className="text-sm font-medium text-muted-foreground">{heading}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
