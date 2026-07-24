"use client"

import * as React from "react"
import { CalendarCheck, CalendarX, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { STEP, minutesToLabel } from "./calendar-day-week-grid"
import { DEFAULT_SLOT, SLOT_PRESETS } from "./availability-cell-menu"

/** Tipo da marcação: disponibilidade (add/rule) ou folga (subtract). */
export type AvailabilityKind = "available" | "off"

/** Escopo da marcação: faixa numa data, dia inteiro numa data, ou recorrência. */
export type AvailabilityScopeKind = "period" | "whole-day" | "recurring"

/**
 * Intenção DECLARATIVA emitida pelo painel ao clicar "Aplicar". O painel NÃO fala
 * com o backend nem com o draft — só descreve o que o médico pediu; o editor
 * (calendar-editor) traduz em mutações do draft + save (D-3..D-6).
 */
export type AvailabilityIntent = {
  type: AvailabilityKind
  scope: AvailabilityScopeKind
  /** Data selecionada (YYYY-MM-DD) — origem para período/dia-inteiro. */
  date: string
  /** Minuto-do-dia de início da faixa (null quando folga dia-inteiro). */
  startMinute: number | null
  /** Minuto-do-dia de fim exclusivo da faixa (null quando folga dia-inteiro). */
  endMinute: number | null
  /** Duração de cada horário (só relevante para disponibilidade). */
  slotMinutes: number
  /** Dias da semana (0=dom..6=sáb) — só quando escopo = recorrência. */
  weekdays: number[]
}

/** Janela de trabalho padrão do "Dia inteiro" de disponibilidade (D-5). */
const DEFAULT_DAY_START = 8 * 60
const DEFAULT_DAY_END = 18 * 60

/** Opções de horário (passo 30 min, 00:00–24:00). */
const TIME_OPTIONS = Array.from(
  { length: (24 * 60) / STEP + 1 },
  (_, i) => i * STEP,
)

/** Rótulos dos toggles de dia da semana, começando na segunda. */
const WEEKDAY_TOGGLES: { weekday: number; label: string }[] = [
  { weekday: 1, label: "Seg" },
  { weekday: 2, label: "Ter" },
  { weekday: 3, label: "Qua" },
  { weekday: 4, label: "Qui" },
  { weekday: 5, label: "Sex" },
  { weekday: 6, label: "Sáb" },
  { weekday: 0, label: "Dom" },
]

/** Select de horário "HH:MM" no passo de 30 min (replica o TimeSelect do menu). */
function TimeSelect({
  value,
  onChange,
  min = 0,
  max = 24 * 60,
  ariaLabel,
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  ariaLabel: string
}) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger size="sm" aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {TIME_OPTIONS.filter((m) => m >= min && m <= max).map((m) => (
          <SelectItem key={m} value={String(m)}>
            {minutesToLabel(m)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Botão segmentado (aria-pressed) — token oklch, sem deps novas. */
function Segment({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-foreground/40",
      )}
    >
      {children}
    </button>
  )
}

/**
 * FORMULÁRIO DE DISPONIBILIDADE E FOLGA (D-4..D-6, 260723-kej) — o ÚNICO lugar de
 * editar disponibilidade/folga desde que a grade virou read-only (D-1). O dia NÃO
 * é escolhido aqui (M-5): vem do calendário real (grade/Mês) via `selectedDate`
 * (read-only). Reusa os selects de horário/duração do padrão de
 * `availability-cell-menu.tsx`.
 *
 * O médico escolhe Tipo (Disponibilidade | Folga), Escopo (Período | Dia inteiro |
 * Recorrência), faixa/duração e dias da semana, e clica "Aplicar" → emite uma
 * `AvailabilityIntent` declarativa (`onApply`). O painel NÃO fala com backend nem
 * com o draft; o editor traduz a intenção em mutações + save-na-hora (D-3).
 *
 * Tokens oklch apenas; copy PT-BR; sem deps novas.
 */
export function AvailabilityPanel({
  selectedDate,
  selectedDayLongLabel,
  selectedWeekday,
  initialType,
  onApply,
  saving = false,
}: {
  /** Dia selecionado (YYYY-MM-DD) — read-only; escolhido no calendário real (M-5). */
  selectedDate: string
  /** Rótulo longo PT-BR do dia (ex.: "quinta-feira, 23 de julho"). */
  selectedDayLongLabel: string
  /** Weekday (0=dom..6=sáb) do dia selecionado, no fuso da clínica (pai calcula). */
  selectedWeekday: number
  /**
   * Tipo PRÉ-SELECIONADO pelo toggle externo (E-4): "available" p/ Disponibilidade,
   * "off" p/ Folga. Semeia o estado `type` e ressincroniza entre aberturas.
   */
  initialType?: AvailabilityKind
  /** Aplica a intenção declarativa (o editor traduz em mutações + save). */
  onApply: (intent: AvailabilityIntent) => void
  /** `true` enquanto um save está em andamento. */
  saving?: boolean
}) {
  const [type, setType] = React.useState<AvailabilityKind>(
    initialType ?? "available",
  )

  // Ressincroniza o tipo quando `initialType` muda entre aberturas do drawer
  // (mesmo padrão do `initialMode` no side-panel).
  React.useEffect(() => {
    if (initialType) setType(initialType)
  }, [initialType])
  const [scope, setScope] = React.useState<AvailabilityScopeKind>("recurring")
  const [startMinute, setStartMinute] = React.useState<number>(DEFAULT_DAY_START)
  const [endMinute, setEndMinute] = React.useState<number>(DEFAULT_DAY_END)
  const [slotMinutes, setSlotMinutes] = React.useState<number>(DEFAULT_SLOT)
  const [weekdays, setWeekdays] = React.useState<Set<number>>(new Set())

  const isAvailable = type === "available"

  // Prefill 08–18 quando entra em Disponibilidade + Dia inteiro (D-5).
  const prevWholeAvailRef = React.useRef(false)
  React.useEffect(() => {
    const isWholeAvail = isAvailable && scope === "whole-day"
    if (isWholeAvail && !prevWholeAvailRef.current) {
      setStartMinute(DEFAULT_DAY_START)
      setEndMinute(DEFAULT_DAY_END)
      setSlotMinutes(DEFAULT_SLOT)
    }
    prevWholeAvailRef.current = isWholeAvail
  }, [isAvailable, scope])

  /**
   * RECORRÊNCIA pré-seleciona o weekday do dia selecionado (M-5): ao ENTRAR em
   * "recurring" (ou ao trocar o dia enquanto em "recurring"), semeia `weekdays`
   * com o weekday do dia SE o médico ainda não tiver mexido — semeamos apenas
   * quando o conjunto está VAZIO ou na transição de escopo para "recurring", para
   * não apagar seleções manuais (a multi-seleção via toggle permanece intacta).
   */
  const prevScopeRef = React.useRef<AvailabilityScopeKind>(scope)
  React.useEffect(() => {
    const enteredRecurring =
      scope === "recurring" && prevScopeRef.current !== "recurring"
    prevScopeRef.current = scope
    if (scope !== "recurring") return
    setWeekdays((prev) => {
      // Transição PARA recorrência → semeia com o weekday do dia (respeitando
      // seleções manuais preexistentes ao apenas adicionar). Se já em recorrência
      // e o médico não mexeu (conjunto vazio), semeia o novo weekday ao trocar o dia.
      if (enteredRecurring || prev.size === 0) {
        return new Set([selectedWeekday])
      }
      return prev
    })
  }, [scope, selectedWeekday])

  function toggleWeekday(weekday: number) {
    setWeekdays((prev) => {
      const next = new Set(prev)
      if (next.has(weekday)) next.delete(weekday)
      else next.add(weekday)
      return next
    })
  }

  // Quando a faixa de horário é exigida (todos os casos MENOS folga dia-inteiro).
  const rangeRequired = !(type === "off" && scope === "whole-day")
  const rangeValid = !rangeRequired || endMinute > startMinute
  const weekdaysValid = scope !== "recurring" || weekdays.size > 0
  const canApply = rangeValid && weekdaysValid && !saving

  function handleApply() {
    if (!canApply) return
    const wholeDayOff = type === "off" && scope === "whole-day"
    onApply({
      type,
      scope,
      date: selectedDate,
      startMinute: wholeDayOff ? null : startMinute,
      endMinute: wholeDayOff ? null : endMinute,
      slotMinutes,
      weekdays: [...weekdays].sort((a, b) => a - b),
    })
  }

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="flex items-center gap-1.5 text-xl font-semibold tracking-tight">
          {isAvailable ? (
            <CalendarCheck className="size-5 text-primary" />
          ) : (
            <CalendarX className="size-5 text-muted-foreground" />
          )}
          Disponibilidade e folga
        </h2>
        <p className="text-sm text-muted-foreground">
          Marque disponibilidade ou folga por período, dia inteiro ou recorrência.
        </p>
        {/* Rótulo do dia selecionado (o picker que antes mostrava o dia sumiu — M-5). */}
        <p className="text-xs font-semibold uppercase capitalize tracking-wide text-muted-foreground">
          {selectedDayLongLabel}
        </p>
      </div>

      {/* Tipo: Disponibilidade | Folga. */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tipo
        </span>
        <div className="flex gap-1.5" role="group" aria-label="Tipo de marcação">
          <Segment active={isAvailable} onClick={() => setType("available")}>
            Disponibilidade
          </Segment>
          <Segment active={!isAvailable} onClick={() => setType("off")}>
            Folga
          </Segment>
        </div>
      </div>

      {/* Escopo: Período | Dia inteiro | Recorrência. */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Escopo
        </span>
        <div className="flex gap-1.5" role="group" aria-label="Escopo da marcação">
          <Segment active={scope === "period"} onClick={() => setScope("period")}>
            Período
          </Segment>
          <Segment
            active={scope === "whole-day"}
            onClick={() => setScope("whole-day")}
          >
            Dia inteiro
          </Segment>
          <Segment
            active={scope === "recurring"}
            onClick={() => setScope("recurring")}
          >
            Recorrência
          </Segment>
        </div>
      </div>

      {/* Dias da semana (só recorrência). */}
      {scope === "recurring" ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Dias da semana
          </span>
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Dias da semana"
          >
            {WEEKDAY_TOGGLES.map(({ weekday, label }) => {
              const active = weekdays.has(weekday)
              return (
                <button
                  key={weekday}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleWeekday(weekday)}
                  className={cn(
                    "size-9 rounded-full border text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/40",
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
          {!weekdaysValid ? (
            <p className="text-xs text-muted-foreground">
              Escolha ao menos um dia da semana.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Faixa de horário (todos os casos menos folga dia-inteiro). */}
      {rangeRequired ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Início</Label>
            <TimeSelect
              value={startMinute}
              onChange={setStartMinute}
              max={24 * 60 - STEP}
              ariaLabel="Horário de início"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Fim</Label>
            <TimeSelect
              value={endMinute}
              onChange={setEndMinute}
              min={STEP}
              ariaLabel="Horário de fim"
            />
          </div>
        </div>
      ) : null}

      {/* Duração de cada horário (só disponibilidade). */}
      {isAvailable ? (
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Duração de cada horário</Label>
          <Select
            value={String(slotMinutes)}
            onValueChange={(value) => setSlotMinutes(Number(value))}
          >
            <SelectTrigger aria-label="Duração de cada horário" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SLOT_PRESETS.map((preset) => (
                <SelectItem key={preset} value={String(preset)}>
                  {preset} min
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {/* Aviso: dia inteiro de disponibilidade usa janela padrão editável (D-5). */}
      {isAvailable && scope === "whole-day" ? (
        <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          O dia inteiro usa uma janela de trabalho padrão editável (08:00–18:00).
          Ajuste o início e o fim antes de aplicar.
        </p>
      ) : null}

      {/* Aviso: folga recorrente aplica-se para os próximos ~6 meses (D-2). */}
      {type === "off" && scope === "recurring" ? (
        <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          Aplicada para os próximos ~6 meses.
        </p>
      ) : null}

      {/* Validação inline da faixa. */}
      {rangeRequired && !rangeValid ? (
        <p className="text-xs text-muted-foreground">
          O fim precisa ser depois do início.
        </p>
      ) : null}

      <Button
        type="button"
        className="h-11 w-full"
        onClick={handleApply}
        disabled={!canApply}
      >
        {saving ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Aplicando...
          </>
        ) : (
          "Aplicar"
        )}
      </Button>
    </Card>
  )
}
