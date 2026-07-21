"use client"

import * as React from "react"
import { tz, TZDate } from "@date-fns/tz"
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { AvailabilityGrid } from "./availability-grid"
import { ExceptionDialog } from "./exception-dialog"

/** Slot serializado (a fn pura devolve Date; a page.tsx serializa para ISO). */
type SerializedSlot = {
  start: string
  end: string
  localDate: string
}

type ByDay = Record<string, { freeSlotCount: number; hasAvailability: boolean }>

type RuleRow = {
  id: string
  weekday: number
  start_minute: number
  end_minute: number
  slot_minutes: number
}

type ExceptionRow = {
  id: string
  exception_date: string
  start_minute: number | null
  end_minute: number | null
}

const STEP = 30
const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/** "YYYY-MM-DD" no fuso da clínica para um instante. */
function localDateOf(date: Date, timeZone: string): string {
  return format(date, "yyyy-MM-dd", { in: tz(timeZone) })
}

/** Minuto-desde-meia-noite (fuso da clínica) de um instante. */
function localMinuteOf(iso: string, timeZone: string): number {
  const zoned = new TZDate(new Date(iso), timeZone)
  return zoned.getHours() * 60 + zoned.getMinutes()
}

/**
 * Views da agenda (AGENDA-04, D-06/07/08). Tabs Dia · Semana · Mês (default
 * Semana). Dia/Semana em CSS grid custom (nenhuma lib de calendário); slots
 * livres posicionados por grid-row a partir do índice de 30 min. Mês = grid
 * mensal custom Monday-first com dot + contagem por dia (NUNCA horários reais,
 * D-07). Recebe os slots já expandidos server-side + o resumo byDay + as rows
 * cruas para o editor de grade e o dialog de folga.
 */
