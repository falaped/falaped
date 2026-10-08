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
  /** When set (e.g. today in yyyy-MM-dd), disables dates before it and ensures start date is not before it. */
  minStartDate?: string
}

export function DateRangePickerField({
  label,
  startDate,
  daysAway,
  onChange,
  placeholder = "Selecione o período",
  id,
  disabled,
  minStartDate,
}: DateRangePickerFieldProps) {
  const [open, setOpen] = React.useState(false)
  const minDate = minStartDate ? new Date(minStartDate + "T12:00:00") : undefined

  React.useEffect(() => {
    if (!minStartDate) return
    const start = startDate ? new Date(startDate + "T12:00:00") : null
    if (!start || start < minDate!) {
      onChange({ startDate: minStartDate, daysAway: 1 })
    }
  }, [minStartDate]) // eslint-disable-line react-hooks/exhaustive-deps -- only when minStartDate is set

  const from = startDate ? new Date(startDate + "T12:00:00") : undefined
  const fromClamped =
    from && minDate && from < minDate ? minDate : from
  const to =
    fromClamped && daysAway >= 1
      ? (() => {
          const end = new Date(fromClamped)
          end.setDate(end.getDate() + daysAway - 1)
          return end
        })()
      : undefined
  const range: DateRange | undefined =
    fromClamped && to ? { from: fromClamped, to } : fromClamped ? { from: fromClamped, to: fromClamped } : undefined

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
                  let fromDate = selected.from
                  if (minDate && fromDate < minDate) fromDate = minDate
                  const fromStr = format(fromDate, "yyyy-MM-dd")
                  const toDate = selected.to ?? selected.from
                  const endDate = toDate < fromDate ? fromDate : toDate
                  const days = differenceInCalendarDays(endDate, fromDate) + 1
                  onChange({ startDate: fromStr, daysAway: days })
                  if (selected.to) setOpen(false)
                }
              }}
              defaultMonth={fromClamped ?? minDate}
              locale={ptBR}
              numberOfMonths={1}
              disabled={minStartDate ? (date) => format(date, "yyyy-MM-dd") < minStartDate : undefined}
            />
          </PopoverContent>
        </Popover>
      </FieldContent>
    </Field>
  )
}
