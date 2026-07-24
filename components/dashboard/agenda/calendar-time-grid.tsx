"use client"

import * as React from "react"

import { Badge } from "@/components/ui/badge"
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

/**
 * Um bloco de consulta JÁ POSICIONADO pelo pai (grade "burra"/testável): o pai
 * converte `starts_at`/`ends_at` (fuso da clínica) em `startMinute`/`endMinute`
 * ancorados na MESMA janela que a grade renderiza, e resolve a precedência
 * ativo>histórico (D-07). A grade posiciona por PORCENTAGEM da janela (C-1: sem
 * scroll vertical — a grade preenche a altura fornecida pelo pai via flex).
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
 * colunas-dia (semana começa Seg, o pai já ordena), a grade PREENCHE a altura do
 * container (C-1: sem scroll vertical — porcentagem da janela + flex),
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

  // Rótulos de hora cheia dentro da janela (HH:00).
  const hourLabels = React.useMemo(() => {
    const labels: number[] = []
    const firstHour = Math.ceil(windowStart / 60) * 60
    for (let m = firstHour; m <= windowEnd; m += 60) labels.push(m)
    return labels
  }, [windowStart, windowEnd])

  // Porcentagem do topo de um minuto-do-dia (relativo à janela) — C-1: sem px.
  const topPct = React.useCallback(
    (minute: number) => ((minute - windowStart) / totalMinutes) * 100,
    [windowStart, totalMinutes],
  )

  // Porcentagem da altura de um intervalo [from, to) relativo à janela — C-1.
  const heightPct = React.useCallback(
    (fromMinute: number, toMinute: number) =>
      ((toMinute - fromMinute) / totalMinutes) * 100,
    [totalMinutes],
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
    <div className="flex h-full flex-col overflow-x-auto">
      <div className="flex min-h-0 min-w-[20rem] flex-1 flex-col select-none">
        {/* Cabeçalho: gutter vazio + uma célula por dia (dow + dnum). */}
        <div
          className="grid shrink-0 border-b"
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
                {/* E-3: tag "Selecionado" SÓ no header do dia escolhido,
                    visualmente distinta do "hoje" (número em bolinha). */}
                {isSelected ? (
                  <Badge variant="outline" className="border-primary text-primary">
                    Selecionado
                  </Badge>
                ) : null}
              </>
            )
            // E-3: o dia SELECIONADO é marcado APENAS no header (fundo primary/10 +
            // texto primary + barra inferior), token-only e DISTINTO do "hoje"
            // (número em bolinha). A coluna/células NÃO recebem realce.
            const selectedTab =
              isSelected &&
              "bg-primary/10 text-primary border-b-2 border-primary"
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
                    selectedTab,
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
                  selectedTab,
                )}
              >
                {headerContent}
              </div>
            )
          })}
        </div>

        {/* Corpo: gutter de horas + N colunas-dia (blocos absolutos por cima).
            C-1: preenche a altura (flex-1 min-h-0); posicionamento por %. */}
        <div
          className="grid min-h-0 flex-1"
          style={{ gridTemplateColumns }}
        >
          {/* Gutter de horas. */}
          <div className="relative h-full border-r bg-muted">
            {hourLabels.map((minute) => (
              <span
                key={`t-${minute}`}
                className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground tabular-nums"
                style={{ top: `${topPct(minute)}%` }}
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
                "relative h-full border-r",
                day.isToday && "bg-primary/5",
                // E-3: a coluna NÃO recebe mais realce de seleção — apenas o
                // HEADER fica marcado (Badge "Selecionado"). Mantido só o "hoje".
              )}
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
                      // Paleta pastel (260724-gyi): disponível = menta clara com
                      // degradê; folga = areia clara com degradê + hachura; vazio =
                      // branco. Classes utilitárias oklch centralizadas em globals.css.
                      state === "available" && "agenda-avail",
                      state === "off" && "agenda-folga",
                      state === "empty" && "agenda-vazio",
                    )}
                    style={{
                      top: `${topPct(minute)}%`,
                      height: `${heightPct(minute, minute + STEP)}%`,
                    }}
                  />
                )
              })}

              {/* Linha de AGORA (só na coluna de hoje). Token: bg-primary. */}
              {showNowLine && columnIndex === todayColumnIndex ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 z-10 h-0"
                  style={{ top: `${topPct(nowMinuteOfToday!)}%` }}
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
                  // Altura em % da janela, com mínimo tolerante (~meia célula)
                  // para blocos muito curtos ainda serem clicáveis (C-1: sem px).
                  const height = Math.max(
                    heightPct(p.startMinute, p.endMinute),
                    heightPct(p.startMinute, p.startMinute + STEP / 2),
                  )
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
                      style={{
                        top: `${topPct(p.startMinute)}%`,
                        height: `${height}%`,
                      }}
                    >
                      {/* Hachura diagonal (Cancelada) — paleta pastel (260724-gyi):
                          consome var(--agenda-canceled-hatch) p/ coerência com a cor. */}
                      {style.hatch ? (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 [background:var(--agenda-canceled-hatch)]"
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
