"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  APPOINTMENT_STATUS_STYLE,
  type CellAppointment,
} from "./appointment-status-style"
import {
  STEP,
  dateCellKey,
  minutesToLabel,
  type CellState,
  type DayColumn,
  type MenuAnchor,
} from "./calendar-day-week-grid"

/** Altura de uma hora na grade de tempo, em px (análogo ao `--hour-h` do mockup). */
export const HOUR_H = 54

/**
 * Um bloco de consulta JÁ POSICIONADO pelo pai (grade "burra"/testável): o pai
 * converte `starts_at`/`ends_at` (fuso da clínica) em `startMinute`/`endMinute`
 * ancorados na MESMA janela que a grade renderiza, e resolve a precedência
 * ativo>histórico (D-07). A grade só multiplica por `HOUR_H` para posicionar.
 */
export type PositionedAppointment = {
  appointment: CellAppointment
  /** Índice da coluna-dia (0..days.length-1). */
  columnIndex: number
  /** Minuto-do-dia do início (wall-clock, ancorado na janela visível). */
  startMinute: number
  /** Minuto-do-dia do fim exclusivo (wall-clock). */
  endMinute: number
  /**
   * `true` para status ATIVO (pendente/confirmada) — fica à frente (z maior) do
   * histórico num horário re-marcado (D-07).
   */
  isActive: boolean
}

/**
 * GRADE DE TEMPO Dia/Semana (redesign híbrido Google Agenda × Calendly,
 * 260723-du8). Substitui o papel visual de `CalendarDayWeekGrid` no Dia/Semana:
 * eixo de horas à esquerda (gutter), N colunas-dia (semana começa Seg, o pai já
 * ordena), altura de hora fixa `HOUR_H`, coluna de HOJE destacada, LINHA DE AGORA
 * só na coluna de hoje, e as consultas como BLOCOS ABSOLUTOS posicionados por
 * horário+duração (não uma célula por consulta).
 *
 * A PINTURA DE DISPONIBILIDADE da Fase 6 é PRESERVADA: atrás dos blocos, cada
 * coluna-dia tem uma faixa clicável por linha de 30 min (`STEP`) que reusa a
 * mesma lógica de Pointer Events do grid legado (pointerDown/Enter/Move/Up +
 * contextMenu, `setPointerCapture`, limiar de 6px, distinção clique-vs-arraste).
 * Só o LAYOUT visual muda — a semântica dos callbacks é idêntica.
 *
 * LINHA DE AGORA: o mockup usa vermelho (`--now`), mas para ficar SÓ em token
 * Falaped usamos `bg-primary` (azul) — o vermelho (`destructive`) fica reservado
 * ao status Falta, evitando colisão de leitura (D decisão do redesign).
 *
 * Tokens oklch apenas; sem hex/rgb. Copy PT-BR.
 */
