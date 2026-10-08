"use client"

import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Field,
  FieldContent,
  FieldLabel,
} from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type DatePickerFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  id?: string
  disabled?: boolean
}

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = "Selecione a data",
  id,
  disabled,
}: DatePickerFieldProps) {
  const [open, setOpen] = React.useState(false)
  const date = value ? new Date(value + "T12:00:00") : undefined

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldContent>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => {
                if (d) {
                  onChange(format(d, "yyyy-MM-dd"))
                  setOpen(false)
                }
              }}
              defaultMonth={date}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </FieldContent>
    </Field>
  )
}
