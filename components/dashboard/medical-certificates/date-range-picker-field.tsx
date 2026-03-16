"use client"

import * as React from "react"
import { format, differenceInCalendarDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
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

export type DateRangeValue = {
  startDate: string
  daysAway: number
}

type DateRangePickerFieldProps = {
  label: string
  startDate: string
  daysAway: number
  onChange: (value: DateRangeValue) => void
  placeholder?: string
  id?: string
  disabled?: boolean
}

export function DateRangePickerField({
  label,
  startDate,
  daysAway,
  onChange,
  placeholder = "Selecione o período",
  id,
  disabled,
}: DateRangePickerFieldProps) {
  const [open, setOpen] = React.useState(false)
  const from = startDate ? new Date(startDate + "T12:00:00") : undefined
  const to =
    from && daysAway >= 1
      ? (() => {
          const end = new Date(from)
          end.setDate(end.getDate() + daysAway - 1)
          return end
        })()
      : undefined
  const range: DateRange | undefined =
    from && to ? { from, to } : from ? { from, to: from } : undefined

  const displayText =
    range?.from && range?.to
      ? `${format(range.from, "dd/MM/yyyy", { locale: ptBR })} — ${format(range.to, "dd/MM/yyyy", { locale: ptBR })} (${differenceInCalendarDays(range.to, range.from) + 1} dias)`
      : range?.from
        ? `${format(range.from, "dd/MM/yyyy", { locale: ptBR })} (1 dia)`
        : placeholder

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
                !range?.from && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">{displayText}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={range}
              onSelect={(selected) => {
                if (selected?.from) {
                  const fromStr = format(selected.from, "yyyy-MM-dd")
                  const toDate = selected.to ?? selected.from
                  const days = differenceInCalendarDays(toDate, selected.from) + 1
                  onChange({ startDate: fromStr, daysAway: days })
                  if (selected.to) setOpen(false)
                }
              }}
              defaultMonth={from}
              locale={ptBR}
              numberOfMonths={1}
            />
          </PopoverContent>
        </Popover>
      </FieldContent>
    </Field>
  )
}
