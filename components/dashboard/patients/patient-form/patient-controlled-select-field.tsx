"use client"

import type { FieldValues, UseFormReturn } from "react-hook-form"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { cn } from "@/lib/utils"

type Option = { value: string; label: string }

export function PatientControlledSelectField({
  form,
  name,
  id,
  label,
  placeholder = "Selecione",
  options,
  error,
  className,
  triggerClassName,
  labelClassName,
}: {
  form: UseFormReturn<FieldValues>
  name: string
  id: string
  label: string
  placeholder?: string
  options: readonly Option[]
  error?: { message?: string }
  className?: string
  triggerClassName?: string
  labelClassName?: string
}) {
  const raw = form.watch(name)
  const value = typeof raw === "string" ? raw : ""

  return (
    <Field className={cn("min-w-0", className)}>
      <FieldLabel htmlFor={id} className={labelClassName}>
        {label}
      </FieldLabel>
      <FieldContent>
        <Select
          value={value.length > 0 ? value : undefined}
          onValueChange={(v) => {
            form.setValue(name, v, { shouldValidate: true })
          }}
        >
          <SelectTrigger
            id={id}
            className={cn("w-full min-h-9", triggerClassName)}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError errors={error ? [error] : undefined} />
      </FieldContent>
    </Field>
  )
}
