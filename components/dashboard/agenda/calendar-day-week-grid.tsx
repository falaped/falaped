"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import type { AppointmentStatus } from "@/modules/appointments/types"
import {
  APPOINTMENT_STATUS_STYLE,
  type CellAppointment,
} from "./appointment-status-style"

/** Passo de 30 min por célula (D-03). */
export const STEP = 30

/** Fim do dia alcançável: 1440 = 24:00 (WR-04, coerente com o teto do DB). */
export const DAY_END = 24 * 60

/**
 * Modo de disponibilidade/folga de uma célula.
 * (A pintura em si agora é dirigida por menu de contexto + arraste; este tipo
 * segue descrevendo o estado visual de cada célula no draft.)
 */
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

/**
 * Status ATIVOS (ocupam o slot de fato): pendente/confirmada abrem o
 * detalhe/menu de transição. Os demais (realizada/falta/cancelada) são FINAIS —
 * histórico: a exclusion constraint no banco os ignora, então o slot pode ser
 * re-agendado (quando livre + futuro) em vez de abrir o detalhe (07-03).
 */
export function isActiveAppointmentStatus(status: AppointmentStatus): boolean {
  return status === "pending" || status === "confirmed"
}

/**
 * Contrato de status/consulta MOVIDO para `appointment-status-style.ts` (redesign
 * híbrido 260723-du8). Re-exportado aqui para não quebrar imports antigos
 * (`APPOINTMENT_STATUS_STYLE`, `CellAppointment` continuam disponíveis via
 * `./calendar-day-week-grid`).
 */
export { APPOINTMENT_STATUS_STYLE }
export type { CellAppointment }

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

/** Coordenada de tela para ancorar um menu de contexto no ponto do clique. */
export type MenuAnchor = { x: number; y: number }

/**
 * Grade dia/semana editável (D-08/D-14/D-16): CSS grid custom (nenhuma lib de
 * calendário), gutter de horário + N colunas-dia × linhas de 30 min. A faixa
 * visível vai de `minuteRows[0]` até o teto (até 1440 = 24:00, WR-04).
 *
 * INTERAÇÃO (v2, rework):
 * - BOTÃO ESQUERDO + ARRASTE numa coluna-dia: seleciona um período CONTÍGUO;
 *   ao soltar (pointerup) emite `onDragSelect(localDate, startMinute, endMinute)`
 *   — o pai cria disponibilidade para esse período (escopo default = recorrente).
 * - BOTÃO ESQUERDO sem arraste (clique puro): emite `onCellMenu(..., "left", anchor)`
 *   → o pai abre o menu "Disponibilidade".
 * - BOTÃO DIREITO (contextmenu): emite `onCellMenu(..., "right", anchor)` → o pai
 *   abre o menu "Folga".
 *
 * A distinção clique-vs-arraste usa um LIMIAR: o arraste só "conta" quando o
 * ponteiro entra numa célula diferente da inicial (ou se move além do limiar de
 * pixels). Isso faz drag e click-menu coexistirem sem o handler de contexto
 * engolir o evento: NÃO usamos o `ContextMenu.Trigger` do radix (que só abre no
 * botão direito) — a detecção é feita aqui via Pointer Events, e `onContextMenu`
 * é prevenido para não abrir o menu nativo do browser.
 *
 * `touch-action: none` no container + `setPointerCapture` na célula inicial
 * garantem que o arraste receba os `pointermove` mesmo saindo do alvo original.
 *
 * Verde (`bg-primary/25`) = disponível; folga = cinza claro liso (`bg-muted`, sem hachura),
 * NUNCA destructive-red (D-15). Não persiste nada — só emite callbacks ao pai,
 * que mantém o draft e salva em lote (D-17).
 */
