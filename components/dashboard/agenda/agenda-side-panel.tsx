"use client"

import * as React from "react"

import type { Patient } from "@/modules/patients/types"
import { cn } from "@/lib/utils"
import { BookingRail, type FreeSlot } from "./booking-rail"
import {
  AvailabilityPanel,
  type AvailabilityIntent,
} from "./availability-panel"

/** Modo do painel lateral: agendar consulta vs. editar disponibilidade/folga. */
type PanelMode = "consulta" | "disponibilidade"

/**
 * PAINEL LATERAL ÚNICO com toggle "Consulta ↔ Disponibilidade/Folga" (D-1,
 * 260723-kej). Modo Consulta = o `BookingRail` atual (agendamento Calendly);
 * modo Disponibilidade = o novo `AvailabilityPanel` (edição de disponibilidade e
 * folga por período/dia-inteiro/recorrência).
 *
 * Ambos os modos compartilham o dia selecionado (`selectedDate`, read-only) —
 * escolhido no calendário real (grade/Mês); o painel só o reflete (M-5). O painel
 * só repassa props; a lógica de save vive no editor (via `onApply`).
 *
 * Tokens oklch apenas; copy PT-BR; sem deps novas.
 */
export function AgendaSidePanel({
  patients,
  selectedDate,
  selectedDayLongLabel,
  selectedWeekday,
  freeSlots,
  initialMode,
  preselectedMinute,
  onApply,
  savingAvailability = false,
}: {
  /** Pacientes do perfil (busca client-side no BookingRail). */
  patients: Patient[]
  /** Dia selecionado (YYYY-MM-DD), read-only — escolhido no calendário real (M-5). */
  selectedDate: string
  /** Rótulo longo PT-BR do dia (para ambos os modos). */
  selectedDayLongLabel: string
  /** Weekday (0=dom..6=sáb) do dia selecionado, no fuso da clínica (pai calcula). */
  selectedWeekday: number
  /** Horários LIVRES do dia selecionado (para o BookingRail). */
  freeSlots: FreeSlot[]
  /**
   * Modo INICIAL do painel (C-3): o botão de trigger define só o modo de
   * abertura do drawer; o toggle interno continua funcional.
   */
  initialMode?: PanelMode
  /** Minuto-do-dia PRÉ-SELECIONADO repassado ao BookingRail (C-4). */
  preselectedMinute?: number | null
  /** Aplica a intenção de disponibilidade/folga (o editor traduz + salva). */
  onApply: (intent: AvailabilityIntent) => void
  /** `true` enquanto um save de disponibilidade está em andamento. */
  savingAvailability?: boolean
}) {
  const [mode, setMode] = React.useState<PanelMode>(initialMode ?? "consulta")

  // Sincroniza o modo quando `initialMode` muda entre aberturas do drawer (C-3).
  React.useEffect(() => {
    setMode(initialMode ?? "consulta")
  }, [initialMode])

  return (
    <div className="flex flex-col gap-3">
      {/* Toggle Consulta ↔ Disponibilidade/Folga (D-1). */}
      <div
        className="flex gap-1.5 rounded-lg border border-border bg-card p-1"
        role="group"
        aria-label="Modo do painel"
      >
        <button
          type="button"
          aria-pressed={mode === "consulta"}
          onClick={() => setMode("consulta")}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            mode === "consulta"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Consulta
        </button>
        <button
          type="button"
          aria-pressed={mode === "disponibilidade"}
          onClick={() => setMode("disponibilidade")}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            mode === "disponibilidade"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Disponibilidade/Folga
        </button>
      </div>

      {mode === "consulta" ? (
        <BookingRail
          patients={patients}
          selectedDate={selectedDate}
          selectedDayLongLabel={selectedDayLongLabel}
          freeSlots={freeSlots}
          preselectedMinute={preselectedMinute}
        />
      ) : (
        <AvailabilityPanel
          selectedDate={selectedDate}
          selectedDayLongLabel={selectedDayLongLabel}
          selectedWeekday={selectedWeekday}
          onApply={onApply}
          saving={savingAvailability}
        />
      )}
    </div>
  )
}
