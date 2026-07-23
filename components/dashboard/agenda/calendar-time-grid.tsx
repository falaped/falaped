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
 * 260723-du8; simplificada em 260723-kej): eixo de horas à esquerda (gutter), N
 * colunas-dia (semana começa Seg, o pai já ordena), altura de hora fixa `HOUR_H`,
 * coluna de HOJE destacada, LINHA DE AGORA só na coluna de hoje, e as consultas
 * como BLOCOS ABSOLUTOS posicionados por horário+duração.
 *
 * SOMENTE VISUALIZAÇÃO + CRIAR CONSULTA (D-1, 260723-kej): a grade NÃO edita mais
 * disponibilidade/folga — todos os gestos de pintura/arraste, o menu de
 * disponibilidade e o clique-direito-folga foram removidos e vivem agora no painel
 * lateral. O fundo continua mostrando o read-only (disponível/folga/vazio) e cada
 * faixa de 30 min é um `<button>` com um `onClick` simples: numa consulta abre o
 * detalhe; num slot LIVRE+futuro abre a criação de consulta; folga/vazio/passado
 * são no-op.
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
  selectedLocalDate,
  onSelectDay,
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
  /**
   * Data local (YYYY-MM-DD) do dia SELECIONADO no painel (M-2). Quando presente,
   * o cabeçalho/coluna correspondente recebe destaque token-only distinto de hoje.
   */
  selectedLocalDate?: string
  /**
   * Seleciona um dia clicando no cabeçalho da coluna (M-1). Quando presente, o
   * cabeçalho vira um `<button>` acessível que chama `onSelectDay(localDate)`.
   */
  onSelectDay?: (localDate: string) => void
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

  /**
   * Clique simples numa faixa de fundo (D-1, 260723-kej): substitui a antiga
   * desambiguação clique-vs-arraste. Numa consulta → detalhe; num slot LIVRE +
   * futuro → criar consulta; folga/vazio/passado → no-op (a grade não edita mais
   * disponibilidade).
   */
  function handleBackgroundClick(
    event: React.MouseEvent<HTMLButtonElement>,
    localDate: string,
    minute: number,
  ) {
    const anchor = { x: event.clientX, y: event.clientY }
    const appointment = appointmentOf?.(localDate, minute) ?? null
    if (appointment && onAppointmentSelect) {
      onAppointmentSelect(appointment, anchor)
      return
    }
    const state = cellStateOf(localDate, minute)
    const bookable = isCellBookable?.(localDate, minute) ?? true
    if (state === "available" && bookable && onAppointmentCreate) {
      onAppointmentCreate(localDate, minute, anchor)
    }
    // Slot livre no passado, folga e vazio → no-op.
  }

  const todayColumnIndex = days.findIndex((d) => d.localDate === todayLocalDate)
  const showNowLine =
    nowMinuteOfToday !== null &&
    todayColumnIndex >= 0 &&
    nowMinuteOfToday >= windowStart &&
    nowMinuteOfToday <= windowEnd

  const gridTemplateColumns = `3.25rem repeat(${days.length}, minmax(3.5rem, 1fr))`

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[20rem] select-none">
        {/* Cabeçalho: gutter vazio + uma célula por dia (dow + dnum). */}
        <div
          className="grid border-b"
          style={{ gridTemplateColumns }}
        >
          <div className="border-r bg-muted" />
          {days.map((day) => {
            const isSelected = day.localDate === selectedLocalDate
            const headerContent = (
              <>
                <span className="text-xs uppercase">{day.weekdayLabel}</span>
                {day.isToday ? (
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground tabular-nums">
                    {day.dayNumber}
                  </span>
                ) : (
                  <span className="text-sm tabular-nums">{day.dayNumber}</span>
                )}
              </>
            )
            // Destaque do dia SELECIONADO (M-2): anel token-only, distinto do
            // círculo de "hoje" (que continua no número). Os dois coexistem.
            const selectedRing = isSelected && "ring-2 ring-primary rounded-md"
            if (onSelectDay) {
              return (
                <button
                  key={`head-${day.localDate}`}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`Selecionar dia ${day.weekdayLabel} ${day.dayNumber}`}
                  onClick={() => onSelectDay(day.localDate)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 bg-muted py-2 text-muted-foreground transition-colors hover:bg-muted/70",
                    day.isToday && "text-primary",
                    selectedRing,
                  )}
                >
                  {headerContent}
                </button>
              )
            }
            return (
              <div
                key={`head-${day.localDate}`}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 bg-muted py-2 text-muted-foreground",
                  day.isToday && "text-primary",
                  selectedRing,
                )}
              >
                {headerContent}
              </div>
            )
          })}
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
                // Coluna do dia SELECIONADO (M-2): realce token-only, distinto de
                // hoje (anel lateral em vez do fundo do círculo).
                day.localDate === selectedLocalDate &&
                  "bg-primary/5 ring-2 ring-inset ring-primary/40",
              )}
              style={{ height: bodyHeight }}
            >
              {/* Camada de fundo READ-ONLY: faixas de 30 min (clique = agendar). */}
              {minuteRows.map((minute) => {
                const state = cellStateOf(day.localDate, minute)
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
                    }`}
                    aria-pressed={state !== "empty"}
                    onClick={(event) =>
                      handleBackgroundClick(event, day.localDate, minute)
                    }
                    className={cn(
                      "absolute left-0 right-0 border-b border-b-border/60 transition-colors",
                      state === "available" &&
                        "bg-primary/25 hover:bg-primary/35",
                      state === "off" && "bg-muted hover:bg-muted/80",
                      state === "empty" && "hover:bg-muted",
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
