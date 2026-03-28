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
import { maskBrazilianDateInput } from "@/lib/brazilian-date-form"
import { cn } from "@/lib/utils"

export function PatientFormBirthDateField({
  form,
  name,
  error,
}: {
  form: UseFormReturn<FieldValues>
  name: string
  error?: { message?: string }
}) {
  return (
    <Field className="w-full min-w-[12.5rem] max-w-[15rem] shrink-0">
      <FieldLabel htmlFor="patient-birth_date">Data de nascimento</FieldLabel>
      <FieldContent>
        <Controller
          name={name as never}
          control={form.control}
          render={({ field }) => (
            <Input
              id="patient-birth_date"
              type="text"
              inputMode="numeric"
              placeholder="dd/mm/aaaa"
              autoComplete="bday"
              className={cn(
                "min-w-0 w-full font-mono text-sm tabular-nums sm:min-w-[11.5rem]",
              )}
              aria-describedby="patient-birth_date-hint"
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={typeof field.value === "string" ? field.value : ""}
              onChange={(e) => {
                field.onChange(maskBrazilianDateInput(e.target.value))
              }}
            />
          )}
        />
        <p
          id="patient-birth_date-hint"
          className="text-xs text-muted-foreground"
        >
          Formato: dd/mm/aaaa
        </p>
        <FieldError errors={error ? [error] : undefined} />
      </FieldContent>
    </Field>
  )
}