export function CalendarDayWeekGrid({
  days,
  minuteRows,
  cellStateOf,
  appointmentOf,
  onDragSelect,
  onCellMenu,
  onAppointmentCreate,
  onAppointmentSelect,
  isCellBookable,
}: {
  days: DayColumn[]
  minuteRows: number[]
  /** Estado atual de uma célula (available/off/empty) no draft. */
  cellStateOf: (localDate: string, minute: number) => CellState
  /**
   * `true` quando o slot (localDate:minute) começa DEPOIS de "agora" no fuso da
   * clínica (07-03: só agenda no futuro). O pai avalia o `now` uma única vez no
   * fuso da clínica (evita o bug de TZ do host, CR-01). Ausente ⇒ sempre livre
   * (Fase 6, grade sem consultas). Slots no passado NÃO abrem "Nova consulta".
   */
  isCellBookable?: (localDate: string, minute: number) => boolean
  /**
   * Consulta ATIVA/histórica exibida numa célula (D-07: ativo vence histórico).
   * `null` = célula sem consulta. Opcional: quando ausente, a grade é só de
   * disponibilidade (Fase 6).
   */
  appointmentOf?: (localDate: string, minute: number) => CellAppointment | null
  /**
   * Arraste concluído: cria disponibilidade para [startMinute, endMinute) da
   * coluna-dia `localDate` (intervalo meio-aberto; `endMinute` = último + STEP).
   */
  onDragSelect: (
    localDate: string,
    startMinute: number,
    endMinute: number,
  ) => void
  /** Clique (esquerdo/direito) numa célula: o pai abre o menu apropriado. */
  onCellMenu: (
    localDate: string,
    minute: number,
    button: "left" | "right",
    anchor: MenuAnchor,
  ) => void
  /**
   * Clique esquerdo num slot LIVRE (available) SEM consulta → abre "Nova consulta"
   * (regra de desambiguação: slot livre → criação; célula vazia → menu Fase 6).
   * O clique alcança a criação SEM desvio de modo.
   */
  onAppointmentCreate?: (
    localDate: string,
    minute: number,
    anchor: MenuAnchor,
  ) => void
  /** Clique num slot com consulta → abre o detalhe/menu de transição no pai. */
  onAppointmentSelect?: (
    appointment: CellAppointment,
    anchor: MenuAnchor,
  ) => void
}) {
  const gridTemplateColumns = `4rem repeat(${days.length}, minmax(3.5rem, 1fr))`
  const gridTemplateRows = `2.5rem repeat(${minuteRows.length}, 1.5rem)`

  // Estado do gesto em curso (só botão esquerdo). Guardamos a coluna-dia, o
  // minuto inicial, o minuto atual sob o ponteiro e se já houve movimento
  // (para distinguir clique puro de arraste).
  const gestureRef = React.useRef<{
    localDate: string
    startMinute: number
    currentMinute: number
    moved: boolean
    pointerId: number
    startX: number
    startY: number
  } | null>(null)

  // Seleção viva durante o arraste (para feedback visual imediato).
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
    // Botão direito → deixamos o onContextMenu tratar (menu Folga). Não iniciamos
    // gesto de arraste no botão direito.
    if (event.button === 2) return
    // Só o botão principal (esquerdo) arrasta/seleciona.
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
      // Ambiente sem suporte a pointer capture — o arraste vira best-effort.
    }
  }

  function handlePointerEnter(localDate: string, minute: number) {
    const gesture = gestureRef.current
    if (!gesture) return
    // Só estende dentro da MESMA coluna-dia em que o gesto começou.
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
    // Movimento além do limiar de pixels também marca como arraste, cobrindo o
    // caso em que o ponteiro se mexe dentro da mesma célula grande.
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
      // Intervalo meio-aberto [lo, hi + STEP) — inclui a última célula tocada.
      onDragSelect(gesture.localDate, lo, hi + STEP)
    } else {
      // Clique puro (sem arraste). Desambiguação (07-UI-SPEC §1 + 07-03):
      //  - consulta ATIVA (pendente/confirmada) → detalhe/menu de transição;
      //  - consulta FINAL (cancelada/realizada/falta) SEM ativa sobreposta, em
      //    slot LIVRE + FUTURO → "Nova consulta" (re-agendar); no PASSADO/fora da
      //    disponibilidade → detalhe histórico read-only;
      //  - slot LIVRE SEM consulta + FUTURO → "Nova consulta" DIRETO;
      //  - slot LIVRE no PASSADO → no-op (não é agendável);
      //  - célula vazia → menu "Disponibilidade" da Fase 6.
      const anchor = { x: event.clientX, y: event.clientY }
      const appointment = appointmentOf?.(localDate, minute) ?? null
      const state = cellStateOf(localDate, minute)
      // Sem prop ⇒ tudo agendável (grade da Fase 6, sem regra de futuro).
      const bookable = isCellBookable?.(localDate, minute) ?? true
      const isActive =
        appointment !== null && isActiveAppointmentStatus(appointment.status)

      if (isActive && onAppointmentSelect) {
        // Consulta viva ocupa o slot → detalhe/menu de transição (como hoje).
        onAppointmentSelect(appointment!, anchor)
      } else if (state === "available" && bookable && onAppointmentCreate) {
        // Slot livre no futuro: criação OU re-agendamento sobre histórico final.
        onAppointmentCreate(localDate, minute, anchor)
      } else if (appointment && onAppointmentSelect) {
        // Consulta final em slot passado/fora da disponibilidade → histórico.
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
    // Impede o menu nativo do browser e o gesto de arraste em curso; abre "Folga".
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

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[20rem] text-sm select-none"
        style={{ gridTemplateColumns, gridTemplateRows, touchAction: "none" }}
        onPointerLeave={clearGesture}
        onPointerCancel={clearGesture}
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
              const previewed = isPreviewed(day.localDate, minute)
              const appointment = appointmentOf?.(day.localDate, minute) ?? null
              const style = appointment
                ? APPOINTMENT_STATUS_STYLE[appointment.status]
                : null
              return (
                <div
                  key={dateCellKey(day.localDate, minute)}
                  className={cn(
                    "border-b border-r",
                    minute % 60 === 30 && "border-b-muted",
                    // Continuação de uma consulta multi-célula: some a borda
                    // superior para o bloco ler contíguo (Issue C).
                    appointment && !appointment.isStart && "border-t-0",
                  )}
                >
                  <button
                    type="button"
                    aria-label={
                      appointment && style
                        ? `${minutesToLabel(minute)} — ${style.label}: ${appointment.patientName}`
                        : `${minutesToLabel(minute)} — ${
                            state === "available"
                              ? "disponível (clique para agendar uma consulta)"
                              : state === "off"
                                ? "folga"
                                : "vazio"
                          } (botão direito para folga)`
                    }
                    aria-pressed={state !== "empty" || appointment !== null}
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
                      "relative flex h-full w-full items-center gap-1 overflow-hidden px-1 text-left transition-colors",
                      // Sem consulta → tratamento de disponibilidade (Fase 6).
                      !appointment && state === "available" &&
                        "bg-primary/25 hover:bg-primary/35",
                      !appointment && state === "off" &&
                        "bg-muted hover:bg-muted/80",
                      !appointment && state === "empty" && "hover:bg-muted",
                      // Com consulta → tratamento de status (07-UI-SPEC).
                      style?.cell,
                      previewed && "ring-2 ring-inset ring-primary bg-primary/40",
                    )}
                  >
                    {appointment && style ? (
                      <>
                        {/* Hachura diagonal real (Cancelada) — token-only. */}
                        {style.hatch ? (
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 opacity-40 [background-image:repeating-linear-gradient(45deg,var(--color-muted-foreground)_0,var(--color-muted-foreground)_1px,transparent_1px,transparent_6px)]"
                          />
                        ) : null}
                        {/* Ícone/nome só na célula de início: as demais células
                            cobertas mantêm o fill do status como continuação. */}
                        {appointment.isStart ? (
                          <>
                            <style.Icon className="relative size-3 shrink-0" />
                            <span
                              className={cn(
                                "relative truncate text-xs",
                                style.strike && "line-through",
                              )}
                            >
                              {appointment.patientName}
                            </span>
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </button>
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
