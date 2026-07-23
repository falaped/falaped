import * as React from "react"
import { CalendarCheck, CalendarX, Check, Clock, UserX } from "lucide-react"

import type { AppointmentStatus } from "@/modules/appointments/types"

/**
 * Consulta que ocupa uma ou mais células/blocos (D-01/D-07). O pai resolve o
 * status e a identificação a partir da linha crua (starts_at UTC → célula/bloco
 * no fuso da clínica), incluindo a precedência ativo>histórico num horário
 * re-marcado (D-07).
 *
 * MOVIDO de `calendar-day-week-grid.tsx` (redesign híbrido 260723-du8) para um
 * módulo de DADO/ESTILO puro compartilhado pela grade de tempo
 * (`calendar-time-grid.tsx`), pelo detalhe (`appointment-detail-menu.tsx`) e pela
 * grade legada. Sem `"use client"`: é só tipo + estilo (tokens), sem hooks/estado.
 */
export type CellAppointment = {
  /** id da consulta (para a transição de status). */
  id: string
  status: AppointmentStatus
  /** Nome do paciente (para o rótulo curto in-grid e o detalhe). */
  patientName: string
  responsible: string | null
  /** Rótulo PT-BR da data/horário (para o detalhe). */
  dateLabel: string
  timeLabel: string
  /**
   * `true` na PRIMEIRA célula de 30 min coberta pela consulta. Uma consulta pode
   * abranger VÁRIAS células (Issue C: duração escolhida): todas as células
   * cobertas recebem o fill do status, mas o ícone/nome só é pintado na célula
   * de início (`isStart`), dando a leitura de um bloco contíguo.
   */
  isStart: boolean
}

/**
 * Contrato visual dos 5 status (07-UI-SPEC §Appointment status color system).
 * Cada status = fill/border + ícone lucide + variante de badge. Tokens oklch —
 * sem hex/rgb. `hatch` marca a Cancelada (overlay de gradiente repetido real).
 *
 * VERBATIM do que estava em `calendar-day-week-grid.tsx`: mesmas classes
 * token-only (pendente `bg-primary/10 border-dashed border-primary/60` + Clock;
 * confirmada `bg-primary/70 border-primary text-primary-foreground` + CalendarCheck;
 * realizada `bg-muted border-border text-muted-foreground` + Check; falta
 * `bg-destructive/10 border-destructive/40 text-destructive` + UserX; cancelada
 * `bg-muted border-border text-muted-foreground` + hatch + strike + CalendarX).
 */
export const APPOINTMENT_STATUS_STYLE: Record<
  AppointmentStatus,
  {
    /** Classe de fill+border da célula/bloco. */
    cell: string
    /** Ícone lucide do status. */
    Icon: React.ComponentType<{ className?: string }>
    /** Rótulo PT-BR do status. */
    label: string
    /** Aplica strikethrough no nome (Cancelada). */
    strike: boolean
    /** Aplica a hachura diagonal (Cancelada). */
    hatch: boolean
  }
> = {
  pending: {
    cell: "bg-primary/10 border border-dashed border-primary/60 text-primary",
    Icon: Clock,
    label: "Pendente",
    strike: false,
    hatch: false,
  },
  confirmed: {
    cell: "bg-primary/70 border border-primary text-primary-foreground",
    Icon: CalendarCheck,
    label: "Confirmada",
    strike: false,
    hatch: false,
  },
  done: {
    cell: "bg-muted border border-border text-muted-foreground",
    Icon: Check,
    label: "Realizada",
    strike: false,
    hatch: false,
  },
  no_show: {
    cell: "bg-destructive/10 border border-destructive/40 text-destructive",
    Icon: UserX,
    label: "Falta",
    strike: false,
    hatch: false,
  },
  canceled: {
    cell: "bg-muted border border-border text-muted-foreground",
    Icon: CalendarX,
    label: "Cancelada",
    strike: true,
    hatch: true,
  },
}