export function AgendaView({
  slots,
  byDay,
  rules,
  exceptions,
  timeZone,
}: {
  slots: SerializedSlot[]
  byDay: ByDay
  rules: RuleRow[]
  exceptions: ExceptionRow[]
  timeZone: string
}) {
  // Cursor de navegação (âncora local da view atual). A expansão server-side é
  // da semana atual; a navegação re-agrupa client-side os slots já recebidos e,
  // no mês, usa apenas o resumo byDay (dot + contagem).
  const [dayCursor, setDayCursor] = React.useState<Date>(() => new Date())
  const [monthCursor, setMonthCursor] = React.useState<Date>(() => new Date())

  const context = { in: tz(timeZone) }

  // Range de horas visível (default 06:00–22:00, auto-extensivel pelos slots).
  const { rangeStart, rangeEnd } = React.useMemo(() => {
    let start = 6 * 60
    let end = 22 * 60
    for (const slot of slots) {
      start = Math.min(start, localMinuteOf(slot.start, timeZone))
      end = Math.max(end, localMinuteOf(slot.end, timeZone))
    }
    return { rangeStart: start, rangeEnd: Math.min(24 * 60, end) }
  }, [slots, timeZone])

  const minuteRows = React.useMemo(() => {
    const rows: number[] = []
    for (let m = rangeStart; m < rangeEnd; m += STEP) rows.push(m)
    return rows
  }, [rangeStart, rangeEnd])

  const todayLocal = localDateOf(new Date(), timeZone)

  // Agrupa slots por data local para posicionar na grade.
  const slotsByDate = React.useMemo(() => {
    const map = new Map<string, SerializedSlot[]>()
    for (const slot of slots) {
      const list = map.get(slot.localDate)
      if (list) list.push(slot)
      else map.set(slot.localDate, [slot])
    }
    return map
  }, [slots])

  return (
    <div className="flex flex-col gap-8">
      <AvailabilityGrid rules={rules} />

      <ExceptionDialog exceptions={exceptions} />

      <Tabs defaultValue="semana" className="flex flex-col gap-4">
        <TabsList>
          <TabsTrigger
            value="dia"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Dia
          </TabsTrigger>
          <TabsTrigger
            value="semana"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Semana
          </TabsTrigger>
          <TabsTrigger
            value="mes"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Mês
          </TabsTrigger>
        </TabsList>

        {/* ---------- DIA ---------- */}
        <TabsContent value="dia">
          <DayWeekGrid
            days={[dayCursor]}
            slotsByDate={slotsByDate}
            minuteRows={minuteRows}
            timeZone={timeZone}
            todayLocal={todayLocal}
            onPrev={() => setDayCursor((d) => addDays(d, -1, context))}
            onToday={() => setDayCursor(new Date())}
            onNext={() => setDayCursor((d) => addDays(d, 1, context))}
            label={format(dayCursor, "EEEE, dd 'de' MMMM", {
              ...context,
              locale: ptBR,
            })}
          />
        </TabsContent>

        {/* ---------- SEMANA ---------- */}
        <TabsContent value="semana">
          <WeekTab
            anchor={dayCursor}
            slotsByDate={slotsByDate}
            minuteRows={minuteRows}
            timeZone={timeZone}
            todayLocal={todayLocal}
            onPrev={() => setDayCursor((d) => addDays(d, -7, context))}
            onToday={() => setDayCursor(new Date())}
            onNext={() => setDayCursor((d) => addDays(d, 7, context))}
          />
        </TabsContent>

        {/* ---------- MÊS ---------- */}
        <TabsContent value="mes">
          <MonthGrid
            monthCursor={monthCursor}
            byDay={byDay}
            timeZone={timeZone}
            todayLocal={todayLocal}
            onPrev={() => setMonthCursor((d) => addMonths(d, -1, context))}
            onToday={() => setMonthCursor(new Date())}
            onNext={() => setMonthCursor((d) => addMonths(d, 1, context))}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/** Barra de navegação Anterior · Hoje · Próximo (D-06). */
function NavBar({
  label,
  onPrev,
  onToday,
  onNext,
}: {
  label: string
  onPrev: () => void
  onToday: () => void
  onNext: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-base font-semibold capitalize">{label}</span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" onClick={onPrev} aria-label="Anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onToday}>
          Hoje
        </Button>
        <Button variant="outline" size="icon" onClick={onNext} aria-label="Próximo">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

/** Semana: computa os 7 dias (segunda→domingo, D-11) e delega ao grid dia/semana. */
function WeekTab({
  anchor,
  slotsByDate,
  minuteRows,
  timeZone,
  todayLocal,
  onPrev,
  onToday,
  onNext,
}: {
  anchor: Date
  slotsByDate: Map<string, SerializedSlot[]>
  minuteRows: number[]
  timeZone: string
  todayLocal: string
  onPrev: () => void
  onToday: () => void
  onNext: () => void
}) {
  const context = { in: tz(timeZone) }
  const weekStart = startOfWeek(anchor, { ...context, weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i, context))
  const label = `Semana de ${format(weekStart, "dd/MM", { ...context, locale: ptBR })}`

  return (
    <DayWeekGrid
      days={days}
      slotsByDate={slotsByDate}
      minuteRows={minuteRows}
      timeZone={timeZone}
      todayLocal={todayLocal}
      onPrev={onPrev}
      onToday={onToday}
      onNext={onNext}
      label={label}
    />
  )
}

/** Grid dia/semana (D-08): CSS grid custom, gutter + N colunas × linhas de 30 min. */
function DayWeekGrid({
  days,
  slotsByDate,
  minuteRows,
  timeZone,
  todayLocal,
  onPrev,
  onToday,
  onNext,
  label,
}: {
  days: Date[]
  slotsByDate: Map<string, SerializedSlot[]>
  minuteRows: number[]
  timeZone: string
  todayLocal: string
  onPrev: () => void
  onToday: () => void
  onNext: () => void
  label: string
}) {
  const gridTemplateColumns = `4rem repeat(${days.length}, minmax(4rem, 1fr))`
  const gridTemplateRows = `2.5rem repeat(${minuteRows.length}, 1.5rem)`

  const hasAnySlot = days.some(
    (d) => (slotsByDate.get(localDateOf(d, timeZone)) ?? []).length > 0,
  )

  return (
    <div className="flex flex-col gap-4">
      <NavBar label={label} onPrev={onPrev} onToday={onToday} onNext={onNext} />

      {!hasAnySlot ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm font-medium">
            Sem horários disponíveis neste período.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajuste sua disponibilidade ou verifique se há uma folga cadastrada.
          </p>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <div
          className="grid min-w-[20rem] text-sm"
          style={{ gridTemplateColumns, gridTemplateRows }}
        >
          <div className="sticky left-0 z-20 border-b border-r bg-muted" />
          {days.map((day) => {
            const localDate = localDateOf(day, timeZone)
            const isToday = localDate === todayLocal
            return (
              <div
                key={`head-${localDate}`}
                className={cn(
                  "sticky top-0 z-10 flex flex-col items-center justify-center border-b bg-muted font-normal text-muted-foreground",
                  isToday && "text-primary",
                )}
              >
                <span className="text-xs">
                  {DAY_LABELS[(day.getDay() + 6) % 7]}
                </span>
                <span className={cn(isToday && "font-semibold")}>
                  {format(day, "dd", { in: tz(timeZone) })}
                </span>
              </div>
            )
          })}

          {minuteRows.map((minute) => (
            <React.Fragment key={`row-${minute}`}>
              <div className="sticky left-0 z-10 flex items-start justify-end border-r bg-muted pr-2 text-xs text-muted-foreground">
                {minute % 60 === 0 ? minutesToLabel(minute) : null}
              </div>
              {days.map((day) => {
                const localDate = localDateOf(day, timeZone)
                const daySlots = slotsByDate.get(localDate) ?? []
                const slotHere = daySlots.find(
                  (s) => localMinuteOf(s.start, timeZone) === minute,
                )
                const isToday = localDate === todayLocal
                return (
                  <div
                    key={`${localDate}-${minute}`}
                    className={cn(
                      "border-b border-r",
                      minute % 60 === 30 && "border-b-muted",
                      isToday && "bg-primary/[0.03]",
                    )}
                  >
                    {slotHere ? (
                      <div className="flex h-full w-full items-center justify-center bg-primary/10 text-xs text-foreground">
                        {minutesToLabel(minute)}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Grid do mês (D-07): dot + contagem por dia, NUNCA horários reais. */
function MonthGrid({
  monthCursor,
  byDay,
  timeZone,
  todayLocal,
  onPrev,
  onToday,
  onNext,
}: {
  monthCursor: Date
  byDay: ByDay
  timeZone: string
  todayLocal: string
  onPrev: () => void
  onToday: () => void
  onNext: () => void
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

  const label = format(monthCursor, "MMMM 'de' yyyy", {
    ...context,
    locale: ptBR,
  })

  const hasAny = cells.some((d) => {
    const local = localDateOf(d, timeZone)
    return (
      d >= monthStart && d <= monthEnd && byDay[local]?.hasAvailability === true
    )
  })

  return (
    <div className="flex flex-col gap-4">
      <NavBar label={label} onPrev={onPrev} onToday={onToday} onNext={onNext} />

      {!hasAny ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm font-medium">Sem atendimento neste mês.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure sua disponibilidade recorrente para ver os dias de
            atendimento.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
        {DAY_LABELS.map((label) => (
          <div
            key={`mh-${label}`}
            className="bg-muted py-2 text-center text-sm text-muted-foreground"
          >
            {label}
          </div>
        ))}
        {cells.map((day) => {
          const localDate = localDateOf(day, timeZone)
          const inMonth = day >= monthStart && day <= monthEnd
          const summary = byDay[localDate]
          const isToday = localDate === todayLocal
          return (
            <div
              key={localDate}
              className={cn(
                "flex min-h-20 flex-col gap-1 bg-background p-2",
                !inMonth && "bg-muted/40 text-muted-foreground",
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
                  {format(day, "d", { in: tz(timeZone) })}
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
            </div>
          )
        })}
      </div>
    </div>
  )
}