export function CalendarTimeGrid({
  days,
  minuteRows,
  positioned,
  cellStateOf,
  appointmentOf,
  isCellBookable,
  nowMinuteOfToday,
  todayLocalDate,
  onDragSelect,
  onCellMenu,
  onAppointmentCreate,
  onAppointmentSelect,
}: {
  days: DayColumn[]
  /** Minutos-do-dia (passo `STEP`) da janela visível; define início/fim. */
  minuteRows: number[]
  /** Blocos de consulta já posicionados pelo pai (ativo vence histórico). */
  positioned: PositionedAppointment[]
  /** Estado atual de uma célula (available/off/empty) no draft. */
  cellStateOf: (localDate: string, minute: number) => CellState
  /**
   * Consulta ATIVA/histórica numa célula (D-07). Usada só para a desambiguação do
   * clique-vs-detalhe na faixa de fundo (o RENDER do bloco vem de `positioned`).
   */
  appointmentOf?: (localDate: string, minute: number) => CellAppointment | null
  /** `true` quando o slot começa DEPOIS de "agora" (só futuro é agendável). */
  isCellBookable?: (localDate: string, minute: number) => boolean
  /**
   * Minuto-do-dia de "agora" no fuso da clínica (para a linha de agora). `null` =
   * hoje não está visível → sem linha. O pai congela o "agora" na montagem.
   */
  nowMinuteOfToday: number | null
  /** Data local (YYYY-MM-DD) de hoje, para achar a coluna da linha de agora. */
  todayLocalDate: string
  onDragSelect: (
    localDate: string,
    startMinute: number,
    endMinute: number,
  ) => void
  onCellMenu: (
    localDate: string,
    minute: number,
    button: "left" | "right",
    anchor: MenuAnchor,
  ) => void
  onAppointmentCreate?: (
    localDate: string,
    minute: number,
    anchor: MenuAnchor,
  ) => void
  onAppointmentSelect?: (
    appointment: CellAppointment,
    anchor: MenuAnchor,
  ) => void
}) {
  const windowStart = minuteRows.length > 0 ? minuteRows[0] : 6 * 60
  const windowEnd =
    minuteRows.length > 0 ? minuteRows[minuteRows.length - 1] + STEP : 18 * 60
  const totalMinutes = windowEnd - windowStart
  const bodyHeight = (totalMinutes / 60) * HOUR_H

  // Rótulos de hora cheia dentro da janela (HH:00).
  const hourLabels = React.useMemo(() => {
    const labels: number[] = []
    const firstHour = Math.ceil(windowStart / 60) * 60
    for (let m = firstHour; m <= windowEnd; m += 60) labels.push(m)
    return labels
  }, [windowStart, windowEnd])

  // px do topo de um minuto-do-dia (relativo ao início da janela).
  const topOf = React.useCallback(
    (minute: number) => ((minute - windowStart) / 60) * HOUR_H,
    [windowStart],
  )

  // ---------- gesto de disponibilidade (Fase 6, portado 1:1) ----------
  const gestureRef = React.useRef<{
    localDate: string
    startMinute: number
    currentMinute: number
    moved: boolean
    pointerId: number
    startX: number
    startY: number
  } | null>(null)

  const [preview, setPreview] = React.useState<{
    localDate: string
    lo: number
    hi: number
  } | null>(null)

  const clearGesture = React.useCallback(() => {
    gestureRef.current = null
    setPreview(null)
  }, [])

  function handlePointerDown(
    event: React.PointerEvent<HTMLButtonElement>,
    localDate: string,
    minute: number,
  ) {
    if (event.button === 2) return
    if (event.button !== 0) return
    gestureRef.current = {
      localDate,
      startMinute: minute,
      currentMinute: minute,
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    }
    setPreview({ localDate, lo: minute, hi: minute })
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Ambiente sem suporte a pointer capture — arraste vira best-effort.
    }
  }

  function handlePointerEnter(localDate: string, minute: number) {
    const gesture = gestureRef.current
    if (!gesture) return
    if (gesture.localDate !== localDate) return
    if (minute !== gesture.startMinute) gesture.moved = true
    gesture.currentMinute = minute
    const lo = Math.min(gesture.startMinute, minute)
    const hi = Math.max(gesture.startMinute, minute)
    setPreview({ localDate, lo, hi })
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const gesture = gestureRef.current
    if (!gesture) return
    const dx = Math.abs(event.clientX - gesture.startX)
    const dy = Math.abs(event.clientY - gesture.startY)
    if (dx > 6 || dy > 6) gesture.moved = true
  }

  function handlePointerUp(
    event: React.PointerEvent<HTMLButtonElement>,
    localDate: string,
    minute: number,
  ) {
    const gesture = gestureRef.current
    if (!gesture || event.button !== 0) return
    const wasDrag =
      gesture.moved && gesture.currentMinute !== gesture.startMinute
    if (wasDrag) {
      const lo = Math.min(gesture.startMinute, gesture.currentMinute)
      const hi = Math.max(gesture.startMinute, gesture.currentMinute)
      onDragSelect(gesture.localDate, lo, hi + STEP)
    } else {
      // Desambiguação idêntica ao grid legado (07-UI-SPEC §1 + 07-03).
      const anchor = { x: event.clientX, y: event.clientY }
      const appointment = appointmentOf?.(localDate, minute) ?? null
      const state = cellStateOf(localDate, minute)
      const bookable = isCellBookable?.(localDate, minute) ?? true
      const isActive =
        appointment !== null &&
        (appointment.status === "pending" ||
          appointment.status === "confirmed")

      if (isActive && onAppointmentSelect) {
        onAppointmentSelect(appointment!, anchor)
      } else if (state === "available" && bookable && onAppointmentCreate) {
        onAppointmentCreate(localDate, minute, anchor)
      } else if (appointment && onAppointmentSelect) {
        onAppointmentSelect(appointment, anchor)
      } else if (state === "available" && !bookable) {
        // Slot livre no passado: não é agendável → no-op.
      } else {
        onCellMenu(localDate, minute, "left", anchor)
      }
    }
    clearGesture()
  }

  function handleContextMenu(
    event: React.MouseEvent<HTMLButtonElement>,
    localDate: string,
    minute: number,
  ) {
    event.preventDefault()
    clearGesture()
    onCellMenu(localDate, minute, "right", {
      x: event.clientX,
      y: event.clientY,
    })
  }

  const isPreviewed = (localDate: string, minute: number) =>
    preview !== null &&
    preview.localDate === localDate &&
    minute >= preview.lo &&
    minute <= preview.hi

  const todayColumnIndex = days.findIndex((d) => d.localDate === todayLocalDate)
  const showNowLine =
    nowMinuteOfToday !== null &&
    todayColumnIndex >= 0 &&
    nowMinuteOfToday >= windowStart &&
    nowMinuteOfToday <= windowEnd

  const gridTemplateColumns = `3.25rem repeat(${days.length}, minmax(3.5rem, 1fr))`

  return (
    <div className="overflow-x-auto">
      <div
        className="min-w-[20rem] select-none"
        style={{ touchAction: "none" }}
        onPointerLeave={clearGesture}
        onPointerCancel={clearGesture}
      >
        {/* Cabeçalho: gutter vazio + uma célula por dia (dow + dnum). */}
        <div
          className="grid border-b"
          style={{ gridTemplateColumns }}
        >
          <div className="border-r bg-muted" />
          {days.map((day) => (
            <div
              key={`head-${day.localDate}`}
              className={cn(
                "flex flex-col items-center justify-center gap-1 bg-muted py-2 text-muted-foreground",
                day.isToday && "text-primary",
              )}
            >
              <span className="text-xs uppercase">{day.weekdayLabel}</span>
              {day.isToday ? (
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground tabular-nums">
                  {day.dayNumber}
                </span>
              ) : (
                <span className="text-sm tabular-nums">{day.dayNumber}</span>
              )}
            </div>
          ))}
        </div>

        {/* Corpo: gutter de horas + N colunas-dia (blocos absolutos por cima). */}
        <div className="grid" style={{ gridTemplateColumns }}>
          {/* Gutter de horas. */}
          <div className="relative border-r bg-muted" style={{ height: bodyHeight }}>
            {hourLabels.map((minute) => (
              <span
                key={`t-${minute}`}
                className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground tabular-nums"
                style={{ top: topOf(minute) }}
              >
                {minutesToLabel(minute)}
              </span>
            ))}
          </div>

          {/* Colunas-dia. */}
          {days.map((day, columnIndex) => (
            <div
              key={`col-${day.localDate}`}
              className={cn(
                "relative border-r",
                day.isToday && "bg-primary/5",
              )}
              style={{ height: bodyHeight }}
            >
              {/* Camada de fundo: faixas de 30 min clicáveis (disponibilidade). */}
              {minuteRows.map((minute) => {
                const state = cellStateOf(day.localDate, minute)
                const previewed = isPreviewed(day.localDate, minute)
                return (
                  <button
                    key={dateCellKey(day.localDate, minute)}
                    type="button"
                    aria-label={`${minutesToLabel(minute)} — ${
                      state === "available"
                        ? "disponível (clique para agendar uma consulta)"
                        : state === "off"
                          ? "folga"
                          : "vazio"
                    } (botão direito para folga)`}
                    aria-pressed={state !== "empty"}
                    onPointerDown={(event) =>
                      handlePointerDown(event, day.localDate, minute)
                    }
                    onPointerEnter={() =>
                      handlePointerEnter(day.localDate, minute)
                    }
                    onPointerMove={handlePointerMove}
                    onPointerUp={(event) =>
                      handlePointerUp(event, day.localDate, minute)
                    }
                    onContextMenu={(event) =>
                      handleContextMenu(event, day.localDate, minute)
                    }
                    className={cn(
                      "absolute left-0 right-0 border-b border-b-border/60 transition-colors",
                      state === "available" &&
                        "bg-primary/25 hover:bg-primary/35",
                      state === "off" && "bg-muted hover:bg-muted/80",
                      state === "empty" && "hover:bg-muted",
                      previewed && "z-[1] bg-primary/40 ring-2 ring-inset ring-primary",
                    )}
                    style={{
                      top: topOf(minute),
                      height: (STEP / 60) * HOUR_H,
                    }}
                  />
                )
              })}

              {/* Linha de AGORA (só na coluna de hoje). Token: bg-primary. */}
              {showNowLine && columnIndex === todayColumnIndex ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 z-10 h-0"
                  style={{ top: topOf(nowMinuteOfToday!) }}
                >
                  <span className="absolute -left-1 -top-1 size-2 rounded-full bg-primary" />
                  <span className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
                </div>
              ) : null}

              {/* BLOCOS de consulta (absolutos, posicionados por horário/duração). */}
              {positioned
                .filter((p) => p.columnIndex === columnIndex)
                .map((p) => {
                  const style = APPOINTMENT_STATUS_STYLE[p.appointment.status]
                  const rawHeight =
                    ((p.endMinute - p.startMinute) / 60) * HOUR_H
                  const height = Math.max(rawHeight - 2, HOUR_H / 2 - 2)
                  return (
                    <button
                      key={`ev-${p.appointment.id}-${p.startMinute}`}
                      type="button"
                      onClick={(event) =>
                        onAppointmentSelect?.(p.appointment, {
                          x: event.clientX,
                          y: event.clientY,
                        })
                      }
                      aria-label={`${p.appointment.timeLabel} — ${style.label}: ${p.appointment.patientName}`}
                      className={cn(
                        "absolute left-1 right-1 flex flex-col gap-0.5 overflow-hidden rounded-md px-1.5 py-1 text-left transition-transform hover:-translate-y-px",
                        style.cell,
                        p.isActive ? "z-[6]" : "z-[3]",
                      )}
                      style={{ top: topOf(p.startMinute), height }}
                    >
                      {/* Hachura diagonal (Cancelada) — token-only. */}
                      {style.hatch ? (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 opacity-40 [background-image:repeating-linear-gradient(45deg,var(--color-muted-foreground)_0,var(--color-muted-foreground)_1px,transparent_1px,transparent_6px)]"
                        />
                      ) : null}
                      <span className="relative flex items-center gap-1">
                        <style.Icon className="size-3 shrink-0" />
                        <span
                          className={cn(
                            "truncate text-xs font-medium",
                            style.strike && "line-through",
                          )}
                        >
                          {p.appointment.patientName}
                        </span>
                      </span>
                      <span className="relative truncate text-[11px] tabular-nums opacity-85">
                        {p.appointment.timeLabel} · {style.label}
                      </span>
                    </button>
                  )
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
