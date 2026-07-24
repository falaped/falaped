"use client"

import { tz } from "@date-fns/tz"
import { addDays, endOfMonth, format, startOfMonth, startOfWeek } from "date-fns"

import { cn } from "@/lib/utils"
import { DAY_LABELS } from "./calendar-day-week-grid"

type ByDay = Record<string, { freeSlotCount: number; hasAvailability: boolean }>

/**
 * Aba Mês SÓ INDICADOR (D-18): grade mensal Monday-first com ponto + contagem de
 * horários livres por dia (derivados de `byDay`), NUNCA horários reais e SEM
 * pintura. Clicar um dia navega para aquele Dia (a critério visual, D-18).
 * Reusa o grid mensal da agenda-view v1.
 */
export function CalendarMonthIndicator({
  monthCursor,
  byDay,
  timeZone,
  todayLocal,
  selectedLocalDate,
  onSelectDay,
}: {
  monthCursor: Date
  byDay: ByDay
  timeZone: string
  todayLocal: string
  /** Data local (YYYY-MM-DD) do dia SELECIONADO — destaque token-only (M-2). */
  selectedLocalDate?: string
  /** Seleciona o dia clicado (M-1: o dia global vira o clicado). */
  onSelectDay: (day: Date) => void
}) {
  const context = { in: tz(timeZone) }
  const monthStart = startOfMonth(monthCursor, context)
  const monthEnd = endOfMonth(monthCursor, context)
  // Monday-first: primeira célula é a segunda da semana que contém o dia 1º.
  const gridStart = startOfWeek(monthStart, { ...context, weekStartsOn: 1 })
  const cells: Date[] = []
  let cursor = gridStart
  // 6 semanas × 7 = 42 células cobrem qualquer mês.
  for (let i = 0; i < 42; i++) {
    cells.push(cursor)
    cursor = addDays(cursor, 1, context)
  }

  const localDateOf = (day: Date) => format(day, "yyyy-MM-dd", context)

  const hasAny = cells.some((day) => {
    const local = localDateOf(day)
    return (
      day >= monthStart &&
      day <= monthEnd &&
      byDay[local]?.hasAvailability === true
    )
  })

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {!hasAny ? (
        <div className="shrink-0 rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm font-medium">Sem atendimento neste mês.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure sua disponibilidade nas abas Dia ou Semana para ver os
            dias de atendimento.
          </p>
        </div>
      ) : null}

      {/* C-1: o grid preenche a altura (flex-1 min-h-0 + grid-rows-6) em vez de
          somar min-h-20 por célula — nenhuma scrollbar vertical própria. */}
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-[auto_repeat(6,1fr)] gap-px overflow-hidden rounded-lg border bg-border">
        {DAY_LABELS.map((label) => (
          <div
            key={`mh-${label}`}
            className="bg-muted py-2 text-center text-sm text-muted-foreground"
          >
            {label}
          </div>
        ))}
        {cells.map((day) => {
          const localDate = localDateOf(day)
          const inMonth = day >= monthStart && day <= monthEnd
          const summary = byDay[localDate]
          const isToday = localDate === todayLocal
          const isSelected = localDate === selectedLocalDate
          return (
            <button
              key={localDate}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelectDay(day)}
              className={cn(
                "flex min-h-0 flex-col gap-1 overflow-hidden bg-background p-2 text-left transition-colors hover:bg-muted/50",
                !inMonth && "bg-muted/40 text-muted-foreground",
                // Célula do dia SELECIONADO (M-2): anel token-only, distinto do
                // círculo de "hoje".
                isSelected && "ring-2 ring-inset ring-primary",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-sm",
                    isToday &&
                      "flex h-6 w-6 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground",
                  )}
                >
                  {format(day, "d", context)}
                </span>
                {inMonth && summary?.hasAvailability ? (
                  <span className="h-2 w-2 rounded-full bg-primary" />
                ) : null}
              </div>
              {inMonth && summary?.hasAvailability ? (
                <span className="text-sm text-muted-foreground">
                  {summary.freeSlotCount} livres
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <p className="shrink-0 text-xs text-muted-foreground">
        O mês é só um resumo. Clique num dia para selecioná-lo.
      </p>
    </div>
  )
}
