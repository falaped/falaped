"use client"

import type { FieldValues, UseFormReturn } from "react-hook-form"
import { Controller } from "react-hook-form"

import { Input } from "@/components/ui/input"
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { cn } from "@/lib/utils"

export function PatientFormGestationalAgeField({
  form,
  name,
  error,
}: {
  form: UseFormReturn<FieldValues>
  name: string
  error?: { message?: string }
}) {
  return (
    <Field className="w-full shrink-0 md:w-[12rem]">
      <FieldLabel htmlFor="patient-gestational_age_weeks">
        Idade gestacional ao nascer
      </FieldLabel>
      <FieldContent>
        <Controller
          name={name as never}
          control={form.control}
          render={({ field }) => (
            <Input
              id="patient-gestational_age_weeks"
              type="text"
              inputMode="numeric"
              placeholder="Ex.: 34"
              className={cn("min-w-0 w-full font-mono text-sm tabular-nums")}
              aria-describedby="patient-gestational_age_weeks-hint"
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={typeof field.value === "string" ? field.value : ""}
              onChange={(e) => {
                field.onChange(e.target.value.replace(/\D/g, ""))
              }}
            />
          )}
        />
        <p
          id="patient-gestational_age_weeks-hint"
          className="text-xs text-muted-foreground"
        >
          Em semanas. Usada para calcular a idade corrigida de prematuros.
        </p>
        <FieldError errors={error ? [error] : undefined} />
      </FieldContent>
    </Field>
  )
}
