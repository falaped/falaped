"use client"

import * as React from "react"
import { ClockIcon } from "lucide-react"
import {
  Field,
  FieldContent,
  FieldLabel,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const START_HOUR_MIN = 6
const START_HOUR_MAX = 18
const START_OPTIONS = Array.from(
  { length: START_HOUR_MAX - START_HOUR_MIN + 1 },
  (_, i) => START_HOUR_MIN + i,
)

function formatHour(h: number) {
  return `${h.toString().padStart(2, "0")}:00`
}

function parseHour(value: string): number {
  return parseInt(value.slice(0, 2), 10)
}

export type FixedTimeRangeFieldsProps = {
  timeStart: string
  timeEnd: string
  onTimeStartChange: (value: string) => void
  onTimeEndChange: (value: string) => void
  disabled?: boolean
}

/** Horário início: 06:00–18:00. Horário fim: opções a partir de (início + 1h) até 18:00. */
export function FixedTimeRangeFields({
  timeStart,
  timeEnd,
  onTimeStartChange,
  onTimeEndChange,
  disabled,
}: FixedTimeRangeFieldsProps) {
  const startHour = timeStart ? parseHour(timeStart) : null
  const endOptions = React.useMemo(() => {
    const from = startHour != null ? startHour + 1 : START_HOUR_MIN + 1
    if (from > START_HOUR_MAX) return []
    return Array.from(
      { length: START_HOUR_MAX - from + 1 },
      (_, i) => from + i,
    )
  }, [startHour])

  const endHour = timeEnd ? parseHour(timeEnd) : null
  const endValue =
    endHour != null && endOptions.includes(endHour)
      ? formatHour(endHour)
      : ""

  React.useEffect(() => {
    if (startHour != null && endOptions.length > 0) {
      const currentEnd = timeEnd ? parseHour(timeEnd) : null
      if (
        currentEnd == null ||
        currentEnd <= startHour ||
        !endOptions.includes(currentEnd)
      ) {
        onTimeEndChange(formatHour(endOptions[0]!))
      }
    } else if (startHour != null && endOptions.length === 0) {
      onTimeEndChange("")
    }
  }, [startHour, endOptions, timeEnd, onTimeEndChange])

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel>Horário início</FieldLabel>
        <FieldContent>
          <Select
            value={timeStart || ""}
            onValueChange={onTimeStartChange}
            disabled={disabled}
          >
            <SelectTrigger
              className={cn(
                "w-full font-normal",
                !timeStart && "text-muted-foreground",
              )}
            >
              <ClockIcon className="mr-2 h-4 w-4 shrink-0" />
              <SelectValue placeholder="Selecione o horário" />
            </SelectTrigger>
            <SelectContent side="top" style={{ maxHeight: "12rem" }} className="overflow-y-auto">
              {START_OPTIONS.map((h) => (
                <SelectItem key={h} value={formatHour(h)}>
                  {formatHour(h)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel>Horário fim</FieldLabel>
        <FieldContent>
          <Select
            value={endValue}
            onValueChange={onTimeEndChange}
            disabled={disabled || endOptions.length === 0}
          >
            <SelectTrigger
              className={cn(
                "w-full font-normal",
                !endValue && "text-muted-foreground",
              )}
            >
              <ClockIcon className="mr-2 h-4 w-4 shrink-0" />
              <SelectValue placeholder={startHour == null ? "Selecione o início" : "Selecione o horário"} />
            </SelectTrigger>
            <SelectContent side="top" style={{ maxHeight: "12rem" }} className="overflow-y-auto">
              {endOptions.map((h) => (
                <SelectItem key={h} value={formatHour(h)}>
                  {formatHour(h)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldContent>
      </Field>
    </div>
  )
}
