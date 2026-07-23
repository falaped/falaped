"use client"

import * as React from "react"
import { Clock, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { createAppointmentAction } from "@/actions"
import type { Patient } from "@/modules/patients/types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { DURATION_PRESETS } from "./appointment-create-dialog"

/** Horário LIVRE do dia selecionado (derivado pelo pai: disponibilidade − ocupados). */
export type FreeSlot = {
  /** Minuto-do-dia do início (wall-clock, fuso da clínica). */
  minute: number
  /** Rótulo "HH:MM" (fuso da clínica). */
  label: string
  /** Instante de início ISO UTC (o que a action grava). */
  startsAt: string
}

/** Iniciais do paciente para o avatar de fallback. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ""
  return (first + last).toUpperCase() || "?"
}

/**
 * TRILHO DE AGENDAMENTO FIXO estilo Calendly (redesign híbrido 260723-du8) — o
 * caminho PRIMÁRIO de criação de consulta. Coexiste com o `AppointmentCreateDialog`
 * (clique-no-slot da grade): ambos compartilham `DURATION_PRESETS`, a mesma busca
 * client-side de pacientes (domínio `patients` já escopado por profile_id, D-04) e
 * a mesma `createAppointmentAction`.
 *
 * Estrutura: Card "Nova consulta" + busca de paciente (Command/cmdk), chips de
 * duração 15/30/45/60/90, rótulo do dia longo + lista de horários LIVRES do dia,
 * CTA "Agendar consulta", rodapé "Horário de Brasília". O dia NÃO é escolhido
 * aqui — vem do calendário real (grade/Mês) via `selectedDate` (read-only, M-5).
 *
 * O erro de double-booking (23P01 → result union) é renderizado INLINE amigável,
 * NUNCA o erro cru. Tokens oklch; copy PT-BR verbatim do mockup/07-UI-SPEC.
 */
export function BookingRail({
  patients,
  selectedDate,
  selectedDayLongLabel,
  freeSlots,
  onCreated,
}: {
  /** Pacientes do perfil (filtro client-side, mirror do domínio patients — D-04). */
  patients: Patient[]
  /** Dia selecionado (YYYY-MM-DD) — read-only; escolhido no calendário real (M-5). */
  selectedDate: string
  /** Rótulo longo PT-BR do dia (ex.: "quinta-feira, 23 de julho"). */
  selectedDayLongLabel: string
  /** Horários LIVRES do dia selecionado (disponibilidade − consultas ativas). */
  freeSlots: FreeSlot[]
  /** Callback pós-sucesso (o pai pode reagir; a agenda revalida via RSC). */
  onCreated?: () => void
}) {
  const [query, setQuery] = React.useState("")
  const [selected, setSelected] = React.useState<Patient | null>(null)
  const [duration, setDuration] = React.useState<number>(30)
  const [slotMinute, setSlotMinute] = React.useState<number | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [inlineError, setInlineError] = React.useState<string | null>(null)

  // Filtro client-side por nome do paciente OU responsável (mirror do domínio
  // patients). Antes de digitar não exibimos a lista inteira.
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length === 0) return []
    return patients.filter((p) => {
      const name = p.name.toLowerCase()
      const responsible = (p.responsible ?? "").toLowerCase()
      return name.includes(q) || responsible.includes(q)
    })
  }, [patients, query])

  const selectedSlot = React.useMemo(
    () => freeSlots.find((s) => s.minute === slotMinute) ?? null,
    [freeSlots, slotMinute],
  )

  // Ao trocar de dia, some a seleção de slot (o horário pode não existir mais).
  React.useEffect(() => {
    setSlotMinute(null)
    setInlineError(null)
  }, [selectedDate])

  async function handleSubmit() {
    if (!selected || !selectedSlot) return
    setSaving(true)
    setInlineError(null)
    const endsAt = new Date(
      new Date(selectedSlot.startsAt).getTime() + duration * 60_000,
    ).toISOString()
    const result = await createAppointmentAction({
      patient_id: selected.id,
      starts_at: selectedSlot.startsAt,
      ends_at: endsAt,
    })
    setSaving(false)
    if (result.ok) {
      toast.success("Consulta agendada.")
      setSelected(null)
      setQuery("")
      setSlotMinute(null)
      onCreated?.()
      return
    }
    // Double-booking / indisponível / genérico → erro INLINE amigável (nunca cru).
    setInlineError(result.error)
  }

  const canBook = selected !== null && selectedSlot !== null && !saving

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-xl font-semibold tracking-tight">Nova consulta</h2>
        <p className="text-sm text-muted-foreground">
          Escolha a duração e um horário livre.
        </p>
      </div>

      {/* Paciente (busca client-side, reusa o domínio patients). */}
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          htmlFor="booking-rail-patient-search"
        >
          Paciente
        </label>
        {selected ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-2.5">
            <Avatar className="size-8">
              <AvatarFallback>{initialsOf(selected.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{selected.name}</p>
              {selected.responsible ? (
                <p className="truncate text-xs text-muted-foreground">
                  {selected.responsible}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelected(null)}
            >
              trocar
            </Button>
          </div>
        ) : (
          <Command
            shouldFilter={false}
            className="rounded-lg border border-border"
          >
            <CommandInput
              id="booking-rail-patient-search"
              placeholder="Buscar por nome do paciente ou responsável…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {query.trim().length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-sm font-medium">
                    Comece a digitar para buscar.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Busque um paciente já cadastrado por nome ou responsável.
                  </p>
                </div>
              ) : filtered.length === 0 ? (
                <CommandEmpty>
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      Nenhum paciente encontrado.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Verifique o nome ou cadastre o paciente antes de agendar.
                    </p>
                  </div>
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {filtered.map((patient) => (
                    <CommandItem
                      key={patient.id}
                      value={patient.id}
                      onSelect={() => setSelected(patient)}
                      className="flex items-center gap-3"
                    >
                      <Avatar className="size-8">
                        <AvatarFallback>
                          {initialsOf(patient.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{patient.name}</p>
                        {patient.responsible ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {patient.responsible}
                          </p>
                        ) : null}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        )}
      </div>

      {/* Chips de duração (15/30/45/60/90). */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Duração
        </span>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Duração">
          {DURATION_PRESETS.map((minutes) => {
            const active = minutes === duration
            return (
              <button
                key={minutes}
                type="button"
                aria-pressed={active}
                onClick={() => setDuration(minutes)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium tabular-nums transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-foreground/40",
                )}
              >
                {minutes === 30 ? "30 min" : minutes}
              </button>
            )
          })}
        </div>
      </div>

      {/* Dia longo + horários livres. */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase capitalize tracking-wide text-muted-foreground">
          {selectedDayLongLabel}
        </span>
        {freeSlots.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Nenhum horário livre neste dia.
          </p>
        ) : (
          <div className="grid max-h-48 gap-1.5 overflow-y-auto pr-1">
            {freeSlots.map((slot) => {
              const active = slot.minute === slotMinute
              return (
                <button
                  key={slot.minute}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setSlotMinute(slot.minute)
                    setInlineError(null)
                  }}
                  className={cn(
                    "h-10 rounded-lg border text-sm font-semibold tabular-nums transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-primary/60 text-primary hover:bg-primary/10",
                  )}
                >
                  {slot.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {inlineError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {inlineError}
        </p>
      ) : null}

      <Button
        type="button"
        className="h-11 w-full"
        onClick={handleSubmit}
        disabled={!canBook}
      >
        {saving ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Agendando...
          </>
        ) : (
          "Agendar consulta"
        )}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3" />
        Horário de Brasília
      </p>
    </Card>
  )
}
