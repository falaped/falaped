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
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { saveAvailabilityAction } from "@/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { expandAvailability } from "@/lib/expand-availability"
import {
  AvailabilityCellMenu,
  DEFAULT_SLOT,
  type AvailabilityScope,
  type MenuTarget,
  type PeriodDraft,
} from "./availability-cell-menu"
import {
  CalendarDayWeekGrid,
  DAY_END,
  STEP,
  minutesToLabel,
  type CellState,
  type DayColumn,
  type MenuAnchor,
} from "./calendar-day-week-grid"
import { CalendarMonthIndicator } from "./calendar-month-indicator"

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

const DAY_LABELS_MON_FIRST = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

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

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const value of a) if (!b.has(value)) return false
  return true
}

function draftsEqual(a: Draft, b: Draft): boolean {
  if (!setsEqual(a.rulePainted, b.rulePainted)) return false
  if (!setsEqual(a.subtractCells, b.subtractCells)) return false
  if (!setsEqual(a.addCells, b.addCells)) return false
  const aKeys = Object.keys(a.ruleDurations)
  const bKeys = Object.keys(b.ruleDurations)
  if (aKeys.length !== bKeys.length) return false
  for (const key of aKeys) if (a.ruleDurations[key] !== b.ruleDurations[key]) return false
  return true
}

function weekdayOf(localDate: string, timeZone: string): number {
  return new TZDate(new Date(`${localDate}T00:00:00`), timeZone).getDay()
}

/**
 * Calendário único editável (D-14..D-18) — rework v2 da interação.
 *
 * LAYOUT (rework): abas Dia/Semana/Mês MENORES e à ESQUERDA no topo, alinhadas
 * a uma barra fina que também traz a navegação (Anterior/Hoje/Próximo + rótulo
 * do período) e o botão Salvar com o indicador "não salvo". O painel de ações
 * lateral da v2-anterior foi REMOVIDO; o toggle Disponibilidade|Folga sumiu — o
 * BOTÃO do mouse agora escolhe o modo.
 *
 * INTERAÇÃO (rework):
 * - Clique ESQUERDO numa célula → menu "Disponibilidade" (Dia inteiro | Período;
 *   escopo Recorrente/padrão vs. Só nesta data/AGENDA-05).
 * - ARRASTE com o botão esquerdo → cria disponibilidade para o período contíguo
 *   (escopo default = recorrente, template do dia da semana).
 * - Clique DIREITO numa célula → menu "Folga" (Dia inteiro | Período), por data.
 * - Toda ação é ADITIVA: nunca limpa faixas existentes → multi-band por dia.
 *
 * RE-EXPANSÃO CLIENT-SIDE, BATCH SAVE, GUARDA DE DESCARTE, PRECEDÊNCIA HÍBRIDA
 * (folga vence) e JANELA 06–18 (folgas não alargam) — preservados da v2.
 */
