"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { saveAvailabilityRulesAction } from "@/actions/availability"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

/** Linha crua de rule (snake_case, espelha o DB / Plano 01). */
type RuleRow = {
  id: string
  weekday: number
  start_minute: number
  end_minute: number
  slot_minutes: number
}

/** Segunda→Domingo (week starts Monday, D-11). Coluna → weekday 0=dom..6=sáb. */
const DAY_COLUMNS: { label: string; weekday: number }[] = [
  { label: "Seg", weekday: 1 },
  { label: "Ter", weekday: 2 },
  { label: "Qua", weekday: 3 },
  { label: "Qui", weekday: 4 },
  { label: "Sex", weekday: 5 },
  { label: "Sáb", weekday: 6 },
  { label: "Dom", weekday: 0 },
]

const STEP = 30 // minutos por célula (D-03)
const DEFAULT_START = 6 * 60 // 06:00
const DEFAULT_END = 22 * 60 // 22:00 (fim exclusivo)
const SLOT_PRESETS = [10, 15, 20, 30, 45, 60] // D-09
const DEFAULT_SLOT = 30

function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/** Chave estável de uma célula pintada: "weekday:minute". */
function cellKey(weekday: number, minute: number): string {
  return `${weekday}:${minute}`
}

/** Deriva as faixas contíguas (bands) de um dia a partir das células pintadas. */
function bandsForDay(
  weekday: number,
  painted: Set<string>,
  minuteRows: number[],
): { start: number; end: number }[] {
  const bands: { start: number; end: number }[] = []
  let runStart: number | null = null
  for (const minute of minuteRows) {
    const on = painted.has(cellKey(weekday, minute))
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

/**
 * Editor da grade semanal de disponibilidade (AGENDA-01/02, D-01/D-02/D-09).
 *
 * CSS grid custom (D-08, nenhuma lib de calendário): coluna gutter + 7 dias ×
 * linhas de 30 min. Click-to-toggle de célula (baseline D-01); células
 * contíguas num dia formam uma band (D-02); a lacuna de almoço separa bands.
 * Duração por faixa (D-09) via Select compacto por band (não por célula). Deriva
 * as bands da grade pintada e envia via saveAvailabilityRulesAction.
 */
export function AvailabilityGrid({ rules }: { rules: RuleRow[] }) {
  // Estado de pintura: Set de "weekday:minute" das células ligadas.
  const [painted, setPainted] = React.useState<Set<string>>(() => {
    const set = new Set<string>()
    for (const rule of rules) {
      for (let m = rule.start_minute; m < rule.end_minute; m += STEP) {
        set.add(cellKey(rule.weekday, m))
      }
    }
    return set
  })

  // Duração por band, chaveada por "weekday:bandStart" (D-09).
  const [bandDurations, setBandDurations] = React.useState<
    Record<string, number>
  >(() => {
    const map: Record<string, number> = {}
    for (const rule of rules) {
      map[`${rule.weekday}:${rule.start_minute}`] = rule.slot_minutes
    }
    return map
  })

  const [saving, setSaving] = React.useState(false)

  // Range visível: default 06:00–22:00, auto-extensivel se uma band salva cair
  // fora (floor 00:00 / ceiling 24:00) — nunca corta uma band salva.
  const { rangeStart, rangeEnd } = React.useMemo(() => {
    let start = DEFAULT_START
    let end = DEFAULT_END
    for (const rule of rules) {
      start = Math.min(start, Math.max(0, rule.start_minute))
      end = Math.max(end, Math.min(24 * 60, rule.end_minute))
    }
    return { rangeStart: start, rangeEnd: end }
  }, [rules])

  const minuteRows = React.useMemo(() => {
    const rows: number[] = []
    for (let m = rangeStart; m < rangeEnd; m += STEP) rows.push(m)
    return rows
  }, [rangeStart, rangeEnd])

  function toggleCell(weekday: number, minute: number) {
    setPainted((prev) => {
      const next = new Set(prev)
      const key = cellKey(weekday, minute)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const isEmpty = painted.size === 0

  async function handleSave() {
    const rulesPayload: {
      weekday: number
      start_minute: number
      end_minute: number
      slot_minutes: number
    }[] = []

    for (const { weekday } of DAY_COLUMNS) {
      const dayBands = bandsForDay(weekday, painted, minuteRows)
      for (const band of dayBands) {
        const slot = bandDurations[`${weekday}:${band.start}`] ?? DEFAULT_SLOT
        rulesPayload.push({
          weekday,
          start_minute: band.start,
          end_minute: band.end,
          slot_minutes: slot,
        })
      }
    }

    setSaving(true)
    const result = await saveAvailabilityRulesAction({ rules: rulesPayload })
    setSaving(false)

    if (result.ok) {
      toast.success("Disponibilidade salva.")
    } else {
      toast.error(result.error)
    }
  }

  const gridTemplateColumns = "4rem repeat(7, minmax(3rem, 1fr))"
  const gridTemplateRows = `2.5rem repeat(${minuteRows.length}, 1.5rem)`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Disponibilidade recorrente</h2>
          <p className="text-sm text-muted-foreground">
            Clique nos blocos para marcar quando você atende.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar disponibilidade"
          )}
        </Button>
      </div>

      {isEmpty ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm font-medium">Nenhum horário configurado.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecione os blocos na grade abaixo para definir quando você atende.
          </p>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <div
          className="grid min-w-[40rem] text-sm"
          style={{ gridTemplateColumns, gridTemplateRows }}
        >
          {/* Canto superior esquerdo (gutter × header). */}
          <div className="sticky left-0 z-20 border-b border-r bg-muted" />

          {/* Cabeçalho dos dias. */}
          {DAY_COLUMNS.map(({ label, weekday }) => (
            <div
              key={`head-${weekday}`}
              className="sticky top-0 z-10 flex items-center justify-center border-b bg-muted font-normal text-muted-foreground"
            >
              {label}
            </div>
          ))}

          {/* Linhas de horário. */}
          {minuteRows.map((minute) => (
            <React.Fragment key={`row-${minute}`}>
              <div className="sticky left-0 z-10 flex items-start justify-end border-r bg-muted pr-2 text-xs text-muted-foreground">
                {minute % 60 === 0 ? minutesToLabel(minute) : null}
              </div>
              {DAY_COLUMNS.map(({ weekday }) => {
                const on = painted.has(cellKey(weekday, minute))
                // A band começa aqui? (célula ligada e a de cima desligada.)
                const isBandStart =
                  on && !painted.has(cellKey(weekday, minute - STEP))
                const bandDurationKey = `${weekday}:${minute}`
                return (
                  <div
                    key={cellKey(weekday, minute)}
                    className={cn(
                      "relative border-b border-r",
                      minute % 60 === 30 && "border-b-muted",
                    )}
                  >
                    <button
                      type="button"
                      aria-label={`${minutesToLabel(minute)} — alternar disponibilidade`}
                      aria-pressed={on}
                      onClick={() => toggleCell(weekday, minute)}
                      className={cn(
                        "h-full w-full transition-colors",
                        on
                          ? "bg-primary/20 hover:bg-primary/30"
                          : "hover:bg-muted",
                      )}
                    />
                    {isBandStart ? (
                      <div className="absolute right-0.5 top-0.5 z-10">
                        <Select
                          value={String(
                            bandDurations[bandDurationKey] ?? DEFAULT_SLOT,
                          )}
                          onValueChange={(v) =>
                            setBandDurations((prev) => ({
                              ...prev,
                              [bandDurationKey]: Number(v),
                            }))
                          }
                        >
                          <SelectTrigger
                            size="sm"
                            className="h-5 gap-1 border-primary/40 bg-background px-1.5 text-xs"
                            aria-label="Duração do slot"
                          >
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
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
