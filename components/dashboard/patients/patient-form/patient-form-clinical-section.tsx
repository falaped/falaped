"use client"

import type { FieldValues, UseFormReturn } from "react-hook-form"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field"
import { BLOOD_TYPE_OPTIONS } from "@/lib/schemas/patient"
import { PatientControlledSelectField } from "./patient-controlled-select-field"

const BLOOD_OPTIONS = BLOOD_TYPE_OPTIONS.map((v) => ({
  value: v,
  label: v,
})) as readonly { value: string; label: string }[]

export function PatientFormClinicalSection({
  form,
}: {
  form: UseFormReturn<FieldValues>
}) {
  return (
    <FieldSet>
      <FieldLegend variant="legend">Dados clínicos</FieldLegend>
      <FieldGroup className="mt-4 gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-start md:gap-x-4 md:gap-y-4">
          <PatientControlledSelectField
            form={form}
            name="blood_type"
            id="patient-blood_type"
            label="Tipo sanguíneo"
            options={BLOOD_OPTIONS}
            error={form.formState.errors.blood_type}
            labelClassName="whitespace-nowrap"
            className="w-full shrink-0 md:w-auto md:min-w-[13rem]"
            triggerClassName="w-full min-w-[13rem]"
          />
          <Field className="w-full min-w-0 md:w-[7.5rem] md:max-w-[8rem] md:shrink-0">
            <FieldLabel htmlFor="patient-weight">Peso (kg)</FieldLabel>
            <FieldContent>
              <Input
                id="patient-weight"
                placeholder="12,5"
                className="font-mono text-sm tabular-nums"
                {...form.register("weight")}
              />
              <FieldError
                errors={
                  form.formState.errors.weight
                    ? [form.formState.errors.weight]
                    : undefined
                }
              />
            </FieldContent>
          </Field>
          <Field className="w-full min-w-0 md:w-[7.5rem] md:max-w-[8rem] md:shrink-0">
            <FieldLabel htmlFor="patient-height">Altura (cm)</FieldLabel>
            <FieldContent>
              <Input
                id="patient-height"
                placeholder="85"
                className="font-mono text-sm tabular-nums"
                {...form.register("height")}
              />
              <FieldError
                errors={
                  form.formState.errors.height
                    ? [form.formState.errors.height]
                    : undefined
                }
              />
            </FieldContent>
          </Field>
          <Field className="w-full min-w-0 md:w-[8.5rem] md:max-w-[9rem] md:shrink-0">
            <FieldLabel htmlFor="patient-head_circumference">PC (cm)</FieldLabel>
            <FieldContent>
              <Input
                id="patient-head_circumference"
                placeholder="Opcional"
                className="font-mono text-sm tabular-nums"
                {...form.register("head_circumference")}
              />
              <FieldError
                errors={
                  form.formState.errors.head_circumference
                    ? [form.formState.errors.head_circumference]
                    : undefined
                }
              />
            </FieldContent>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="patient-allergies">Alergias</FieldLabel>
          <FieldContent>
            <Textarea
              id="patient-allergies"
              placeholder="Alergias conhecidas"
              rows={2}
              {...form.register("allergies")}
            />
            <FieldError
              errors={
                form.formState.errors.allergies
                  ? [form.formState.errors.allergies]
                  : undefined
              }
            />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="patient-current_medications">
            Medicamentos em uso
          </FieldLabel>
          <FieldContent>
            <Textarea
              id="patient-current_medications"
              placeholder="Medicamentos em uso"
              rows={2}
              {...form.register("current_medications")}
            />
            <FieldError
              errors={
                form.formState.errors.current_medications
                  ? [form.formState.errors.current_medications]
                  : undefined
              }
            />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="patient-medical_history">
            Histórico médico
          </FieldLabel>
          <FieldContent>
            <Textarea
              id="patient-medical_history"
              placeholder="Resumo do histórico médico"
              rows={3}
              {...form.register("medical_history")}
            />
            <FieldError
              errors={
                form.formState.errors.medical_history
                  ? [form.formState.errors.medical_history]
                  : undefined
              }
            />
          </FieldContent>
        </Field>
      </FieldGroup>
    </FieldSet>
  )
}