export function CalendarEditor({
  rules,
  overrides,
  timeZone,
}: {
  rules: RuleRow[]
  overrides: OverrideRow[]
  timeZone: string
}) {
  const context = React.useMemo(() => ({ in: tz(timeZone) }), [timeZone])

  const initialDraftRef = React.useRef<Draft>(buildInitialDraft(rules, overrides))
  const removedOverrideIds = React.useRef<Set<string>>(new Set())
  const [draft, setDraft] = React.useState<Draft>(() =>
    cloneDraft(initialDraftRef.current),
  )
  const [savedDraft, setSavedDraft] = React.useState<Draft>(() =>
    cloneDraft(initialDraftRef.current),
  )

  // Duração default aplicada a faixas recorrentes criadas por arraste.
  const [slotMinutes] = React.useState<number>(DEFAULT_SLOT)
  // Dia inicial = dia útil mais próximo (a grade Dia oculta Sáb/Dom).
  const [dayCursor, setDayCursor] = React.useState<Date>(() =>
    skipWeekend(new Date(), 1, { in: tz(timeZone) }),
  )
  const [monthCursor, setMonthCursor] = React.useState<Date>(() => new Date())
  const [activeTab, setActiveTab] = React.useState<string>("semana")
  const [saving, setSaving] = React.useState(false)

  // Escopo default da disponibilidade: template recorrente (D-19).
  const [scope, setScope] = React.useState<AvailabilityScope>("recurring")

  // Menu de contexto aberto (kind = disponibilidade|folga) + alvo.
  const [menu, setMenu] = React.useState<{
    kind: "available" | "off"
    target: MenuTarget
  } | null>(null)

  // Guarda de descarte: intenção pendente aguardando confirmação.
  const [pendingAction, setPendingAction] = React.useState<null | (() => void)>(
    null,
  )

  const isDirty = React.useMemo(
    () => !draftsEqual(draft, savedDraft),
    [draft, savedDraft],
  )

  // beforeunload (D-17): cobre refresh/fechar aba com mudanças não salvas.
  React.useEffect(() => {
    if (!isDirty) return
    function handler(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDirty])

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

  // ---------- mutações ADITIVAS do draft ----------

  /** Disponibilidade RECORRENTE (template do dia da semana) para [start, end). */
  const addRecurringPeriod = React.useCallback(
    (localDate: string, start: number, end: number, slot: number) => {
      const weekday = weekdayOf(localDate, timeZone)
      setDraft((prev) => {
        const next = cloneDraft(prev)
        for (let m = start; m < end; m += STEP) {
          const dk = dateKey(localDate, m)
          // Reabrir horário que estava em folga naquele minuto (só nesta data).
          next.subtractCells.delete(dk)
          next.rulePainted.add(ruleCellKey(weekday, m))
        }
        next.ruleDurations[`${weekday}:${start}`] = slot
        return next
      })
    },
    [timeZone],
  )

  /** Disponibilidade extra POR DATA (aditivo, AGENDA-05) para [start, end). */
  const addDatePeriod = React.useCallback(
    (localDate: string, start: number, end: number) => {
      setDraft((prev) => {
        const next = cloneDraft(prev)
        for (let m = start; m < end; m += STEP) {
          const dk = dateKey(localDate, m)
          next.subtractCells.delete(dk)
          next.addCells.add(dk)
        }
        return next
      })
    },
    [],
  )

  /** Folga (subtrativo) POR DATA para [start, end). */
  const addFolgaPeriod = React.useCallback(
    (localDate: string, start: number, end: number) => {
      setDraft((prev) => {
        const next = cloneDraft(prev)
        for (let m = start; m < end; m += STEP) {
          const dk = dateKey(localDate, m)
          next.addCells.delete(dk)
          next.subtractCells.add(dk)
        }
        return next
      })
    },
    [],
  )

  /** Faixa de disponibilidade (respeita o escopo atual). */
  const addAvailabilityPeriod = React.useCallback(
    (
      localDate: string,
      start: number,
      end: number,
      slot: number,
      periodScope: AvailabilityScope,
    ) => {
      if (periodScope === "date") addDatePeriod(localDate, start, end)
      else addRecurringPeriod(localDate, start, end, slot)
    },
    [addDatePeriod, addRecurringPeriod],
  )

  // ---------- callbacks da grade ----------

  /** Arraste esquerdo concluído → disponibilidade no período (escopo atual). */
  const handleDragSelect = React.useCallback(
    (localDate: string, start: number, end: number) => {
      addAvailabilityPeriod(localDate, start, end, slotMinutes, scope)
    },
    [addAvailabilityPeriod, scope, slotMinutes],
  )

  /** Clique numa célula → abre o menu (esquerdo=disponibilidade, direito=folga). */
  const handleCellMenu = React.useCallback(
    (
      localDate: string,
      minute: number,
      button: "left" | "right",
      anchor: MenuAnchor,
    ) => {
      const weekdayLabel = format(
        new TZDate(new Date(`${localDate}T00:00:00`), timeZone),
        "EEEE",
        { locale: ptBR },
      )
      const target: MenuTarget = { localDate, minute, weekdayLabel, anchor }
      setMenu({ kind: button === "left" ? "available" : "off", target })
    },
    [timeZone],
  )

  // ---------- ações do menu ----------

  /** Janela de dia inteiro = faixa visível corrente (06–18 ou o que estiver aberto). */
  const dayWindow = React.useMemo(() => {
    if (minuteRows.length === 0) return { start: 6 * 60, end: 18 * 60 }
    return {
      start: minuteRows[0],
      end: minuteRows[minuteRows.length - 1] + STEP,
    }
  }, [minuteRows])

  const handleMenuWholeDay = React.useCallback(() => {
    if (!menu) return
    const { localDate } = menu.target
    if (menu.kind === "off") {
      addFolgaPeriod(localDate, dayWindow.start, dayWindow.end)
    } else {
      addAvailabilityPeriod(
        localDate,
        dayWindow.start,
        dayWindow.end,
        slotMinutes,
        scope,
      )
    }
  }, [menu, dayWindow, addFolgaPeriod, addAvailabilityPeriod, scope, slotMinutes])

  const handleMenuPeriod = React.useCallback(
    (period: PeriodDraft) => {
      if (!menu) return
      const { localDate } = menu.target
      if (menu.kind === "off") {
        addFolgaPeriod(localDate, period.startMinute, period.endMinute)
      } else {
        addAvailabilityPeriod(
          localDate,
          period.startMinute,
          period.endMinute,
          period.slotMinutes,
          scope,
        )
      }
    },
    [menu, addFolgaPeriod, addAvailabilityPeriod, scope],
  )

  // ---------- navegação com guarda de descarte ----------
  function runGuarded(action: () => void) {
    if (isDirty) {
      setPendingAction(() => action)
      return
    }
    action()
  }

  function confirmDiscard() {
    setDraft(cloneDraft(savedDraft))
    const action = pendingAction
    setPendingAction(null)
    if (action) action()
  }

  function handleTabChange(next: string) {
    runGuarded(() => setActiveTab(next))
  }

  // ---------- batch save (D-17) ----------
  function computeDiff() {
    const rulesPayload: {
      weekday: number
      start_minute: number
      end_minute: number
      slot_minutes: number
    }[] = []
    for (let weekday = 0; weekday <= 6; weekday++) {
      const bands = bandsFromMinutes(
        (minute) => draft.rulePainted.has(ruleCellKey(weekday, minute)),
        minuteRows,
      )
      for (const band of bands) {
        const slot = draft.ruleDurations[`${weekday}:${band.start}`] ?? slotMinutes
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
        const scanRows: number[] = []
        for (let m = sorted[0]; m <= sorted[sorted.length - 1]; m += STEP) {
          scanRows.push(m)
        }
        const bands = bandsFromMinutes((minute) => minutes.has(minute), scanRows)
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
    groupByDate(draft.subtractCells, "subtract")
    groupByDate(draft.addCells, "add")

    const overridesRemove = overrides.map((ov) => ({ id: ov.id }))

    return { rules: rulesPayload, overridesAdd, overridesRemove }
  }

  async function handleSave() {
    const diff = computeDiff()
    setSaving(true)
    const result = await saveAvailabilityAction(diff)
    setSaving(false)
    if (result.ok) {
      toast.success("Disponibilidade salva.")
      const snapshot = cloneDraft(draft)
      setSavedDraft(snapshot)
      removedOverrideIds.current.clear()
    } else {
      toast.error(result.error)
    }
  }

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

    const diff = computeDiff()
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

  // Navegação por aba (rótulo + prev/hoje/next).
  const nav = React.useMemo(() => {
    if (activeTab === "dia") {
      return {
        label: format(dayCursor, "EEEE, dd 'de' MMMM", {
          ...context,
          locale: ptBR,
        }),
        onPrev: () =>
          setDayCursor((d) => skipWeekend(addDays(d, -1, context), -1, context)),
        onToday: () => setDayCursor(skipWeekend(new Date(), 1, context)),
        onNext: () =>
          setDayCursor((d) => skipWeekend(addDays(d, 1, context), 1, context)),
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
  }, [activeTab, dayCursor, weekDays, monthCursor, context])

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="flex flex-col gap-4"
    >
      {/* Barra fina: abas menores à esquerda + navegação + salvar (rework). */}
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

        {/* Salvar + indicador de mudanças não salvas (rework: no toolbar). */}
        <div className="ml-auto flex items-center gap-2">
          {isDirty ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-500">
              <span className="size-2 rounded-full bg-amber-500" />
              Mudanças não salvas
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Tudo salvo.</span>
          )}
          <Button
            size="sm"
            className="h-7"
            onClick={handleSave}
            disabled={saving || !isDirty}
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </div>
      </div>

      {/* Dica de interação (substitui o antigo painel de instruções). */}
      <p className="text-xs text-muted-foreground">
        Clique numa célula para{" "}
        <span className="font-medium text-foreground">disponibilidade</span> ou
        arraste para marcar um período; botão direito para{" "}
        <span className="font-medium text-foreground">folga</span>. Verde =
        disponível.
      </p>

      {/* ---------- DIA ---------- */}
      <TabsContent value="dia" className="flex flex-col gap-4">
        <CalendarDayWeekGrid
          days={dayColumns([dayCursor])}
          minuteRows={minuteRows}
          cellStateOf={cellStateOf}
          onDragSelect={handleDragSelect}
          onCellMenu={handleCellMenu}
        />
      </TabsContent>

      {/* ---------- SEMANA ---------- */}
      <TabsContent value="semana" className="flex flex-col gap-4">
        <CalendarDayWeekGrid
          days={dayColumns(weekDays)}
          minuteRows={minuteRows}
          cellStateOf={cellStateOf}
          onDragSelect={handleDragSelect}
          onCellMenu={handleCellMenu}
        />
      </TabsContent>

      {/* ---------- MÊS (indicador, D-18) ---------- */}
      <TabsContent value="mes" className="flex flex-col gap-4">
        <CalendarMonthIndicator
          monthCursor={monthCursor}
          byDay={monthByDay}
          timeZone={timeZone}
          todayLocal={todayLocal}
          onSelectDay={(day) => {
            runGuarded(() => {
              setDayCursor(skipWeekend(day, 1, context))
              setActiveTab("dia")
            })
          }}
        />
      </TabsContent>

      {/* Menu de contexto da célula (disponibilidade|folga). */}
      <AvailabilityCellMenu
        kind={menu?.kind ?? "available"}
        target={menu?.target ?? null}
        open={menu !== null}
        onOpenChange={(open) => {
          if (!open) setMenu(null)
        }}
        scope={scope}
        onScopeChange={setScope}
        onWholeDay={handleMenuWholeDay}
        onPeriod={handleMenuPeriod}
      />

      {/* Guarda de descarte (D-17). */}
      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem mudanças não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Se continuar sem salvar, as alterações de disponibilidade serão
              descartadas. Deseja descartar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAction(null)}>
              Voltar e salvar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDiscard}>
              Descartar mudanças
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  )
}

export { minutesToLabel }
