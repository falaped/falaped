"use client"

import * as React from "react"

import type { Patient } from "@/modules/patients/types"
import { cn } from "@/lib/utils"
import { BookingRail, type FreeSlot } from "./booking-rail"
import {
  AvailabilityPanel,
  type AvailabilityIntent,
} from "./availability-panel"

/**
 * Ação do painel lateral (E-4): agendar consulta, marcar disponibilidade ou marcar
 * folga. Disponibilidade e Folga renderizam o mesmo `AvailabilityPanel` com o tipo
 * pré-selecionado.
 */
type PanelMode = "consulta" | "disponibilidade" | "folga"

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
  onCreated,
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
  /** Callback pós-criação de consulta (E-2: fecha o drawer). Repassado ao BookingRail. */
  onCreated?: () => void
  /** `true` enquanto um save de disponibilidade está em andamento. */
  savingAvailability?: boolean
}) {
  const [mode, setMode] = React.useState<PanelMode>(initialMode ?? "consulta")

  // Sincroniza o modo quando `initialMode` muda entre aberturas do drawer (C-3).
  React.useEffect(() => {
    setMode(initialMode ?? "consulta")
  }, [initialMode])

  // Toggle de 3 opções (E-4): Consulta | Disponibilidade | Folga.
  const OPTIONS: { value: PanelMode; label: string }[] = [
    { value: "consulta", label: "Consulta" },
    { value: "disponibilidade", label: "Disponibilidade" },
    { value: "folga", label: "Folga" },
  ]

  return (
    <div className="flex flex-col gap-3">
      {/* Toggle de 3 opções Consulta | Disponibilidade | Folga (E-4). */}
      <div
        className="flex gap-1.5 rounded-lg border border-border bg-card p-1"
        role="group"
        aria-label="Ação do painel"
      >
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={mode === option.value}
            onClick={() => setMode(option.value)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              mode === option.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {mode === "consulta" ? (
        <BookingRail
          patients={patients}
          selectedDate={selectedDate}
          selectedDayLongLabel={selectedDayLongLabel}
          freeSlots={freeSlots}
          preselectedMinute={preselectedMinute}
          onCreated={onCreated}
        />
      ) : (
        <AvailabilityPanel
          selectedDate={selectedDate}
          selectedDayLongLabel={selectedDayLongLabel}
          selectedWeekday={selectedWeekday}
          initialType={mode === "folga" ? "off" : "available"}
          onApply={onApply}
          saving={savingAvailability}
        />
      )}
    </div>
  )
}
