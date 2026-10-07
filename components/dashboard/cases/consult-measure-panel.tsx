"use client"

import { useState } from "react"
import { format } from "date-fns"
import { CalendarIcon, CheckIcon, InfoIcon, Loader2Icon, TrendingDownIcon, TrendingUpIcon } from "lucide-react"
import { toast } from "sonner"

import { createMeasurementAction } from "@/actions"
import { AddFieldButton, PanelFooter } from "@/components/dashboard/cases/consult-document"
import { GrowthChart } from "@/components/dashboard/patients/growth/growth-chart"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { classifyBloodPressure } from "@/lib/bp-classification"
import { BP_REFERENCE_SOURCE } from "@/lib/bp-reference"
import { maskBrazilianDateInput, parseBirthDateFormValueToIso } from "@/lib/brazilian-date-form"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { formatDate } from "@/lib/formatters"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import type { GrowthIndicator } from "@/lib/growth-reference"
import { computePediatricBmi } from "@/lib/parse-anthropometrics-for-bmi"
import { createMeasurementSchema } from "@/lib/schemas/patient-measurement"
import { cn } from "@/lib/utils"
import type { Measurement } from "@/modules/patient-growth/types"
import { normalizePatientSexFromDb } from "@/modules/patients/patient-sex"

type FieldKey = "weight" | "length_height" | "head_circumference"

const FIELDS: Array<{
  key: FieldKey
  label: string
  unit: string
  placeholder: string
  indicator: GrowthIndicator
  /** Valor guardado (g ou mm) na unidade do campo. */
  fromStored: (m: Measurement) => number | null
}> = [
  { key: "weight", label: "Peso", unit: "kg", placeholder: "12,4", indicator: "weight-for-age", fromStored: (m) => (m.weight_grams == null ? null : m.weight_grams / 1000) },
  { key: "length_height", label: "Estatura", unit: "cm", placeholder: "86,5", indicator: "height-for-age", fromStored: (m) => (m.length_height_mm == null ? null : m.length_height_mm / 10) },
  { key: "head_circumference", label: "Perímetro cefálico", unit: "cm", placeholder: "47,2", indicator: "head-circumference-for-age", fromStored: (m) => (m.head_circumference_mm == null ? null : m.head_circumference_mm / 10) },
]

const CHART_TABS: Array<[GrowthIndicator, string]> = [
  ["weight-for-age", "Peso"],
  ["height-for-age", "Estatura"],
  ["head-circumference-for-age", "PC"],
  ["bmi-for-age", "IMC"],
]

const toNumber = (value: string) => {
  const n = Number(value.trim().replace(",", "."))
  return value.trim() && Number.isFinite(n) ? n : null
}
const decimal = (n: number) => String(Number(n.toFixed(2))).replace(".", ",")

/**
 * Medidas dentro da Consulta (protótipo a8m): peso, estatura e PC com a última medida embaixo
 * e a curva ao lado, para pegar erro de digitação na hora. Data de hoje já vem; PA num atalho.
 */
