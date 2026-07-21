"use client"

import * as React from "react"
import { CalendarCheck, CalendarX, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { PaintMode } from "./calendar-day-week-grid"

/** Presets de duração de slot por faixa (D-09), como na v1. */
export const SLOT_PRESETS = [10, 15, 20, 30, 45, 60]
export const DEFAULT_SLOT = 30

/**
 * Painel de ações à direita do calendário (D-14/D-15/D-16/D-17).
 *
 * Contém, de cima para baixo:
 * - O TOGGLE ÚNICO Disponibilidade | Folga (D-15) que define o modo de pintura.
 *   Verde = disponível; folga = neutro (nunca destructive-red).
 * - O seletor de duração de slot por faixa (D-09) aplicado às novas faixas
 *   disponíveis pintadas.
 * - O botão "dia inteiro" que marca/desmarca o dia inteiro no modo ativo (D-16).
 * - O botão Salvar em lote com o INDICADOR de estado não-salvo (D-17).
 *
 * Só dispara callbacks; todo o estado (draft, dirty) vive no CalendarEditor.
 */
export function AvailabilityActionPanel({
  paintMode,
  onPaintModeChange,
  slotMinutes,
  onSlotMinutesChange,
  onFillActiveDay,
  onClearActiveDay,
  activeDayLabel,
  isDirty,
  saving,
  onSave,
}: {
  paintMode: PaintMode
  onPaintModeChange: (mode: PaintMode) => void
  slotMinutes: number
  onSlotMinutesChange: (value: number) => void
  onFillActiveDay: () => void
  onClearActiveDay: () => void
  activeDayLabel: string | null
  isDirty: boolean
  saving: boolean
  onSave: () => void
}) {
  return (
    <aside className="flex w-full flex-col gap-6 rounded-xl border bg-card p-4 lg:w-72">
      {/* Toggle Disponibilidade | Folga (D-15). */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">O que você quer marcar?</span>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={paintMode === "available" ? "default" : "outline"}
            aria-pressed={paintMode === "available"}
            onClick={() => onPaintModeChange("available")}
            className={cn(
              "justify-start gap-2",
              paintMode === "available" && "bg-primary text-primary-foreground",
            )}
          >
            <CalendarCheck className="h-4 w-4" />
            Disponibilidade
          </Button>
          <Button
            type="button"
            variant={paintMode === "off" ? "secondary" : "outline"}
            aria-pressed={paintMode === "off"}
            onClick={() => onPaintModeChange("off")}
            className="justify-start gap-2"
          >
            <CalendarX className="h-4 w-4" />
            Folga
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {paintMode === "available"
            ? "Clique ou arraste na grade para abrir horários (verde)."
            : "Clique ou arraste para marcar folga (bloqueia o horário)."}
        </p>
      </div>

      {/* Duração de slot por faixa (D-09) — só se aplica ao modo Disponibilidade. */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Duração de cada horário</span>
        <Select
          value={String(slotMinutes)}
          onValueChange={(value) => onSlotMinutesChange(Number(value))}
        >
          <SelectTrigger aria-label="Duração do slot">
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
        <p className="text-xs text-muted-foreground">
          Aplicada às novas faixas de disponibilidade que você pintar.
        </p>
      </div>

      {/* Dia inteiro (D-16). */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">
          Dia inteiro{activeDayLabel ? ` · ${activeDayLabel}` : ""}
        </span>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onFillActiveDay}
            disabled={!activeDayLabel}
          >
            {paintMode === "available" ? "Abrir dia" : "Folga o dia"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearActiveDay}
            disabled={!activeDayLabel}
          >
            Limpar dia
          </Button>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2">
        {isDirty ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-500">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Mudanças não salvas
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Tudo salvo.
          </span>
        )}
        <Button onClick={onSave} disabled={saving || !isDirty}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : isDirty ? (
            "Salvar alterações"
          ) : (
            "Salvo"
          )}
        </Button>
      </div>
    </aside>
  )
}
