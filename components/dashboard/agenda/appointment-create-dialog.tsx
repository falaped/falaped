"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { createAppointmentAction } from "@/actions"
import type { Patient } from "@/modules/patients/types"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * Alvo de criação de consulta: o slot livre clicado. Os instantes são ISO UTC (o
 * que expandAvailability emite); os rótulos {data}/{horário} já vêm formatados no
 * fuso da clínica pelo pai. O médico escolhe a DURAÇÃO no dialog (Issue C): o
 * `endsAt` final é derivado de `startsAt + duração` (não mais fixo em 1 slot).
 */
export type CreateTarget = {
  /** Instante UTC (ISO) do início do slot. */
  startsAt: string
  /** Rótulo PT-BR da data (ex.: "terça, 12 de agosto"). */
  dateLabel: string
  /** Rótulo PT-BR do horário (ex.: "14:00"). */
  timeLabel: string
  /** Duração default (min) = slot_minutes da faixa clicada (fallback 30). */
  defaultDuration: number
}

/** Presets de duração da consulta (Issue C). Compartilhado com o trilho (booking-rail). */
export const DURATION_PRESETS = [15, 30, 45, 60, 90] as const

/**
 * Iniciais do paciente para o avatar de fallback (sem foto no fluxo de busca).
 */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ""
  return (first + last).toUpperCase() || "?"
}

/**
 * Dialog de criação de consulta (D-03/D-04/D-05, APPT-01). Aberto ao clicar num
 * slot LIVRE do calendário; hospeda a busca de paciente (reusa o domínio
 * patients, escopado por profile_id — sem criação de paciente aqui, D-04) e
 * cria a consulta já CONFIRMADA (D-05) via createAppointmentAction. O erro de
 * double-booking (D-08) é renderizado INLINE (nunca erro cru). Tokens oklch e
 * copy PT-BR verbatim do 07-UI-SPEC.
 */
export function AppointmentCreateDialog({
  target,
  patients,
  onOpenChange,
  onCreated,
}: {
  /** Slot alvo; `null` fecha o dialog. */
  target: CreateTarget | null
  /** Pacientes do perfil (filtro client-side, mirror do módulo — D-04). */
  patients: Patient[]
  onOpenChange: (open: boolean) => void
  /** Callback pós-sucesso (o pai pode fechar/atualizar). */
  onCreated?: () => void
}) {
  const [query, setQuery] = React.useState("")
  const [selected, setSelected] = React.useState<Patient | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [inlineError, setInlineError] = React.useState<string | null>(null)
  const [fieldError, setFieldError] = React.useState<string | null>(null)
  // Duração escolhida (min). Default = slot_minutes da faixa clicada (Issue C).
  const [duration, setDuration] = React.useState<number>(30)

  const open = target !== null

  // Presets ∪ a duração default da faixa (se off-preset, ainda selecionável).
  const durationOptions = React.useMemo(() => {
    const set = new Set<number>(DURATION_PRESETS)
    if (target?.defaultDuration) set.add(target.defaultDuration)
    return [...set].sort((a, b) => a - b)
  }, [target?.defaultDuration])

  // Reset ao abrir/fechar para um novo slot.
  React.useEffect(() => {
    if (open) {
      setQuery("")
      setSelected(null)
      setSaving(false)
      setInlineError(null)
      setFieldError(null)
      setDuration(target?.defaultDuration ?? 30)
    }
  }, [open, target?.startsAt, target?.defaultDuration])

  // Filtro client-side por nome do paciente OU responsável (mirror do domínio
  // patients — findPatientByProfileIdNameAndResponsible). Antes de digitar não
  // exibimos a lista inteira: mostramos o estado "comece a digitar".
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length === 0) return []
    return patients.filter((p) => {
      const name = p.name.toLowerCase()
      const responsible = (p.responsible ?? "").toLowerCase()
      return name.includes(q) || responsible.includes(q)
    })
  }, [patients, query])

  async function handleSubmit() {
    if (!target) return
    if (!selected) {
      setFieldError("Selecione um paciente para agendar.")
      return
    }
    setSaving(true)
    setInlineError(null)
    // ends_at = starts_at + duração escolhida (Issue C): pode cobrir várias
    // células de 30 min. O servidor valida que o intervalo inteiro está livre.
    const endsAt = new Date(
      new Date(target.startsAt).getTime() + duration * 60_000,
    ).toISOString()
    const result = await createAppointmentAction({
      patient_id: selected.id,
      starts_at: target.startsAt,
      ends_at: endsAt,
    })
    setSaving(false)
    if (result.ok) {
      toast.success("Consulta agendada.")
      onOpenChange(false)
      onCreated?.()
      return
    }
    // Double-booking / slot indisponível / genérico → erro INLINE amigável
    // (nunca erro cru do Postgres). CTA reabilitada (saving já é false).
    setInlineError(result.error)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova consulta</DialogTitle>
          <DialogDescription>
            {target
              ? `${target.dateLabel} · ${target.timeLabel} — escolha o paciente para agendar neste horário.`
              : null}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium" htmlFor="appointment-patient-search">
            Paciente
          </label>

          {selected ? (
            // Estado SELECIONADO: paciente escolhido + trocar.
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              <Avatar className="size-9">
                <AvatarFallback>{initialsOf(selected.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium">{selected.name}</p>
                {selected.responsible ? (
                  <p className="truncate text-sm text-muted-foreground">
                    {selected.responsible}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelected(null)
                  setFieldError(null)
                }}
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
                id="appointment-patient-search"
                placeholder="Buscar por nome do paciente ou responsável…"
                value={query}
                onValueChange={(value) => {
                  setQuery(value)
                  setFieldError(null)
                }}
              />
              <CommandList>
                {query.trim().length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-sm font-medium">Comece a digitar para buscar.</p>
                    <p className="text-sm text-muted-foreground">
                      Busque um paciente já cadastrado por nome ou responsável.
                    </p>
                  </div>
                ) : filtered.length === 0 ? (
                  <CommandEmpty>
                    <div className="text-center">
                      <p className="text-sm font-medium">Nenhum paciente encontrado.</p>
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
                        onSelect={() => {
                          setSelected(patient)
                          setFieldError(null)
                        }}
                        className="flex items-center gap-3"
                      >
                        <Avatar className="size-8">
                          <AvatarFallback>{initialsOf(patient.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base">{patient.name}</p>
                          {patient.responsible ? (
                            <p className="truncate text-sm text-muted-foreground">
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="appointment-duration">Duração</Label>
            <Select
              value={String(duration)}
              onValueChange={(value) => setDuration(Number(value))}
            >
              <SelectTrigger id="appointment-duration" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {durationOptions.map((minutes) => (
                  <SelectItem key={minutes} value={String(minutes)}>
                    {minutes} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {fieldError ? (
            <p className="text-sm text-destructive">{fieldError}</p>
          ) : null}

          {inlineError ? (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {inlineError}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!selected || saving}
            className={cn(saving && "opacity-90")}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