export function ConsultMeasurePanel({
  patient,
  measurements,
  onDone,
}: {
  patient: { id: string; sex: string | null; birth_date: string | null; gestational_age_weeks: number | null }
  /** Histórico da criança, em qualquer ordem. */
  measurements: Measurement[]
  onDone: () => void
}) {
  const today = format(new Date(), "dd/MM/yyyy")
  const [values, setValues] = useState<Record<FieldKey, string>>({ weight: "", length_height: "", head_circumference: "" })
  const [measuredOn, setMeasuredOn] = useState(today)
  const [editingDate, setEditingDate] = useState(false)
  const [bp, setBp] = useState<{ systolic: string; diastolic: string } | null>(null)
  const [indicator, setIndicator] = useState<GrowthIndicator>("weight-for-age")
  const [busy, setBusy] = useState(false)

  const sex = normalizePatientSexFromDb(patient.sex)
  const measuredOnIso = parseBirthDateFormValueToIso(measuredOn)
  const history = [...measurements].sort((a, b) => a.measured_on.localeCompare(b.measured_on))
  const weight = toNumber(values.weight)
  const heightCm = toNumber(values.length_height)
  const headCm = toNumber(values.head_circumference)

  const bmi = weight !== null && heightCm !== null ? computePediatricBmi(weight, heightCm / 100) : null

  let bpResult: ReturnType<typeof classifyBloodPressure> | null = null
  const systolic = bp ? toNumber(bp.systolic) : null
  const diastolic = bp ? toNumber(bp.diastolic) : null
  if (systolic !== null && diastolic !== null && systolic > diastolic && sex && patient.birth_date && measuredOnIso) {
    const [y, m, d] = measuredOnIso.split("-").map(Number)
    const age = computePediatricAge(patient.birth_date, new Date(y, m - 1, d))
    if (age.status === "ok" && age.totalMonths !== undefined)
      bpResult = classifyBloodPressure({ ageYears: Math.floor(age.totalMonths / 12), sex, heightCm, systolic, diastolic })
  }

  // A medida digitada entra na curva como mais um ponto, antes de salvar.
  const draft: Measurement | null =
    measuredOnIso && (weight !== null || heightCm !== null || headCm !== null)
      ? {
          id: "draft",
          profile_id: "",
          patient_id: patient.id,
          measured_on: measuredOnIso,
          weight_grams: weight === null ? null : Math.round(weight * 1000),
          length_height_mm: heightCm === null ? null : Math.round(heightCm * 10),
          head_circumference_mm: headCm === null ? null : Math.round(headCm * 10),
          systolic_bp: null,
          diastolic_bp: null,
          created_at: "",
          updated_at: "",
        }
      : null
  const chartMeasurements = draft ? [...history.filter((m) => m.measured_on !== draft.measured_on), draft] : history

  async function handleSave() {
    const parsed = createMeasurementSchema.safeParse({
      patientId: patient.id,
      measured_on: measuredOn,
      ...values,
      systolic_bp: bp?.systolic ?? "",
      diastolic_bp: bp?.diastolic ?? "",
    })
    if (!parsed.success) return void toast.error(parsed.error.issues[0]?.message ?? "Confira as medidas.")
    setBusy(true)
    const result = await createMeasurementAction(parsed.data).catch(() => null)
    setBusy(false)
    if (!result?.ok) return void toast.error(getFriendlyToastMessage(result?.error ?? "Erro ao salvar as medidas."))
    toast.success("Medidas registradas.")
    onDone()
  }

  return (
    <>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-6 overflow-auto px-6 py-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {FIELDS.map((field) => {
              const last = history.findLast((m) => field.fromStored(m) !== null && m.measured_on !== measuredOnIso) ?? null
              const lastValue = last ? field.fromStored(last)! : null
              const typed = toNumber(values[field.key])
              const delta = typed !== null && lastValue !== null ? typed - lastValue : null
              return (
                <label
                  key={field.key}
                  className={cn(
                    "flex flex-col gap-1.5 rounded-xl border p-3",
                    values[field.key] ? "border-border" : "border-dashed border-border-strong",
                  )}
                >
                  <span className="text-label font-medium">{field.label}</span>
                  <span className="relative">
                    <Input
                      inputMode="decimal"
                      value={values[field.key]}
                      onFocus={() => setIndicator(field.indicator)}
                      onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="num h-11 pr-10 text-[20px] font-semibold"
                    />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">{field.unit}</span>
                  </span>
                  <span className="num text-caption text-subtle-foreground">
                    {last ? `Última: ${decimal(lastValue!)} ${field.unit} em ${formatDate(last.measured_on)}` : "Primeira medida"}
                  </span>
                  {delta !== null ? (
                    <span className={cn("num flex items-center gap-1 text-caption", delta < 0 ? "text-warning-text" : "text-success-text")}>
                      {delta < 0 ? <TrendingDownIcon className="size-3" aria-hidden /> : <TrendingUpIcon className="size-3" aria-hidden />}
                      {delta > 0 ? "+" : ""}
                      {decimal(delta)} {field.unit}
                    </span>
                  ) : null}
                </label>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {editingDate ? (
              <label className="flex items-center gap-2">
                <span className="text-label font-medium">Data da medição</span>
                <Input
                  autoFocus
                  value={measuredOn}
                  onChange={(e) => setMeasuredOn(maskBrazilianDateInput(e.target.value))}
                  placeholder="dd/mm/aaaa"
                  className="num h-8 w-32"
                />
              </label>
            ) : (
              <>
                <span className="num inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-label text-muted-foreground">
                  <CalendarIcon className="size-3.5" aria-hidden />
                  Hoje, {today}
                </span>
                <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setEditingDate(true)}>
                  Outra data
                </Button>
              </>
            )}
            <span className="ml-auto" />
            {bp === null ? <AddFieldButton onClick={() => setBp({ systolic: "", diastolic: "" })}>Pressão arterial</AddFieldButton> : null}
          </div>

          {bp !== null ? (
            <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <div className="flex items-end gap-3">
                {(
                  [
                    ["systolic", "Sistólica"],
                    ["diastolic", "Diastólica"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex flex-col gap-1.5">
                    <span className="text-label font-medium">{label}</span>
                    <span className="relative">
                      <Input
                        inputMode="numeric"
                        value={bp[key]}
                        onChange={(e) => setBp((prev) => prev && { ...prev, [key]: e.target.value })}
                        className="num w-32 pr-14"
                      />
                      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-caption text-muted-foreground">mmHg</span>
                    </span>
                  </label>
                ))}
                <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={() => setBp(null)}>
                  Tirar pressão
                </Button>
              </div>
              {bpResult ? (
                <div>
                  <p className="font-semibold">{bpResult.label}</p>
                  <p className="text-caption text-muted-foreground">{bpResult.detail}</p>
                  {bpResult.basis === "nenhuma" ? null : <p className="text-caption text-subtle-foreground">{BP_REFERENCE_SOURCE}</p>}
                </div>
              ) : null}
            </div>
          ) : null}

          {bmi?.ok ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted px-4 py-3">
              <span className="text-caption text-subtle-foreground">IMC calculado</span>
              <span className="num font-semibold">{bmi.bmi.toFixed(1).replace(".", ",")}</span>
              <Button variant="link" size="sm" className="ml-auto h-auto p-0" onClick={() => setIndicator("bmi-for-age")}>
                Ver na curva
              </Button>
            </div>
          ) : null}
        </div>

        <div className="hidden flex-col gap-4 overflow-auto border-l border-border bg-muted px-6 py-6 lg:flex">
          <p className="text-caption font-medium text-subtle-foreground">
            NA CURVA (OMS{sex ? ` · ${sex === "feminino" ? "MENINAS" : "MENINOS"}` : ""})
          </p>
          <div className="flex gap-1 rounded-lg bg-card p-1" role="tablist" aria-label="Curva">
            {CHART_TABS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={indicator === key}
                onClick={() => setIndicator(key)}
                className={cn(
                  "h-7 flex-1 rounded-md text-label",
                  indicator === key ? "bg-muted font-semibold" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <GrowthChart key={indicator} indicator={indicator} patient={{ ...patient, sex }} measurements={chartMeasurements} />
          <p className="flex items-start gap-2 rounded-lg bg-primary-soft px-3 py-2 text-label text-primary-ink-strong">
            <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            A medida de hoje entra como ponto novo. Se ele pular de faixa, confira a digitação.
          </p>
        </div>
      </div>
      <PanelFooter>
        <span className="text-caption text-subtle-foreground">Vai para a aba Crescimento da ficha</span>
        <Button className="ml-auto" onClick={handleSave} disabled={busy}>
          {busy ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <CheckIcon data-icon="inline-start" />}
          {busy ? "Salvando…" : "Salvar medidas"}
        </Button>
      </PanelFooter>
    </>
  )
}
