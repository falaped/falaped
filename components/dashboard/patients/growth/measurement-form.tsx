"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Controller,
  useForm,
  type FieldValues,
  type Resolver,
  type UseFormReturn,
} from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { createMeasurementAction, updateMeasurementAction } from "@/actions"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import {
  maskBrazilianDateInput,
  parseBirthDateFormValueToIso,
} from "@/lib/brazilian-date-form"
import { computePediatricBmi } from "@/lib/parse-anthropometrics-for-bmi"
import { computePediatricAge } from "@/lib/compute-pediatric-age"

import { classifyBloodPressure } from "@/lib/bp-classification"
import { BP_REFERENCE_SOURCE } from "@/lib/bp-reference"
import { normalizePatientSexFromDb } from "@/modules/patients/patient-sex"
import {
  createMeasurementSchema,
  updateMeasurementSchema,
  type CreateMeasurementFormData,
  type CreateMeasurementFormInput,
  type UpdateMeasurementFormData,
} from "@/lib/schemas/patient-measurement"
import type { Measurement } from "@/modules/patient-growth/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"

type LooseForm = UseFormReturn<FieldValues>

const DEFAULT_VALUES: CreateMeasurementFormInput = {
  patientId: "",
  measured_on: "",
  weight: "",
  length_height: "",
  head_circumference: "",
  systolic_bp: "",
  diastolic_bp: "",
}

/** Parses a Brazilian/plain decimal string to a finite number, else null. */
function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value !== "string") return null
  const trimmed = value.trim().replace(",", ".")
  if (trimmed === "") return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

/** yyyy-mm-dd (date-only) → dd/mm/aaaa without timezone drift (parse parts). */
function isoToBrazilianDate(iso: string): string {
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return ""
  return `${d}/${m}/${y}`
}

/** grams → kg display string (comma decimals), empty when null. */
function gramsToKgInput(grams: number | null): string {
  if (grams === null) return ""
  return String(grams / 1000).replace(".", ",")
}

/** mm → cm display string (comma decimals), empty when null. */
function mmToCmInput(mm: number | null): string {
  if (mm === null) return ""
  return String(mm / 10).replace(".", ",")
}

/** Builds the pre-populated form state for an existing measurement (edit mode). */
function editDefaultsFromMeasurement(
  patientId: string,
  measurement: Measurement,
): CreateMeasurementFormInput {
  return {
    patientId,
    measured_on: isoToBrazilianDate(measurement.measured_on),
    weight: gramsToKgInput(measurement.weight_grams),
    length_height: mmToCmInput(measurement.length_height_mm),
    head_circumference: mmToCmInput(measurement.head_circumference_mm),
    systolic_bp:
      measurement.systolic_bp === null ? "" : String(measurement.systolic_bp),
    diastolic_bp:
      measurement.diastolic_bp === null ? "" : String(measurement.diastolic_bp),
  }
}

