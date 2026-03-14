"use client"

import * as React from "react"
import { ClockIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)

function formatHour(h: number) {
  return h.toString().padStart(2, "0")
}

function formatMinute(m: number) {
  return m.toString().padStart(2, "0")
}

type TimePickerFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  id?: string
  disabled?: boolean
}

export function TimePickerField({
  label,
  value,
  onChange,
  placeholder = "Selecione o horário",
  id,
  disabled,
}: TimePickerFieldProps) {
  const [open, setOpen] = React.useState(false)
  const [hour, minute] = value
    ? value.split(":").map((s) => parseInt(s, 10))
    : [null, null]
  const displayValue =
    hour != null && minute != null
      ? `${formatHour(hour)}:${formatMinute(minute)}`
      : ""

  const handleHourChange = (v: string) => {
    const h = parseInt(v, 10)
    const m = minute ?? 0
    onChange(`${formatHour(h)}:${formatMinute(m)}`)
  }

  const handleMinuteChange = (v: string) => {
    const m = parseInt(v, 10)
    const h = hour ?? 0
    onChange(`${formatHour(h)}:${formatMinute(m)}`)
  }

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
                !displayValue && "text-muted-foreground"
              )}
            >
              <ClockIcon className="mr-2 h-4 w-4" />
              {displayValue || placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="flex gap-2">
              <Select
                value={hour != null ? formatHour(hour) : ""}
                onValueChange={handleHourChange}
              >
                <SelectTrigger className="w-[72px]">
                  <SelectValue placeholder="Hora" />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((h) => (
                    <SelectItem key={h} value={formatHour(h)}>
                      {formatHour(h)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="flex items-center text-muted-foreground">:</span>
              <Select
                value={minute != null ? formatMinute(minute) : ""}
                onValueChange={handleMinuteChange}
              >
                <SelectTrigger className="w-[72px]">
                  <SelectValue placeholder="Min" />
                </SelectTrigger>
                <SelectContent>
                  {MINUTES.map((m) => (
                    <SelectItem key={m} value={formatMinute(m)}>
                      {formatMinute(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>
      </FieldContent>
    </Field>
  )
}
