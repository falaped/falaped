"use client"

import * as React from "react"
import { tz, TZDate } from "@date-fns/tz"
import {
  addDays,
  addMonths,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"

import { saveAvailabilityAction } from "@/actions"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { expandAvailability } from "@/lib/expand-availability"
import { DEFAULT_SLOT } from "./availability-cell-menu"
import {
  DAY_END,
  STEP,
  isActiveAppointmentStatus,
  minutesToLabel,
  type CellState,
  type DayColumn,
  type MenuAnchor,
} from "./calendar-day-week-grid"
import type { CellAppointment } from "./appointment-status-style"
import {
  CalendarTimeGrid,
  type PositionedAppointment,
} from "./calendar-time-grid"
import { type FreeSlot } from "./booking-rail"
import { AgendaSidePanel } from "./agenda-side-panel"
import type { AvailabilityIntent } from "./availability-panel"
import { CalendarMonthIndicator } from "./calendar-month-indicator"
import { AppointmentDetailMenu } from "./appointment-detail-menu"
import type { AppointmentStatus } from "@/modules/appointments/types"
import type { Patient } from "@/modules/patients/types"

/** Linha crua de rule (snake_case, espelha o DB / Plano 01). */
type RuleRow = {
  id: string
  weekday: number
  start_minute: number
  end_minute: number
  slot_minutes: number
}

/** Linha crua de override (snake_case, modelo híbrido v2 / Plano 01/02). */
type OverrideRow = {
  id: string
  exception_date: string
  start_minute: number | null
  end_minute: number | null
  override_type: "add" | "subtract"
  slot_minutes: number | null
}

type ByDay = Record<string, { freeSlotCount: number; hasAvailability: boolean }>

/**
 * Linha crua de consulta (snake_case, espelha o DB / Plano 01-02) já enriquecida
 * com o nome/responsável do paciente pelo RSC. starts_at/ends_at são ISO UTC.
 */
export type AppointmentRow = {
  id: string
  patient_id: string
  status: AppointmentStatus
  starts_at: string
  ends_at: string
  patient_name: string
  patient_responsible: string | null
}

const DAY_LABELS_MON_FIRST = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

/** Horizonte de expansão da folga recorrente: ~6 meses à frente (D-2). */
const FOLGA_RECURRING_HORIZON_MONTHS = 6

/** Precedência de exibição num horário re-marcado (D-07): ativo vence histórico. */
const STATUS_PRECEDENCE: Record<AppointmentStatus, number> = {
  pending: 4,
  confirmed: 5,
  done: 2,
  no_show: 2,
  canceled: 1,
}

/** É sábado (6) ou domingo (0)? A grade de edição é só Seg–Sex. */
function isWeekend(date: Date): boolean {
  const wd = date.getDay()
  return wd === 0 || wd === 6
}

/**
 * Move `date` em passos de 1 dia na direção `step` (±1) até cair num dia útil
 * (Seg–Sex), pulando fim de semana.
 */
function skipWeekend(
  date: Date,
  step: 1 | -1,
  context: { in: ReturnType<typeof tz> },
): Date {
  let cursor = date
  while (isWeekend(cursor)) {
    cursor = addDays(cursor, step, context)
  }
  return cursor
}

/** Chave "weekday:minute" da grade recorrente. */
function ruleCellKey(weekday: number, minute: number): string {
  return `${weekday}:${minute}`
}

/** Chave "YYYY-MM-DD:minute" de um override por data. */
function dateKey(localDate: string, minute: number): string {
  return `${localDate}:${minute}`
}

/** Deriva faixas contíguas a partir de um conjunto de minutos ligados. */
function bandsFromMinutes(
  isOn: (minute: number) => boolean,
  minuteRows: number[],
): { start: number; end: number }[] {
  const bands: { start: number; end: number }[] = []
  let runStart: number | null = null
  for (const minute of minuteRows) {
    const on = isOn(minute)
    if (on && runStart === null) runStart = minute
    if (!on && runStart !== null) {
      bands.push({ start: runStart, end: minute })
      runStart = null
    }
  }
  if (runStart !== null) {
    bands.push({ start: runStart, end: minuteRows[minuteRows.length - 1] + STEP })
  }
  return bands
}

/** Estado editável (draft) do calendário. */
type Draft = {
  /** Grade recorrente pintada: "weekday:minute". */
  rulePainted: Set<string>
  /** Duração de slot por faixa recorrente, chaveada por "weekday:bandStart". */
  ruleDurations: Record<string, number>
  /** Folga por data (subtrativo): "YYYY-MM-DD:minute". */
  subtractCells: Set<string>
  /** Disponibilidade extra pontual por data (aditivo): "YYYY-MM-DD:minute". */
  addCells: Set<string>
}

function buildInitialDraft(rules: RuleRow[], overrides: OverrideRow[]): Draft {
  const rulePainted = new Set<string>()
  const ruleDurations: Record<string, number> = {}
  for (const rule of rules) {
    for (let m = rule.start_minute; m < rule.end_minute; m += STEP) {
      rulePainted.add(ruleCellKey(rule.weekday, m))
    }
    ruleDurations[`${rule.weekday}:${rule.start_minute}`] = rule.slot_minutes
  }

  const subtractCells = new Set<string>()
  const addCells = new Set<string>()
  for (const ov of overrides) {
    if (ov.start_minute === null || ov.end_minute === null) {
      // Folga de dia inteiro: representamos como faixa 0..1440 na data.
      if (ov.override_type === "subtract") {
        for (let m = 0; m < DAY_END; m += STEP) {
          subtractCells.add(dateKey(ov.exception_date, m))
        }
      }
      continue
    }
    const target = ov.override_type === "add" ? addCells : subtractCells
    for (let m = ov.start_minute; m < ov.end_minute; m += STEP) {
      target.add(dateKey(ov.exception_date, m))
    }
  }

  return { rulePainted, ruleDurations, subtractCells, addCells }
}

function cloneDraft(draft: Draft): Draft {
  return {
    rulePainted: new Set(draft.rulePainted),
    ruleDurations: { ...draft.ruleDurations },
    subtractCells: new Set(draft.subtractCells),
    addCells: new Set(draft.addCells),
  }
}

/**
 * Weekday (0=domingo..6=sábado) de uma data local `YYYY-MM-DD` ANCORADA no fuso da
 * CLÍNICA — casa com o servidor (`expandAvailability` faz `new TZDate(day, tz).getDay()`
 * sobre dias já ancorados no zone).
 *
 * PORQUÊ construir a TZDate a partir dos componentes ano/mês/dia (e não de
 * `new Date(\`${localDate}T00:00:00\`)`): a string SEM sufixo de offset é parseada no
 * fuso do HOST. Num host UTC (Vercel), a meia-noite local vira 00:00Z e, ao reinterpretar
 * no fuso da clínica (America/Sao_Paulo, UTC-3), recua para 21:00 do dia ANTERIOR — o
 * `.getDay()` então devolve o weekday errado e diverge do servidor (bug CR-01). O
 * construtor por componentes ancora a meia-noite DIRETO no fuso da clínica, imune ao TZ do host.
 */
function weekdayOf(localDate: string, timeZone: string): number {
  const [year, month, day] = localDate.split("-").map(Number)
  return new TZDate(year, month - 1, day, timeZone).getDay()
}

/**
 * Calendário único (rework 260723-kej): a grade Dia/Semana/Mês é SOMENTE
 * visualização + marcação de consultas. A edição de disponibilidade/folga migrou
 * 100% para o painel lateral (`AgendaSidePanel` → `AvailabilityPanel`, D-1), que
 * emite uma intenção declarativa aplicada aqui e SALVA NA HORA (D-3) com Desfazer.
 *
 * INTERAÇÃO:
 * - Grade: clique num slot LIVRE+futuro → "Nova consulta"; clique numa consulta →
 *   detalhe/transição. A grade NÃO pinta nem abre menu de disponibilidade/folga.
 * - Painel: toggle Consulta ↔ Disponibilidade/Folga; o modo Disponibilidade edita
 *   disponibilidade E folga por Período/Dia inteiro/Recorrência (D-4..D-6).
 *
 * SALVAR-NA-HORA (D-3): cada "Aplicar" muta o draft (reusando as mutações
 * existentes) e chama `saveAvailabilityAction` com o payload completo recomputado;
 * toast de sucesso com "Desfazer", rollback em erro. Sem rascunho acumulado, sem
 * toolbar Salvar/Descartar, sem guarda de descarte ao sair da página.
 */
export function CalendarEditor({
  rules,
  overrides,
  appointments = [],
  patients = [],
  timeZone,
}: {
  rules: RuleRow[]
  overrides: OverrideRow[]
  /** Consultas da janela visível (todos os status, D-07). */
  appointments?: AppointmentRow[]
  /** Pacientes do perfil para a busca no dialog de criação (D-04). */
  patients?: Patient[]
  timeZone: string
}) {
  const context = React.useMemo(() => ({ in: tz(timeZone) }), [timeZone])

  const initialDraftRef = React.useRef<Draft>(buildInitialDraft(rules, overrides))
  const [draft, setDraft] = React.useState<Draft>(() =>
    cloneDraft(initialDraftRef.current),
  )

  // Duração default aplicada quando o payload não tem override de faixa.
  const [slotMinutes] = React.useState<number>(DEFAULT_SLOT)
  // Dia inicial = dia útil mais próximo (a grade Dia oculta Sáb/Dom).
  const [dayCursor, setDayCursor] = React.useState<Date>(() =>
    skipWeekend(new Date(), 1, { in: tz(timeZone) }),
  )
  const [monthCursor, setMonthCursor] = React.useState<Date>(() => new Date())
  const [activeTab, setActiveTab] = React.useState<string>("semana")
  const [savingAvailability, setSavingAvailability] = React.useState(false)

  // Dia selecionado no PAINEL lateral (default = dia útil mais próximo).
  const [selectedRailDate, setSelectedRailDate] = React.useState<string>(() =>
    format(skipWeekend(new Date(), 1, { in: tz(timeZone) }), "yyyy-MM-dd", {
      in: tz(timeZone),
    }),
  )

  const localDateOf = React.useCallback(
    (date: Date) => format(date, "yyyy-MM-dd", context),
    [context],
  )
  const todayLocal = localDateOf(new Date())

  // Faixa visível: 06:00–18:00 default, ESTENDIDA apenas pela DISPONIBILIDADE
  // pintada fora dessa janela (rulePainted + addCells). Folgas NUNCA alargam.
  const minuteRows = React.useMemo(() => {
    let start = 6 * 60
    let end = 18 * 60
    const scanMinuteFromKey = (key: string) => {
      const minute = Number(key.slice(key.lastIndexOf(":") + 1))
      start = Math.min(start, minute)
      end = Math.max(end, minute + STEP)
    }
    draft.rulePainted.forEach(scanMinuteFromKey)
    draft.addCells.forEach(scanMinuteFromKey)
    start = Math.max(0, start)
    end = Math.min(DAY_END, end)
    const rows: number[] = []
    for (let m = start; m < end; m += STEP) rows.push(m)
    return rows
  }, [draft])

  // Estado de exibição de uma célula (folga vence; senão aditivo/template).
  const cellStateOf = React.useCallback(
    (localDate: string, minute: number): CellState => {
      if (draft.subtractCells.has(dateKey(localDate, minute))) return "off"
      if (draft.addCells.has(dateKey(localDate, minute))) return "available"
      const weekday = weekdayOf(localDate, timeZone)
      if (draft.rulePainted.has(ruleCellKey(weekday, minute))) return "available"
      return "empty"
    },
    [draft, timeZone],
  )

  // ---------- consultas: mapa célula → consulta (D-07) ----------

  /**
   * Deriva a data local (YYYY-MM-DD) e o minuto-do-dia de um instante UTC no
   * fuso da CLÍNICA — casa com como a grade indexa as células (weekdayOf/localDate
   * já ancorados no zone). `starts_at` é o instante gravado por expandAvailability.
   */
  const cellKeyOfInstant = React.useCallback(
    (isoUtc: string): { localDate: string; minute: number } => {
      const localDate = format(new Date(isoUtc), "yyyy-MM-dd", context)
      const hh = Number(format(new Date(isoUtc), "HH", context))
      const mm = Number(format(new Date(isoUtc), "mm", context))
      return { localDate, minute: hh * 60 + mm }
    },
    [context],
  )

  /**
   * Minuto-do-dia (wall-clock no fuso da clínica) de um instante UTC, contínuo
   * através da meia-noite: se o instante caiu num dia local DIFERENTE do dia de
   * referência (`refLocalDate`), soma 1440 por dia de diferença. Usado para
   * calcular quantas células de 30 min a consulta cobre (Issue A/C), inclusive
   * quando `ends_at` atravessa a meia-noite.
   */
  const minuteFromRef = React.useCallback(
    (isoUtc: string, refLocalDate: string): number => {
      const { localDate, minute } = cellKeyOfInstant(isoUtc)
      if (localDate === refLocalDate) return minute
      const [ry, rm, rd] = refLocalDate.split("-").map(Number)
      const [ly, lm, ld] = localDate.split("-").map(Number)
      const refMidnight = Date.UTC(ry, rm - 1, rd)
      const locMidnight = Date.UTC(ly, lm - 1, ld)
      const dayDelta = Math.round((locMidnight - refMidnight) / 86_400_000)
      return minute + dayDelta * (24 * 60)
    },
    [cellKeyOfInstant],
  )

  /** Rótulos PT-BR de data/horário de um instante (para dialog/detalhe/pedidos). */
  const labelsOfInstant = React.useCallback(
    (isoUtc: string) => ({
      dateLabel: format(new Date(isoUtc), "dd/MM", { ...context, locale: ptBR }),
      dateLongLabel: format(new Date(isoUtc), "EEEE, dd 'de' MMMM", {
        ...context,
        locale: ptBR,
      }),
      timeLabel: format(new Date(isoUtc), "HH:mm", context),
    }),
    [context],
  )

  /**
   * Mapa "localDate:minute" → consulta exibida (ativo vence histórico, D-07).
   *
   * Cada consulta cobre TODAS as células de 30 min do seu intervalo
   * `[starts_at, ends_at)` (Issue A/C): o início é ancorado à grade descendo ao
   * múltiplo de STEP mais próximo (durações não-alinhadas ainda "acertam" a
   * célula visível), e o fim (exclusivo) é arredondado para cima ao próximo STEP.
   * `isStart` marca a PRIMEIRA célula coberta — só nela o grid pinta o
   * ícone/nome (o resto é continuação do mesmo bloco). O clique em QUALQUER
   * célula coberta resolve a mesma consulta e abre o detalhe.
   */
  const appointmentByCell = React.useMemo(() => {
    const map = new Map<string, CellAppointment>()
    for (const appt of appointments) {
      const { localDate, minute: rawStart } = cellKeyOfInstant(appt.starts_at)
      const labels = labelsOfInstant(appt.starts_at)
      // Ancorar às linhas de 30 min: início desce, fim (exclusivo) sobe.
      const startMinute = Math.floor(rawStart / STEP) * STEP
      const rawEnd = minuteFromRef(appt.ends_at, localDate)
      const endMinute = Math.max(
        startMinute + STEP,
        Math.ceil(rawEnd / STEP) * STEP,
      )
      for (let m = startMinute; m < endMinute; m += STEP) {
        const key = `${localDate}:${m}`
        const candidate: CellAppointment = {
          id: appt.id,
          status: appt.status,
          patientName: appt.patient_name,
          responsible: appt.patient_responsible,
          dateLabel: labels.dateLabel,
          timeLabel: labels.timeLabel,
          isStart: m === startMinute,
        }
        const existing = map.get(key)
        if (
          !existing ||
          STATUS_PRECEDENCE[candidate.status] >
            STATUS_PRECEDENCE[existing.status]
        ) {
          map.set(key, candidate)
        }
      }
    }
    return map
  }, [appointments, cellKeyOfInstant, labelsOfInstant, minuteFromRef])

  const appointmentOf = React.useCallback(
    (localDate: string, minute: number): CellAppointment | null =>
      appointmentByCell.get(`${localDate}:${minute}`) ?? null,
    [appointmentByCell],
  )

  /**
   * Instante "agora" (epoch ms) — referência única para a regra de futuro (07-03).
   * `Date.now()` é absoluto (epoch), independente do fuso do host: comparamos
   * contra o epoch do INÍCIO do slot (também absoluto, ancorado via TZDate no fuso
   * da clínica), então a comparação é imune ao bug de TZ do host (CR-01). Congela
   * na montagem — a agenda re-carrega via RSC, e um slot no limite não é caso de uso.
   */
  const nowMs = React.useMemo(() => Date.now(), [])

  /** Epoch ms do início de um slot (localDate:minute) ancorado no fuso da clínica. */
  const slotStartMs = React.useCallback(
    (localDate: string, minute: number): number => {
      const [year, month, day] = localDate.split("-").map(Number)
      const hours = Math.floor(minute / 60)
      const minutes = minute % 60
      return new TZDate(
        year,
        month - 1,
        day,
        hours,
        minutes,
        0,
        0,
        timeZone,
      ).getTime()
    },
    [timeZone],
  )

  /** `true` se o slot começa DEPOIS de agora (só o futuro é agendável, 07-03). */
  const isCellBookable = React.useCallback(
    (localDate: string, minute: number): boolean =>
      slotStartMs(localDate, minute) > nowMs,
    [nowMs, slotStartMs],
  )

  /**
   * Minuto-do-dia (wall-clock, fuso da clínica) de "agora" — para a LINHA DE AGORA
   * da grade de tempo. Congela na montagem (mesmo `nowMs`), imune ao TZ do host.
   */
  const nowMinuteOfToday = React.useMemo(() => {
    const hh = Number(format(new Date(nowMs), "HH", context))
    const mm = Number(format(new Date(nowMs), "mm", context))
    return hh * 60 + mm
  }, [nowMs, context])

  /**
   * Deriva os BLOCOS posicionados da grade de tempo para um conjunto de colunas-dia
   * (D-07: ativo vence histórico por horário; a grade só multiplica por HOUR_H).
   * Ancora o início/fim ao wall-clock da clínica na MESMA janela que a grade
   * renderiza; a precedência de exibição num horário re-marcado usa o mesmo
   * STATUS_PRECEDENCE do mapa por célula.
   */
  const positionedFor = React.useCallback(
    (days: DayColumn[]): PositionedAppointment[] => {
      const indexByDate = new Map(days.map((d, i) => [d.localDate, i]))
      // Agrupa por (coluna, horário de início) resolvendo a precedência D-07.
      const byKey = new Map<string, PositionedAppointment>()
      for (const appt of appointments) {
        const { localDate, minute: startMinute } = cellKeyOfInstant(
          appt.starts_at,
        )
        const columnIndex = indexByDate.get(localDate)
        if (columnIndex === undefined) continue
        const rawEnd = minuteFromRef(appt.ends_at, localDate)
        const endMinute = Math.max(startMinute + STEP, rawEnd)
        const labels = labelsOfInstant(appt.starts_at)
        const candidate: PositionedAppointment = {
          appointment: {
            id: appt.id,
            status: appt.status,
            patientName: appt.patient_name,
            responsible: appt.patient_responsible,
            dateLabel: labels.dateLabel,
            timeLabel: labels.timeLabel,
            isStart: true,
          },
          columnIndex,
          startMinute,
          endMinute,
          isActive: isActiveAppointmentStatus(appt.status),
        }
        const key = `${columnIndex}:${startMinute}`
        const existing = byKey.get(key)
        if (
          !existing ||
          STATUS_PRECEDENCE[candidate.appointment.status] >
            STATUS_PRECEDENCE[existing.appointment.status]
        ) {
          byKey.set(key, candidate)
        }
      }
      return [...byKey.values()]
    },
    [
      appointments,
      cellKeyOfInstant,
      minuteFromRef,
      labelsOfInstant,
    ],
  )

  // E-5: os pedidos pendentes JÁ aparecem como blocos "pendente" na grade
  // (tracejado azul + Clock) e são confirmados/recusados pelo menu de detalhe —
  // a seção "Pedidos a confirmar" foi removida (sem fila separada).

  // Drawer lateral único (C-3): abre/fecha, modo inicial (Consulta/Disponibilidade)
  // e minuto pré-selecionado (C-4) quando vem de um clique num slot livre.
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [drawerMode, setDrawerMode] = React.useState<
    "consulta" | "disponibilidade" | "folga"
  >("consulta")
  const [preselectedMinute, setPreselectedMinute] = React.useState<
    number | null
  >(null)
  // Detalhe/menu de transição: consulta selecionada + âncora do clique.
  const [detail, setDetail] = React.useState<{
    appointment: CellAppointment
    anchor: MenuAnchor
  } | null>(null)

  // ---------- mutações ADITIVAS do draft (puras: recebem e devolvem draft) ----------

  /** Disponibilidade RECORRENTE (template do dia da semana) para [start, end). */
  const addRecurringPeriod = React.useCallback(
    (base: Draft, localDate: string, start: number, end: number, slot: number) => {
      const weekday = weekdayOf(localDate, timeZone)
      const next = cloneDraft(base)
      for (let m = start; m < end; m += STEP) {
        const dk = dateKey(localDate, m)
        // Reabrir horário que estava em folga naquele minuto (só nesta data).
        next.subtractCells.delete(dk)
        next.rulePainted.add(ruleCellKey(weekday, m))
      }
      next.ruleDurations[`${weekday}:${start}`] = slot
      return next
    },
    [timeZone],
  )

  /**
   * Disponibilidade RECORRENTE direta num `weekday` específico (independente da
   * data escolhida) — usada quando o painel pede recorrência por dia da semana
   * (D-4). Muta os Sets `rulePainted`/`ruleDurations` na mesma forma que
   * `buildInitialDraft`.
   */
  const addRecurringWeekday = React.useCallback(
    (base: Draft, weekday: number, start: number, end: number, slot: number) => {
      const next = cloneDraft(base)
      for (let m = start; m < end; m += STEP) {
        next.rulePainted.add(ruleCellKey(weekday, m))
      }
      next.ruleDurations[`${weekday}:${start}`] = slot
      return next
    },
    [],
  )

  /** Disponibilidade extra POR DATA (aditivo, AGENDA-05) para [start, end). */
  const addDatePeriod = React.useCallback(
    (base: Draft, localDate: string, start: number, end: number) => {
      const next = cloneDraft(base)
      for (let m = start; m < end; m += STEP) {
        const dk = dateKey(localDate, m)
        next.subtractCells.delete(dk)
        next.addCells.add(dk)
      }
      return next
    },
    [],
  )

  /** Folga (subtrativo) POR DATA para [start, end). */
  const addFolgaPeriod = React.useCallback(
    (base: Draft, localDate: string, start: number, end: number) => {
      const next = cloneDraft(base)
      for (let m = start; m < end; m += STEP) {
        const dk = dateKey(localDate, m)
        next.addCells.delete(dk)
        next.subtractCells.add(dk)
      }
      return next
    },
    [],
  )

  // ---------- callbacks da grade ----------

  /**
   * Clique num slot LIVRE (C-4) → abre o DRAWER em modo Consulta com o horário
   * pré-selecionado no BookingRail. O drawer opera sobre o dia selecionado
   * global, então o clique também sincroniza `selectedRailDate` com a coluna.
   */
  const handleAppointmentCreate = React.useCallback(
    (localDate: string, minute: number) => {
      setSelectedRailDate(localDate)
      setPreselectedMinute(minute)
      setDrawerMode("consulta")
      setDrawerOpen(true)
    },
    [],
  )

  /** Clique num slot COM consulta → abre o detalhe/menu de transição. */
  const handleAppointmentSelect = React.useCallback(
    (appointment: CellAppointment, anchor: MenuAnchor) => {
      setDetail({ appointment, anchor })
    },
    [],
  )

  // ---------- salvar-na-hora (D-3) ----------

  /**
   * Recompõe o payload completo (`{ rules, overridesAdd, overridesRemove }`) a
   * partir de um draft — o mesmo contrato que `saveAvailabilityAction` reconcilia
   * atomicamente. Aceita um draft como argumento (default = state `draft`) para
   * evitar a corrida do setState assíncrono ao salvar-na-hora.
   */
  const computeDiff = React.useCallback(
    (source: Draft = draft) => {
      // Faixa de varredura das regras: 06–18 estendida pela disponibilidade do source.
      let scanStart = 6 * 60
      let scanEnd = 18 * 60
      const scanMinuteFromKey = (key: string) => {
        const minute = Number(key.slice(key.lastIndexOf(":") + 1))
        scanStart = Math.min(scanStart, minute)
        scanEnd = Math.max(scanEnd, minute + STEP)
      }
      source.rulePainted.forEach(scanMinuteFromKey)
      source.addCells.forEach(scanMinuteFromKey)
      scanStart = Math.max(0, scanStart)
      scanEnd = Math.min(DAY_END, scanEnd)
      const scanRows: number[] = []
      for (let m = scanStart; m < scanEnd; m += STEP) scanRows.push(m)

      const rulesPayload: {
        weekday: number
        start_minute: number
        end_minute: number
        slot_minutes: number
      }[] = []
      for (let weekday = 0; weekday <= 6; weekday++) {
        const bands = bandsFromMinutes(
          (minute) => source.rulePainted.has(ruleCellKey(weekday, minute)),
          scanRows,
        )
        for (const band of bands) {
          const slot =
            source.ruleDurations[`${weekday}:${band.start}`] ?? slotMinutes
          rulesPayload.push({
            weekday,
            start_minute: band.start,
            end_minute: band.end,
            slot_minutes: slot,
          })
        }
      }

      const overridesAdd: {
        override_type: "add" | "subtract"
        exception_date: string
        start_minute: number | null
        end_minute: number | null
        slot_minutes: number | null
      }[] = []

      const groupByDate = (cells: Set<string>, type: "add" | "subtract") => {
        const byDate = new Map<string, Set<number>>()
        for (const key of cells) {
          const idx = key.lastIndexOf(":")
          const date = key.slice(0, idx)
          const minute = Number(key.slice(idx + 1))
          const bucket = byDate.get(date) ?? new Set<number>()
          bucket.add(minute)
          byDate.set(date, bucket)
        }
        for (const [date, minutes] of byDate) {
          const sorted = [...minutes].sort((a, b) => a - b)
          const groupRows: number[] = []
          for (let m = sorted[0]; m <= sorted[sorted.length - 1]; m += STEP) {
            groupRows.push(m)
          }
          const bands = bandsFromMinutes((minute) => minutes.has(minute), groupRows)
          for (const band of bands) {
            overridesAdd.push({
              override_type: type,
              exception_date: date,
              start_minute: band.start,
              end_minute: band.end,
              slot_minutes: type === "add" ? slotMinutes : null,
            })
          }
        }
      }
      groupByDate(source.subtractCells, "subtract")
      groupByDate(source.addCells, "add")

      const overridesRemove = overrides.map((ov) => ({ id: ov.id }))

      return { rules: rulesPayload, overridesAdd, overridesRemove }
    },
    [draft, overrides, slotMinutes],
  )

  /** Salva o draft `next` na hora e reflete no estado; devolve o resultado. */
  const persistDraft = React.useCallback(
    async (next: Draft) => {
      const diff = computeDiff(next)
      setDraft(next)
      setSavingAvailability(true)
      const result = await saveAvailabilityAction(diff)
      setSavingAvailability(false)
      return result
    },
    [computeDiff],
  )

  /**
   * Aplica a intenção declarativa do painel (D-4..D-6), reusando as mutações
   * puras do draft, e SALVA NA HORA (D-3). Em sucesso: toast com "Desfazer" que
   * reverte para o snapshot anterior (re-salvando). Em erro: rollback do estado
   * em memória + toast amigável.
   */
  const applyAvailabilityIntent = React.useCallback(
    async (intent: AvailabilityIntent) => {
      const before = cloneDraft(draft)
      let next = cloneDraft(draft)

      const start = intent.startMinute
      const end = intent.endMinute
      const hasRange = start !== null && end !== null

      if (intent.type === "available") {
        if (intent.scope === "recurring") {
          if (!hasRange) return
          for (const weekday of intent.weekdays) {
            next = addRecurringWeekday(next, weekday, start!, end!, intent.slotMinutes)
          }
        } else {
          // period OU whole-day (D-5: whole-day usa a janela prefillada → add).
          if (!hasRange) return
          next = addDatePeriod(next, intent.date, start!, end!)
        }
      } else {
        // Folga (subtract).
        if (intent.scope === "recurring") {
          // Expande em folgas por data no horizonte de ~6 meses (D-2).
          const [y, m, d] = todayLocal.split("-").map(Number)
          const horizonStart = new TZDate(y, m - 1, d, timeZone)
          const horizonEnd = addMonths(
            horizonStart,
            FOLGA_RECURRING_HORIZON_MONTHS,
            context,
          )
          const weekdaySet = new Set(intent.weekdays)
          let cursor = horizonStart
          while (cursor.getTime() <= horizonEnd.getTime()) {
            const localDate = format(cursor, "yyyy-MM-dd", context)
            if (weekdaySet.has(weekdayOf(localDate, timeZone))) {
              if (hasRange) {
                next = addFolgaPeriod(next, localDate, start!, end!)
              } else {
                next = addFolgaPeriod(next, localDate, 0, DAY_END)
              }
            }
            cursor = addDays(cursor, 1, context)
          }
        } else if (intent.scope === "whole-day") {
          // Folga dia inteiro numa data → cobre a janela do dia (0..1440).
          next = addFolgaPeriod(next, intent.date, 0, DAY_END)
        } else {
          // Folga por período numa data.
          if (!hasRange) return
          next = addFolgaPeriod(next, intent.date, start!, end!)
        }
      }

      const result = await persistDraft(next)
      if (result.ok) {
        // E-2: sucesso (disponibilidade OU folga) → fecha o drawer; o toast com
        // "Desfazer" permanece. Em erro (else) o drawer NÃO fecha.
        setDrawerOpen(false)
        toast.success("Disponibilidade salva.", {
          action: {
            label: "Desfazer",
            onClick: async () => {
              const undoResult = await persistDraft(before)
              if (undoResult.ok) {
                toast.success("Mudança desfeita.")
              } else {
                setDraft(next)
                toast.error(undoResult.error)
              }
            },
          },
        })
      } else {
        setDraft(before)
        toast.error(result.error)
      }
    },
    [
      draft,
      todayLocal,
      timeZone,
      context,
      addRecurringWeekday,
      addDatePeriod,
      addFolgaPeriod,
      persistDraft,
    ],
  )

  // ---------- re-expansão client-side para o resumo do Mês (D-18) ----------
  const monthByDay: ByDay = React.useMemo(() => {
    const monthStart = startOfMonth(monthCursor, context)
    const gridStart = startOfWeek(monthStart, { ...context, weekStartsOn: 1 })
    const from = gridStart
    const to = addDays(gridStart, 42, context)

    const bands = [] as {
      weekday: number
      startMinute: number
      endMinute: number
      slotMinutes: number
    }[]
    for (let weekday = 0; weekday <= 6; weekday++) {
      const dayBands = bandsFromMinutes(
        (minute) => draft.rulePainted.has(ruleCellKey(weekday, minute)),
        minuteRows,
      )
      for (const band of dayBands) {
        bands.push({
          weekday,
          startMinute: band.start,
          endMinute: band.end,
          slotMinutes:
            draft.ruleDurations[`${weekday}:${band.start}`] ?? slotMinutes,
        })
      }
    }

    const diff = computeDiff(draft)
    const overridesForExpand = diff.overridesAdd.map((ov) => ({
      date: ov.exception_date,
      type: ov.override_type,
      startMinute: ov.start_minute,
      endMinute: ov.end_minute,
      slotMinutes: ov.slot_minutes,
    }))

    const { byDay } = expandAvailability({
      rules: bands,
      overrides: overridesForExpand,
      window: { from, to },
      timeZone,
    })
    return byDay
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, monthCursor, context, minuteRows, slotMinutes, timeZone])

  // ---------- colunas dia/semana ----------
  const dayColumns = React.useCallback(
    (days: Date[]): DayColumn[] =>
      days.map((day) => {
        const localDate = localDateOf(day)
        return {
          localDate,
          weekdayLabel: DAY_LABELS_MON_FIRST[(day.getDay() + 6) % 7],
          dayNumber: format(day, "dd", context),
          isToday: localDate === todayLocal,
        }
      }),
    [localDateOf, context, todayLocal],
  )

  const weekDays = React.useMemo(() => {
    const weekStart = startOfWeek(dayCursor, { ...context, weekStartsOn: 1 })
    return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i, context))
  }, [dayCursor, context])

  /**
   * Horários LIVRES do dia selecionado no painel: minutos DISPONÍVEIS
   * (`cellStateOf === "available"`), no FUTURO (`isCellBookable`) e SEM consulta
   * ATIVA (pendente/confirmada) ocupando a célula (D-07). Os instantes ISO UTC são
   * ancorados no fuso da clínica via `slotStartMs` → `new Date(ms).toISOString()`,
   * espelhando como o servidor expande o FreeSlot. Alimenta o `AgendaSidePanel`.
   */
  const railFreeSlots = React.useMemo<FreeSlot[]>(() => {
    const slots: FreeSlot[] = []
    for (const minute of minuteRows) {
      if (cellStateOf(selectedRailDate, minute) !== "available") continue
      if (!isCellBookable(selectedRailDate, minute)) continue
      const appt = appointmentByCell.get(`${selectedRailDate}:${minute}`)
      if (appt && isActiveAppointmentStatus(appt.status)) continue
      slots.push({
        minute,
        label: minutesToLabel(minute),
        startsAt: new Date(slotStartMs(selectedRailDate, minute)).toISOString(),
      })
    }
    return slots
  }, [
    minuteRows,
    selectedRailDate,
    cellStateOf,
    isCellBookable,
    appointmentByCell,
    slotStartMs,
  ])

  /** Rótulo longo PT-BR do dia selecionado no painel (ex.: "quinta-feira, 23 de julho"). */
  const selectedRailDayLongLabel = React.useMemo(() => {
    const [y, m, d] = selectedRailDate.split("-").map(Number)
    return format(new TZDate(y, m - 1, d, timeZone), "EEEE, dd 'de' MMMM", {
      locale: ptBR,
    })
  }, [selectedRailDate, timeZone])

  /**
   * `Date` ancorada no fuso da clínica a partir de `selectedRailDate` (M-1): a
   * visão Dia renderiza ESTA coluna, mantendo-a coerente com o dia global do
   * painel. Ancoramos a meia-noite direto no zone via TZDate a partir dos
   * componentes (mesmo padrão de `selectedRailDayLongLabel`), imune ao TZ do host.
   */
  const selectedRailDateObj = React.useMemo(() => {
    const [y, m, d] = selectedRailDate.split("-").map(Number)
    return new TZDate(y, m - 1, d, timeZone)
  }, [selectedRailDate, timeZone])

  // Navegação por aba (rótulo + prev/hoje/next).
  const nav = React.useMemo(() => {
    if (activeTab === "dia") {
      // A visão Dia opera sobre o DIA SELECIONADO global (M-1): prev/hoje/next
      // atualizam `selectedRailDate` (mantendo skipWeekend) para permanecer
      // coerente com o painel e o destaque.
      const stepSelected = (step: 1 | -1) => {
        const next = skipWeekend(
          addDays(selectedRailDateObj, step, context),
          step,
          context,
        )
        setSelectedRailDate(format(next, "yyyy-MM-dd", context))
      }
      return {
        label: format(selectedRailDateObj, "EEEE, dd 'de' MMMM", {
          ...context,
          locale: ptBR,
        }),
        onPrev: () => stepSelected(-1),
        onToday: () =>
          setSelectedRailDate(
            format(skipWeekend(new Date(), 1, context), "yyyy-MM-dd", context),
          ),
        onNext: () => stepSelected(1),
      }
    }
    if (activeTab === "semana") {
      return {
        label: `Semana de ${format(weekDays[0], "dd/MM", {
          ...context,
          locale: ptBR,
        })}`,
        onPrev: () => setDayCursor((d) => addDays(d, -7, context)),
        onToday: () => setDayCursor(new Date()),
        onNext: () => setDayCursor((d) => addDays(d, 7, context)),
      }
    }
    return {
      label: format(monthCursor, "MMMM 'de' yyyy", { ...context, locale: ptBR }),
      onPrev: () => setMonthCursor((d) => addMonths(d, -1, context)),
      onToday: () => setMonthCursor(new Date()),
      onNext: () => setMonthCursor((d) => addMonths(d, 1, context)),
    }
  }, [activeTab, dayCursor, selectedRailDateObj, weekDays, monthCursor, context])

  // ---------- altura MEDIDA da grade (fix scroll vertical 260724-hdr) ----------
  // PORQUÊ medir em vez de calc(100svh-16rem): a cadeia de layout acima é toda
  // flex-fill (min-h-svh/flex-1) sem altura FIXA, e o chrome real (sidebar p-8 +
  // border-t-8 + header + toolbar + dica + TabsList) varia — o calc fixo
  // subestimava e a página rolava. Medimos o topo do container montado e
  // descontamos innerHeight − top − folga inferior; só a aba ATIVA monta (Radix
  // desmonta as inativas), então o mesmo callback ref só registra a montada.
  const BOTTOM = 32 // ≈ p-8 inferior do layout + pequena folga
  const MIN_GRID_HEIGHT = 320 // piso pra telas curtas
  const gridContainerRef = React.useRef<HTMLDivElement | null>(null)
  const [gridHeight, setGridHeight] = React.useState<number | null>(null)

  const measure = React.useCallback(() => {
    const el = gridContainerRef.current
    if (!el) return
    const top = el.getBoundingClientRect().top
    const next = Math.max(MIN_GRID_HEIGHT, window.innerHeight - top - BOTTOM)
    setGridHeight(next)
  }, [])

  React.useEffect(() => {
    // Mede após o primeiro paint (rAF) e sempre que a aba/semana/cursor mudar
    // (deps abaixo) — o topo do container pode deslocar ao trocar de conteúdo.
    const raf = requestAnimationFrame(measure)
    window.addEventListener("resize", measure)
    // ResizeObserver no documentElement para robustez (mudanças de layout que
    // não disparam resize da janela — ex.: quebra da toolbar em telas estreitas).
    const observer = new ResizeObserver(measure)
    observer.observe(document.documentElement)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", measure)
      observer.disconnect()
    }
  }, [measure, activeTab, dayCursor, selectedRailDate, monthCursor])

  // Fallback pré-medida (primeiro paint/SSR) sobrescrito pelo inline height.
  const gridContainerClassName =
    "flex h-[calc(100svh-16rem)] min-h-0 flex-col"
  const gridContainerStyle = { height: gridHeight ?? undefined }

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="flex flex-col gap-4"
    >
      {/* Barra fina: abas menores à esquerda + navegação (rework 260723-kej: sem
          toolbar de salvar — a edição de disponibilidade salva na hora no painel). */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <TabsList className="h-8 p-0.5">
          {[
            { value: "dia", label: "Dia" },
            { value: "semana", label: "Semana" },
            { value: "mes", label: "Mês" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="h-7 px-2.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Navegação Anterior · Hoje · Próximo + rótulo do período. */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={nav.onPrev}
            aria-label="Anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={nav.onToday}
          >
            Hoje
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={nav.onNext}
            aria-label="Próximo"
          >
            <ChevronRight className="size-4" />
          </Button>
          <span className="ml-1 text-sm font-medium capitalize text-muted-foreground">
            {nav.label}
          </span>
        </div>

        {/* Trigger ÚNICO do drawer (E-4): abre em Consulta; o toggle de 3 opções
            (Consulta | Disponibilidade | Folga) vive dentro do drawer. */}
        <div className="flex items-center gap-2 lg:ml-auto">
          <Button
            type="button"
            size="sm"
            className="h-7"
            onClick={() => {
              setPreselectedMinute(null)
              setDrawerMode("consulta")
              setDrawerOpen(true)
            }}
          >
            + Nova marcação
          </Button>
        </div>
      </div>

      {/* Dica de interação: a grade só agenda; disponibilidade/folga vão no painel. */}
      <p className="text-xs text-muted-foreground">
        Clique num horário livre (azul) para{" "}
        <span className="font-medium text-foreground">agendar uma consulta</span>.
        Para editar{" "}
        <span className="font-medium text-foreground">
          disponibilidade e folga
        </span>
        , use o painel ao lado.
      </p>

      {/* ---------- DIA ---------- */}
      {/* C-1/C-3: grade full-width que preenche a altura da viewport (sem scroll
          vertical); o painel lateral virou drawer (fora dos TabsContent). A
          altura é ancorada aqui via h-[calc(100svh-16rem)] — o chrome subtraído
          (header + toolbar + dica) é o valor a confirmar no checkpoint visual.
          E-5: sem fila separada de pedidos abaixo da grade. */}
      <TabsContent value="dia" className="flex flex-col gap-4">
        <div
          ref={gridContainerRef}
          className={gridContainerClassName}
          style={gridContainerStyle}
        >
          <div className="min-h-0 min-w-0 flex-1">
            <CalendarTimeGrid
              days={dayColumns([selectedRailDateObj])}
              minuteRows={minuteRows}
              positioned={positionedFor(dayColumns([selectedRailDateObj]))}
              cellStateOf={cellStateOf}
              appointmentOf={appointmentOf}
              isCellBookable={isCellBookable}
              nowMinuteOfToday={nowMinuteOfToday}
              todayLocalDate={todayLocal}
              selectedLocalDate={selectedRailDate}
              onSelectDay={setSelectedRailDate}
              onAppointmentCreate={handleAppointmentCreate}
              onAppointmentSelect={handleAppointmentSelect}
            />
          </div>
        </div>
      </TabsContent>

      {/* ---------- SEMANA ---------- */}
      <TabsContent value="semana" className="flex flex-col gap-4">
        <div
          ref={gridContainerRef}
          className={gridContainerClassName}
          style={gridContainerStyle}
        >
          <div className="min-h-0 min-w-0 flex-1">
            <CalendarTimeGrid
              days={dayColumns(weekDays)}
              minuteRows={minuteRows}
              positioned={positionedFor(dayColumns(weekDays))}
              cellStateOf={cellStateOf}
              appointmentOf={appointmentOf}
              isCellBookable={isCellBookable}
              nowMinuteOfToday={nowMinuteOfToday}
              todayLocalDate={todayLocal}
              selectedLocalDate={selectedRailDate}
              onSelectDay={setSelectedRailDate}
              onAppointmentCreate={handleAppointmentCreate}
              onAppointmentSelect={handleAppointmentSelect}
            />
          </div>
        </div>
      </TabsContent>

      {/* ---------- MÊS (indicador, D-18) ---------- */}
      {/* C-1: o Mês também preenche a altura da viewport, sem scroll vertical. */}
      <TabsContent value="mes" className="flex flex-col gap-4">
        <div
          ref={gridContainerRef}
          className={gridContainerClassName}
          style={gridContainerStyle}
        >
          <CalendarMonthIndicator
            monthCursor={monthCursor}
            byDay={monthByDay}
            timeZone={timeZone}
            todayLocal={todayLocal}
            selectedLocalDate={selectedRailDate}
            onSelectDay={(day) => {
              // M-1: o dia clicado no Mês vira o dia global; a visão Dia mostra-o.
              const picked = skipWeekend(day, 1, context)
              setSelectedRailDate(format(picked, "yyyy-MM-dd", context))
              setActiveTab("dia")
            }}
          />
        </div>
      </TabsContent>

      {/* Drawer lateral único (C-3/E-4): hospeda o AgendaSidePanel com o toggle
          de 3 opções (Consulta | Disponibilidade | Folga). Aberto pelo botão
          único da toolbar ou por um clique num slot livre (C-4, modo Consulta
          com horário pré-marcado). */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle>Agenda do dia</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <AgendaSidePanel
              patients={patients}
              selectedDate={selectedRailDate}
              selectedDayLongLabel={selectedRailDayLongLabel}
              selectedWeekday={weekdayOf(selectedRailDate, timeZone)}
              freeSlots={railFreeSlots}
              initialMode={drawerMode}
              preselectedMinute={preselectedMinute}
              onApply={applyAvailabilityIntent}
              onCreated={() => setDrawerOpen(false)}
              savingAvailability={savingAvailability}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Detalhe + menu de transição de status (clique numa consulta). */}
      <AppointmentDetailMenu
        appointment={detail?.appointment ?? null}
        anchor={detail?.anchor ?? null}
        onOpenChange={(open) => {
          if (!open) setDetail(null)
        }}
      />
    </Tabs>
  )
}

export { minutesToLabel }
