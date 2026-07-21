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
  AvailabilityActionPanel,
  DEFAULT_SLOT,
} from "./availability-action-panel"
import {
  CalendarDayWeekGrid,
  DAY_END,
  STEP,
  minutesToLabel,
  type CellState,
  type DayColumn,
  type PaintMode,
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

/**
 * Calendário único editável (D-14..D-18) — a superfície v2 que substitui a
 * agenda-view + availability-grid + exception-dialog read-only da v1.
 *
 * LAYOUT (D-14): abas Dia/Semana/Mês à ESQUERDA (default Semana) + painel de
 * ações à direita. Navegação anterior/hoje/próximo, incluindo entre meses.
 *
 * RE-EXPANSÃO CLIENT-SIDE (D-14, discretion → cliente): o RSC passa as rows
 * CRUAS (rules + overrides) uma vez; ao navegar/trocar aba, `expandAvailability`
 * (fn pura/serializável do Plano 01) roda no browser para a janela da view. O
 * draft editável é a fonte de verdade da grade exibida (as células pintadas),
 * e a expansão do draft alimenta o resumo do Mês (D-18).
 *
 * PINTURA (D-16): clique alterna (baseline) / arraste pinta período contíguo
 * (enhancement) / dia-inteiro no painel. O toggle Disponibilidade|Folga (D-15)
 * define o modo. Verde = disponível; folga = neutro (nunca destructive-red).
 *
 * BATCH SAVE (D-17): o diff {rules, overridesAdd, overridesRemove} é computado
 * do draft e enviado a `saveAvailabilityAction` uma vez. Estado não-salvo
 * visível; guarda de descarte (`beforeunload` + AlertDialog na troca de aba /
 * navegação) quando há mudanças não salvas.
 *
 * NOTA de saída de rota: a proteção contra perda cobre os pontos de saída
 * conhecidos — refresh/fechar aba (`beforeunload`) e troca de aba/navegação
 * interna do editor (AlertDialog). Uma navegação client-side do Next para fora
 * de /dashboard/agenda por um link externo ao editor não dispara o AlertDialog;
 * o `beforeunload` cobre o hard-navigation/refresh.
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

  const [paintMode, setPaintMode] = React.useState<PaintMode>("available")
  const [slotMinutes, setSlotMinutes] = React.useState<number>(DEFAULT_SLOT)
  const [dayCursor, setDayCursor] = React.useState<Date>(() => new Date())
  const [monthCursor, setMonthCursor] = React.useState<Date>(() => new Date())
  const [activeTab, setActiveTab] = React.useState<string>("semana")
  const [saving, setSaving] = React.useState(false)

  // Guarda de descarte: intenção pendente (troca de aba/navegação) aguardando confirmação.
  const [pendingAction, setPendingAction] = React.useState<null | (() => void)>(
    null,
  )

  const isDirty = React.useMemo(
    () => !draftsEqual(draft, savedDraft),
    [draft, savedDraft],
  )

  // beforeunload (D-17, Pitfall 6): cobre refresh/fechar aba com mudanças não salvas.
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

  // Faixa visível: 06:00–22:00 default, estendida por qualquer célula pintada,
  // sempre alcançando ATÉ 24:00 (1440, WR-04) — nunca com cap em 23:30.
  const minuteRows = React.useMemo(() => {
    let start = 6 * 60
    let end = 22 * 60
    const scanMinuteFromKey = (key: string) => {
      const minute = Number(key.slice(key.lastIndexOf(":") + 1))
      start = Math.min(start, minute)
      end = Math.max(end, minute + STEP)
    }
    draft.rulePainted.forEach(scanMinuteFromKey)
    draft.addCells.forEach(scanMinuteFromKey)
    draft.subtractCells.forEach(scanMinuteFromKey)
    start = Math.max(0, start)
    end = Math.min(DAY_END, end)
    const rows: number[] = []
    for (let m = start; m < end; m += STEP) rows.push(m)
    return rows
  }, [draft])

  // Estado de uma célula por DATA (aplica a precedência de exibição do draft):
  // folga vence; senão aditivo/template = disponível.
  const cellStateOf = React.useCallback(
    (localDate: string, minute: number): CellState => {
      if (draft.subtractCells.has(dateKey(localDate, minute))) return "off"
      if (draft.addCells.has(dateKey(localDate, minute))) return "available"
      const zoned = new TZDate(new Date(`${localDate}T00:00:00`), timeZone)
      const weekday = zoned.getDay()
      if (draft.rulePainted.has(ruleCellKey(weekday, minute))) return "available"
      return "empty"
    },
    [draft, timeZone],
  )

  // Aplica o modo ativo a uma célula-data (clique = toggle, arraste = set).
  const paintCell = React.useCallback(
    (localDate: string, minute: number, options?: { toggle?: boolean }) => {
      const toggle = options?.toggle ?? false
      setDraft((prev) => {
        const next = cloneDraft(prev)
        const zoned = new TZDate(new Date(`${localDate}T00:00:00`), timeZone)
        const weekday = zoned.getDay()
        const dk = dateKey(localDate, minute)
        const currentState: CellState = next.subtractCells.has(dk)
          ? "off"
          : next.addCells.has(dk)
            ? "available"
            : next.rulePainted.has(ruleCellKey(weekday, minute))
              ? "available"
              : "empty"

        if (paintMode === "off") {
          // Folga: adiciona (ou alterna) uma célula subtrativa naquela data.
          if (toggle && currentState === "off") next.subtractCells.delete(dk)
          else {
            next.subtractCells.add(dk)
            next.addCells.delete(dk)
          }
          return next
        }

        // Disponibilidade: edita a GRADE RECORRENTE do weekday por padrão; se a
        // data tem folga naquele minuto, primeiro remove a folga. Se o template
        // já cobre, um clique-toggle desliga o template daquele weekday.
        if (next.subtractCells.has(dk)) {
          // Reabrir um horário que estava em folga: remove a folga da data.
          next.subtractCells.delete(dk)
          if (!toggle) next.rulePainted.add(ruleCellKey(weekday, minute))
          return next
        }

        const rk = ruleCellKey(weekday, minute)
        if (toggle && currentState === "available") {
          // Desligar disponibilidade: remove do template recorrente e de aditivo.
          next.rulePainted.delete(rk)
          next.addCells.delete(dk)
        } else {
          next.rulePainted.add(rk)
        }
        return next
      })
    },
    [paintMode, timeZone],
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
    // Descarta o draft: volta ao último estado salvo.
    setDraft(cloneDraft(savedDraft))
    const action = pendingAction
    setPendingAction(null)
    if (action) action()
  }

  function handleTabChange(next: string) {
    runGuarded(() => setActiveTab(next))
  }

  // ---------- dia inteiro (D-16) ----------
  const activeDayLabel = React.useMemo(() => {
    if (activeTab === "mes") return null
    return format(dayCursor, "dd/MM", { ...context, locale: ptBR })
  }, [activeTab, dayCursor, context])

  function fillActiveDay() {
    const localDate = localDateOf(dayCursor)
    setDraft((prev) => {
      const next = cloneDraft(prev)
      const zoned = new TZDate(new Date(`${localDate}T00:00:00`), timeZone)
      const weekday = zoned.getDay()
      for (const minute of minuteRows) {
        const dk = dateKey(localDate, minute)
        if (paintMode === "off") {
          next.subtractCells.add(dk)
          next.addCells.delete(dk)
        } else {
          next.subtractCells.delete(dk)
          next.rulePainted.add(ruleCellKey(weekday, minute))
        }
      }
      return next
    })
  }

  function clearActiveDay() {
    const localDate = localDateOf(dayCursor)
    setDraft((prev) => {
      const next = cloneDraft(prev)
      const zoned = new TZDate(new Date(`${localDate}T00:00:00`), timeZone)
      const weekday = zoned.getDay()
      for (const minute of minuteRows) {
        const dk = dateKey(localDate, minute)
        next.subtractCells.delete(dk)
        next.addCells.delete(dk)
        // Folga subtrativa para "esconder" o template recorrente naquele dia.
        if (next.rulePainted.has(ruleCellKey(weekday, minute))) {
          next.subtractCells.add(dk)
        }
      }
      return next
    })
  }

  // ---------- batch save (D-17) ----------
  function computeDiff() {
    // (1) Grade recorrente completa a partir de rulePainted + ruleDurations.
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

    // (2) Overrides adicionados: agrupa subtractCells e addCells por data em faixas.
    const overridesAdd: {
      override_type: "add" | "subtract"
      exception_date: string
      start_minute: number | null
      end_minute: number | null
      slot_minutes: number | null
    }[] = []

    const groupByDate = (
      cells: Set<string>,
      type: "add" | "subtract",
    ) => {
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

    // (3) Overrides removidos: todos os overrides originais são substituídos —
    // marcamos todos os ids originais para remoção e recriamos do draft.
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
      // Sincroniza o baseline: o draft atual vira o estado salvo.
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
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i, context))
  }, [dayCursor, context])

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Coluna esquerda: abas Dia/Semana/Mês (D-14). */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex flex-1 flex-col gap-4"
      >
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
        <TabsContent value="dia" className="flex flex-col gap-4">
          <NavBar
            label={format(dayCursor, "EEEE, dd 'de' MMMM", {
              ...context,
              locale: ptBR,
            })}
            onPrev={() => setDayCursor((d) => addDays(d, -1, context))}
            onToday={() => setDayCursor(new Date())}
            onNext={() => setDayCursor((d) => addDays(d, 1, context))}
          />
          <CalendarDayWeekGrid
            days={dayColumns([dayCursor])}
            minuteRows={minuteRows}
            cellStateOf={cellStateOf}
            paintMode={paintMode}
            onPaint={paintCell}
          />
        </TabsContent>

        {/* ---------- SEMANA ---------- */}
        <TabsContent value="semana" className="flex flex-col gap-4">
          <NavBar
            label={`Semana de ${format(weekDays[0], "dd/MM", {
              ...context,
              locale: ptBR,
            })}`}
            onPrev={() => setDayCursor((d) => addDays(d, -7, context))}
            onToday={() => setDayCursor(new Date())}
            onNext={() => setDayCursor((d) => addDays(d, 7, context))}
          />
          <CalendarDayWeekGrid
            days={dayColumns(weekDays)}
            minuteRows={minuteRows}
            cellStateOf={cellStateOf}
            paintMode={paintMode}
            onPaint={paintCell}
          />
        </TabsContent>

        {/* ---------- MÊS (indicador, D-18) ---------- */}
        <TabsContent value="mes" className="flex flex-col gap-4">
          <NavBar
            label={format(monthCursor, "MMMM 'de' yyyy", {
              ...context,
              locale: ptBR,
            })}
            onPrev={() => setMonthCursor((d) => addMonths(d, -1, context))}
            onToday={() => setMonthCursor(new Date())}
            onNext={() => setMonthCursor((d) => addMonths(d, 1, context))}
          />
          <CalendarMonthIndicator
            monthCursor={monthCursor}
            byDay={monthByDay}
            timeZone={timeZone}
            todayLocal={todayLocal}
            onSelectDay={(day) => {
              runGuarded(() => {
                setDayCursor(day)
                setActiveTab("dia")
              })
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Coluna direita: painel de ações (D-14). */}
      <AvailabilityActionPanel
        paintMode={paintMode}
        onPaintModeChange={setPaintMode}
        slotMinutes={slotMinutes}
        onSlotMinutesChange={setSlotMinutes}
        onFillActiveDay={fillActiveDay}
        onClearActiveDay={clearActiveDay}
        activeDayLabel={activeTab === "mes" ? null : activeDayLabel}
        isDirty={isDirty}
        saving={saving}
        onSave={handleSave}
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
    </div>
  )
}

/** Barra de navegação Anterior · Hoje · Próximo (D-14). */
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
        <Button
          variant="outline"
          size="icon"
          onClick={onPrev}
          aria-label="Anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onToday}>
          Hoje
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onNext}
          aria-label="Próximo"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export { minutesToLabel }
