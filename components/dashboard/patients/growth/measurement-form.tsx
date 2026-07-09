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
import { maskBrazilianDateInput } from "@/lib/brazilian-date-form"
import { computePediatricBmi } from "@/lib/parse-anthropometrics-for-bmi"
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
  }
}

type MeasurementFormProps = {
  patientId: string
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