type MeasurementFormProps = {
  patientId: string
  /**
   * Sexo e data de nascimento da criança. Só servem para classificar a pressão
   * arterial na hora da digitação — sem eles o campo continua funcionando, só
   * não mostra a faixa.
   */
  patientSex?: string | null
  patientBirthDate?: string | null
  /** "create" (default) opens via its own CTA; "edit" pre-populates from `measurement`. */
  mode?: "create" | "edit"
  /** Existing measurement to edit — required when `mode === "edit"`. */
  measurement?: Measurement
  /** Controlled open state (used by the edit flow from the history table). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSaved?: () => void
}

export function MeasurementForm({
  patientId,
  patientSex = null,
  patientBirthDate = null,
  mode = "create",
  measurement,
  open: controlledOpen,
  onOpenChange,
  onSaved,
}: MeasurementFormProps) {
  const router = useRouter()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isEdit = mode === "edit" && measurement !== undefined

  // Edit mode is controlled by the parent; create mode manages its own open state.
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = (next: boolean) => {
    if (isControlled) onOpenChange?.(next)
    else setUncontrolledOpen(next)
  }

  const initialValues: CreateMeasurementFormInput = isEdit
    ? editDefaultsFromMeasurement(patientId, measurement)
    : { ...DEFAULT_VALUES, patientId }

  const form = useForm<CreateMeasurementFormInput>({
    mode: "onSubmit",
    reValidateMode: "onBlur",
    resolver: zodResolver(
      isEdit ? updateMeasurementSchema : createMeasurementSchema,
    ) as Resolver<CreateMeasurementFormInput>,
    defaultValues: initialValues,
  })

  const looseForm = form as unknown as LooseForm
  const errors = form.formState.errors
  const isSubmitting = form.formState.isSubmitting

  // Derived IMC preview (read-only): only when weight AND height are present (D-11).
  // computePediatricBmi expects height in METERS; the form collects cm → ÷100.
  const watchedWeight = toNumberOrNull(form.watch("weight"))
  const watchedHeightCm = toNumberOrNull(form.watch("length_height"))
  let bmiLabel: string | null = null
  if (watchedWeight !== null && watchedHeightCm !== null) {
    const bmi = computePediatricBmi(watchedWeight, watchedHeightCm / 100)
    if (bmi.ok) bmiLabel = bmi.bmi.toFixed(1).replace(".", ",")
  }

  // Classificação da PA enquanto se digita. Depende da idade NA DATA DA MEDIÇÃO
  // (não hoje): medição retroativa de dois anos atrás usa a régua daquela idade.
  const watchedSystolic = toNumberOrNull(form.watch("systolic_bp"))
  const watchedDiastolic = toNumberOrNull(form.watch("diastolic_bp"))
  const sex = normalizePatientSexFromDb(patientSex)
  const measuredOnIso = parseBirthDateFormValueToIso(
    String(form.watch("measured_on") ?? ""),
  )
  let bpResult: ReturnType<typeof classifyBloodPressure> | null = null
  if (
    watchedSystolic !== null &&
    watchedDiastolic !== null &&
    watchedSystolic > watchedDiastolic &&
    sex !== null &&
    patientBirthDate !== null &&
    measuredOnIso !== null
  ) {
    const [y, m, d] = measuredOnIso.split("-").map(Number)
    const age = computePediatricAge(patientBirthDate, new Date(y, m - 1, d))
    if (age.status === "ok" && age.totalMonths !== undefined) {
      bpResult = classifyBloodPressure({
        ageYears: Math.floor(age.totalMonths / 12),
        sex,
        heightCm: watchedHeightCm,
        systolic: watchedSystolic,
        diastolic: watchedDiastolic,
      })
    }
  }

  const resetForm = () => {
    form.reset(
      isEdit
        ? editDefaultsFromMeasurement(patientId, measurement)
        : { ...DEFAULT_VALUES, patientId },
    )
  }

  if (!open) {
    // Edit mode never renders its own entry button — the parent controls opening.
    if (isEdit) return null
    return (
      <Button type="button" onClick={() => setOpen(true)} className="min-h-9">
        Registrar medição
      </Button>
    )
  }

  return (
    <form
      onSubmit={form.handleSubmit(async (data) => {
        const result = isEdit
          ? await updateMeasurementAction({
              ...(data as unknown as UpdateMeasurementFormData),
              id: measurement.id,
            })
          : await createMeasurementAction(data as CreateMeasurementFormData)
        if (result.ok) {
          toast.success(isEdit ? "Medição atualizada." : "Medição registrada.")
          resetForm()
          setOpen(false)
          router.refresh()
          onSaved?.()
        } else {
          toast.error(getFriendlyToastMessage(result.error))
        }
      })}
      className="flex flex-col gap-6 rounded-xl border border-border bg-card p-4 sm:p-6"
    >
      <input type="hidden" {...form.register("patientId")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field className="w-full min-w-0">
          <FieldLabel htmlFor="measurement-date">Data da medição</FieldLabel>
          <FieldContent>
            <Controller
              name="measured_on"
              control={looseForm.control}
              render={({ field }) => (
                <Input
                  id="measurement-date"
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  className="min-w-0 w-full font-mono text-sm tabular-nums"
                  aria-describedby="measurement-date-hint"
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={typeof field.value === "string" ? field.value : ""}
                  onChange={(e) =>
                    field.onChange(maskBrazilianDateInput(e.target.value))
                  }
                />
              )}
            />
            <p id="measurement-date-hint" className="text-xs text-muted-foreground">
              Formato: dd/mm/aaaa
            </p>
            <FieldError
              errors={errors.measured_on ? [errors.measured_on] : undefined}
            />
          </FieldContent>
        </Field>

        <Field className="w-full min-w-0">
          <FieldLabel htmlFor="measurement-weight">Peso (kg)</FieldLabel>
          <FieldContent>
            <Input
              id="measurement-weight"
              type="text"
              inputMode="decimal"
              placeholder="ex.: 12,4"
              className="tabular-nums"
              {...form.register("weight")}
            />
            <FieldError errors={errors.weight ? [errors.weight] : undefined} />
          </FieldContent>
        </Field>

        <Field className="w-full min-w-0">
          <FieldLabel htmlFor="measurement-length">
            Comprimento/estatura (cm)
          </FieldLabel>
          <FieldContent>
            <Input
              id="measurement-length"
              type="text"
              inputMode="decimal"
              placeholder="ex.: 86,5"
              className="tabular-nums"
              {...form.register("length_height")}
            />
            <FieldError
              errors={errors.length_height ? [errors.length_height] : undefined}
            />
          </FieldContent>
        </Field>

        <Field className="w-full min-w-0">
          <FieldLabel htmlFor="measurement-hc">
            Perímetro cefálico (cm)
          </FieldLabel>
          <FieldContent>
            <Input
              id="measurement-hc"
              type="text"
              inputMode="decimal"
              placeholder="ex.: 47,2"
              className="tabular-nums"
              {...form.register("head_circumference")}
            />
            <FieldError
              errors={
                errors.head_circumference ? [errors.head_circumference] : undefined
              }
            />
          </FieldContent>
        </Field>

        <Field className="w-full min-w-0">
          <FieldLabel htmlFor="measurement-sbp">
            PA sistólica (mmHg)
          </FieldLabel>
          <FieldContent>
            <Input
              id="measurement-sbp"
              type="text"
              inputMode="numeric"
              placeholder="ex.: 98"
              className="tabular-nums"
              {...form.register("systolic_bp")}
            />
            <FieldError
              errors={errors.systolic_bp ? [errors.systolic_bp] : undefined}
            />
          </FieldContent>
        </Field>

        <Field className="w-full min-w-0">
          <FieldLabel htmlFor="measurement-dbp">
            PA diastólica (mmHg)
          </FieldLabel>
          <FieldContent>
            <Input
              id="measurement-dbp"
              type="text"
              inputMode="numeric"
              placeholder="ex.: 60"
              className="tabular-nums"
              {...form.register("diastolic_bp")}
            />
            <FieldError
              errors={errors.diastolic_bp ? [errors.diastolic_bp] : undefined}
            />
          </FieldContent>
        </Field>
      </div>

      {bmiLabel ? (
        <div className="rounded-lg border border-border bg-muted/15 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            IMC estimado
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {bmiLabel}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              kg/m²
            </span>
          </p>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            IMC calculado a partir de peso e estatura desta medição.
          </p>
        </div>
      ) : null}

      {bpResult ? (
        <div className="rounded-lg border border-border bg-muted/15 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pressão arterial
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {bpResult.label}
          </p>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            {bpResult.detail}
          </p>
          {bpResult.basis === "nenhuma" ? null : (
            <p className="mt-1 text-xs leading-snug text-muted-foreground">
              {BP_REFERENCE_SOURCE}
            </p>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          className="min-h-9"
          disabled={isSubmitting}
          onClick={() => {
            resetForm()
            setOpen(false)
          }}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="min-h-9">
          {isSubmitting ? "Salvando..." : "Salvar medição"}
        </Button>
      </div>
    </form>
  )
}
