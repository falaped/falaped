"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/** Passo de 30 min por célula (D-03). */
export const STEP = 30

/** Fim do dia alcançável: 1440 = 24:00 (WR-04, coerente com o teto do DB). */
export const DAY_END = 24 * 60

/** Modo de pintura ativo (definido pelo toggle do painel, D-15). */
export type PaintMode = "available" | "off"

/** Chave estável de uma célula pintada por data local: "YYYY-MM-DD:minute". */
export function dateCellKey(localDate: string, minute: number): string {
  return `${localDate}:${minute}`
}

/** Rótulo "HH:MM" de um minuto-desde-meia-noite. */
export function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

/** Estado por célula derivado das grades disponível/folga. */
export type CellState = "available" | "off" | "empty"

export type DayColumn = {
  /** Data local "YYYY-MM-DD". */
  localDate: string
  /** Rótulo curto (ex.: "Ter"). */
  weekdayLabel: string
  /** Número do dia (ex.: "12"). */
  dayNumber: string
  /** É hoje (destaque). */
  isToday: boolean
}

/**
 * Grade dia/semana editável (D-08/D-14/D-16): CSS grid custom (nenhuma lib de
 * calendário), gutter de horário + N colunas-dia × linhas de 30 min. A faixa
 * visível vai de `rangeStart` até `rangeEnd` (até 1440 = 24:00, WR-04).
 *
 * PINTURA (D-16):
 * - CLIQUE (baseline obrigatório): alterna uma célula no modo ativo.
 * - ARRASTE (enhancement, Pointer Events): pinta um período contíguo numa
 *   coluna-dia; `setPointerCapture` + `pointerdown/move/up`, `touch-action: none`.
 * O modo pintado (`paintMode`) vem do toggle Disponibilidade|Folga do painel.
 *
 * Verde (`bg-primary`) = disponível; folga = neutro (`bg-muted` + hachura),
 * NUNCA destructive-red (D-15). Não persiste nada — só emite `onPaint` ao pai,
 * que mantém o draft e salva em lote (D-17).
 */
export function CalendarDayWeekGrid({
  days,
  minuteRows,
  cellStateOf,
  paintMode,
  onPaint,
}: {
  days: DayColumn[]
  minuteRows: number[]
  /** Estado atual de uma célula (available/off/empty) no draft. */
  cellStateOf: (localDate: string, minute: number) => CellState
  paintMode: PaintMode
  /** Aplica o modo ativo a uma célula (toggle no clique / set no arraste). */
  onPaint: (localDate: string, minute: number, options?: { toggle?: boolean }) => void
}) {
  const gridTemplateColumns = `4rem repeat(${days.length}, minmax(3.5rem, 1fr))`
  const gridTemplateRows = `2.5rem repeat(${minuteRows.length}, 1.5rem)`

  // Estado de arraste (enhancement). Guardamos a coluna-dia e se estamos pintando.
  const dragRef = React.useRef<{ localDate: string; active: boolean } | null>(
    null,
  )

  function handlePointerDown(
    event: React.PointerEvent<HTMLButtonElement>,
    localDate: string,
    minute: number,
  ) {
    // Clique-toggle é o baseline: alterna a célula.
    onPaint(localDate, minute, { toggle: true })
    // Inicia o arraste (enhancement): captura o ponteiro nesta coluna-dia.
    dragRef.current = { localDate, active: true }
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // setPointerCapture pode falhar em ambientes sem suporte — arraste é opcional.
    }
  }

  function handlePointerEnter(localDate: string, minute: number) {
    const drag = dragRef.current
    if (!drag || !drag.active) return
    // Só pinta dentro da MESMA coluna-dia em que o arraste começou.
    if (drag.localDate !== localDate) return
    // No arraste, SET o modo ativo (não toggle) para pintar um período contíguo.
    onPaint(localDate, minute, { toggle: false })
  }

  function endDrag() {
    dragRef.current = null
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[20rem] text-sm select-none"
        style={{ gridTemplateColumns, gridTemplateRows, touchAction: "none" }}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
      >
        {/* Canto gutter × header. */}
        <div className="sticky left-0 z-20 border-b border-r bg-muted" />

        {/* Cabeçalho das colunas-dia. */}
        {days.map((day) => (
          <div
            key={`head-${day.localDate}`}
            className={cn(
              "sticky top-0 z-10 flex flex-col items-center justify-center border-b bg-muted font-normal text-muted-foreground",
              day.isToday && "text-primary",
            )}
          >
            <span className="text-xs">{day.weekdayLabel}</span>
            <span className={cn(day.isToday && "font-semibold")}>
              {day.dayNumber}
            </span>
          </div>
        ))}

        {/* Linhas de horário. */}
        {minuteRows.map((minute) => (
          <React.Fragment key={`row-${minute}`}>
            <div className="sticky left-0 z-10 flex items-start justify-end border-r bg-muted pr-2 text-xs text-muted-foreground">
              {minute % 60 === 0 ? minutesToLabel(minute) : null}
            </div>
            {days.map((day) => {
              const state = cellStateOf(day.localDate, minute)
              return (
                <div
                  key={dateCellKey(day.localDate, minute)}
                  className={cn(
                    "border-b border-r",
                    minute % 60 === 30 && "border-b-muted",
                  )}
                >
                  <button
                    type="button"
                    aria-label={`${minutesToLabel(minute)} — ${
                      paintMode === "available"
                        ? "marcar disponibilidade"
                        : "marcar folga"
                    }`}
                    aria-pressed={state !== "empty"}
                    onPointerDown={(event) =>
                      handlePointerDown(event, day.localDate, minute)
                    }
                    onPointerEnter={() =>
                      handlePointerEnter(day.localDate, minute)
                    }
                    className={cn(
                      "h-full w-full transition-colors",
                      state === "available" &&
                        "bg-primary/25 hover:bg-primary/35",
                      state === "off" &&
                        "bg-muted [background-image:repeating-linear-gradient(45deg,transparent,transparent_4px,var(--color-muted-foreground)_4px,var(--color-muted-foreground)_5px)] opacity-70 hover:opacity-90",
                      state === "empty" && "hover:bg-muted",
                    )}
                  />
                </div>
              )
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export { DAY_LABELS }
