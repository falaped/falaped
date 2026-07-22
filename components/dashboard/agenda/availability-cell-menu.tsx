"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"
import { CalendarCheck, CalendarX, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { minutesToLabel, STEP, type MenuAnchor } from "./calendar-day-week-grid"

/** Presets de duração de slot por faixa (D-09), como na v1. */
export const SLOT_PRESETS = [15, 20, 30, 60]
export const DEFAULT_SLOT = 30

/** Escopo de uma nova disponibilidade: template recorrente vs. só nesta data. */
export type AvailabilityScope = "recurring" | "date"

/** Alvo do menu aberto: célula clicada + posição de tela + dia da semana. */
export type MenuTarget = {
  localDate: string
  minute: number
  /** Rótulo do dia da semana em PT-BR (ex.: "terça-feira") para o escopo. */
  weekdayLabel: string
  anchor: MenuAnchor
}

/** Faixa do "Período…": início + fim + (para disponibilidade) duração. */
export type PeriodDraft = {
  startMinute: number
  endMinute: number
  slotMinutes: number
}

/** Opções de horário (passo 30 min, 00:00–24:00). */
const TIME_OPTIONS = Array.from(
  { length: (24 * 60) / STEP + 1 },
  (_, i) => i * STEP,
)

/**
 * Cria uma âncora VIRTUAL (retângulo 0×0) na coordenada de tela do clique, para
 * posicionar o menu/popover no ponto exato onde o médico clicou.
 */
function virtualAnchorRef(anchor: MenuAnchor | null) {
  if (!anchor) return undefined
  const rect: DOMRect = {
    x: anchor.x,
    y: anchor.y,
    width: 0,
    height: 0,
    top: anchor.y,
    left: anchor.x,
    right: anchor.x,
    bottom: anchor.y,
    toJSON() {
      return {}
    },
  }
  const measurable = {
    getBoundingClientRect: () => rect,
  }
  return { current: measurable } as React.RefObject<typeof measurable>
}

const MENU_ITEM =
  "focus:bg-accent focus:text-accent-foreground flex w-full cursor-default items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sm outline-hidden select-none [&_svg]:size-4 [&_svg]:shrink-0"

/**
 * Menu de contexto de uma célula do calendário (rework v2 — dirigido por
 * clique/arraste, NÃO pelo `contextmenu` nativo).
 *
 * Implementado sobre `Popover` (radix) controlado + `Popover.Anchor` VIRTUAL no
 * ponto do clique — porque o `ContextMenu` do radix só abre no botão direito e
 * não expõe `open`/âncora controláveis. A distinção esquerdo/direito é feita no
 * grid (Pointer Events) e chega aqui como `kind`.
 *
 * `kind="available"` → "Disponibilidade" (clique esquerdo): Dia inteiro |
 * Período… + escopo Recorrente (default, "Toda {dia}") vs. Só nesta data
 * (AGENDA-05). `kind="off"` → "Folga" (clique direito): Dia inteiro | Período…,
 * sempre por data. Nenhuma ação limpa faixas existentes — todas somam.
 */
export function AvailabilityCellMenu({
  kind,
  target,
  open,
  onOpenChange,
  scope,
  onScopeChange,
  onWholeDay,
  onPeriod,
}: {
  kind: "available" | "off"
  target: MenuTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
  scope: AvailabilityScope
  onScopeChange: (scope: AvailabilityScope) => void
  onWholeDay: () => void
  onPeriod: (period: PeriodDraft) => void
}) {
  const [view, setView] = React.useState<"menu" | "period">("menu")
  const [period, setPeriod] = React.useState<PeriodDraft>({
    startMinute: 8 * 60,
    endMinute: 9 * 60,
    slotMinutes: DEFAULT_SLOT,
  })

  // (Re)semeia o período a partir da célula clicada quando o menu abre.
  React.useEffect(() => {
    if (open && target) {
      setView("menu")
      setPeriod({
        startMinute: target.minute,
        endMinute: Math.min(24 * 60, target.minute + 60),
        slotMinutes: DEFAULT_SLOT,
      })
    }
  }, [open, target])

  const isAvailable = kind === "available"
  const title = isAvailable ? "Disponibilidade" : "Folga"
  const anchorRef = virtualAnchorRef(target?.anchor ?? null)
  const periodValid = period.endMinute > period.startMinute

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {anchorRef ? <PopoverPrimitive.Anchor virtualRef={anchorRef} /> : null}
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          side="right"
          sideOffset={2}
          collisionPadding={12}
          onOpenAutoFocus={(event) => event.preventDefault()}
          className={cn(
            "bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 ring-foreground/10 z-50 origin-(--radix-popover-content-transform-origin) rounded-lg p-1 shadow-md ring-1 duration-100 outline-none",
            view === "menu" ? "min-w-56" : "w-72 p-3",
          )}
        >
          {view === "menu" ? (
            <div className="flex flex-col">
              <p className="flex items-center gap-1.5 px-1.5 py-1 text-sm font-medium">
                {isAvailable ? (
                  <CalendarCheck className="size-4 text-primary" />
                ) : (
                  <CalendarX className="size-4 text-muted-foreground" />
                )}
                {title}
              </p>
              <div className="bg-border -mx-1 my-1 h-px" />
              <button
                type="button"
                className={MENU_ITEM}
                onClick={() => {
                  onWholeDay()
                  onOpenChange(false)
                }}
              >
                Dia inteiro
              </button>
              <button
                type="button"
                className={MENU_ITEM}
                onClick={() => setView("period")}
              >
                <Clock />
                Período…
              </button>

              {isAvailable ? (
                <>
                  <div className="bg-border -mx-1 my-1 h-px" />
                  <p className="text-muted-foreground px-1.5 py-1 text-xs">
                    Aplicar em
                  </p>
                  <ScopeRadio
                    value={scope}
                    onChange={onScopeChange}
                    weekdayLabel={target?.weekdayLabel ?? null}
                  />
                </>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                {isAvailable ? (
                  <CalendarCheck className="size-4 text-primary" />
                ) : (
                  <CalendarX className="size-4 text-muted-foreground" />
                )}
                {title} — período
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Início</Label>
                  <TimeSelect
                    value={period.startMinute}
                    onChange={(value) =>
                      setPeriod((p) => ({ ...p, startMinute: value }))
                    }
                    max={24 * 60 - STEP}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Fim</Label>
                  <TimeSelect
                    value={period.endMinute}
                    onChange={(value) =>
                      setPeriod((p) => ({ ...p, endMinute: value }))
                    }
                    min={STEP}
                  />
                </div>
              </div>

              {isAvailable ? (
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Duração de cada horário</Label>
                  <Select
                    value={String(period.slotMinutes)}
                    onValueChange={(value) =>
                      setPeriod((p) => ({ ...p, slotMinutes: Number(value) }))
                    }
                  >
                    <SelectTrigger aria-label="Duração do slot" size="sm">
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

              {!periodValid ? (
                <p className="text-xs text-muted-foreground">
                  O fim precisa ser depois do início.
                </p>
              ) : null}

              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setView("menu")}
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!periodValid}
                  onClick={() => {
                    onPeriod(period)
                    onOpenChange(false)
                  }}
                >
                  Adicionar
                </Button>
              </div>
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

/** Radio de escopo (recorrente vs. só nesta data) — botões acessíveis. */
function ScopeRadio({
  value,
  onChange,
  weekdayLabel,
}: {
  value: AvailabilityScope
  onChange: (scope: AvailabilityScope) => void
  weekdayLabel: string | null
}) {
  const options: { key: AvailabilityScope; label: string }[] = [
    {
      key: "recurring",
      label: weekdayLabel ? `Toda ${weekdayLabel}` : "Todo esse dia da semana",
    },
    { key: "date", label: "Só nesta data" },
  ]
  return (
    <div role="radiogroup" className="flex flex-col">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          role="radio"
          aria-checked={value === option.key}
          className={cn(MENU_ITEM, "justify-between")}
          onClick={() => onChange(option.key)}
        >
          {option.label}
          <span
            aria-hidden
            className={cn(
              "size-3.5 rounded-full border",
              value === option.key
                ? "border-primary bg-primary"
                : "border-muted-foreground/50",
            )}
          />
        </button>
      ))}
    </div>
  )
}

/** Select de horário "HH:MM" no passo de 30 min. */
function TimeSelect({
  value,
  onChange,
  min = 0,
  max = 24 * 60,
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger size="sm" aria-label="Horário">
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
