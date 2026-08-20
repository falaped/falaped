import * as React from "react"
import { CalendarCheck, CalendarX, Check, Clock, UserX } from "lucide-react"

import type {
  AppointmentStatus,
  AppointmentType,
} from "@/modules/appointments/types"

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
  /** Motivo da consulta (opcional) — exibido no detalhe (260724-jka). */
  reason: string | null
  /** Tipo da consulta — exibido no detalhe via APPOINTMENT_TYPE_LABEL (260724-jka). */
  type: AppointmentType
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
 * Mapa de rótulos PT-BR do tipo da consulta (260724-jka). Espelha as opções de
 * captura (APPOINTMENT_TYPE_OPTIONS do create-dialog); usado no detalhe.
 */
export const APPOINTMENT_TYPE_LABEL: Record<AppointmentType, string> = {
  puericultura: "Puericultura",
  urgencia: "Urgência",
  retorno: "Retorno",
  primeira_consulta: "Primeira consulta",
}

/**
 * Contrato visual dos 5 status (07-UI-SPEC §Appointment status color system).
 * Cada status = fill/border + ícone lucide + variante de badge. Tokens oklch —
 * sem hex/rgb. `hatch` marca a Cancelada (overlay de gradiente repetido real).
 *
 * Paleta pastel clara com degradê (260724-gyi): o campo `cell` combina a classe
 * de LAYOUT da borda (border / border-dashed) com a classe de COR pastel
 * `.agenda-st-*` (definida em globals.css, degradê oklch + borda + texto). A FORMA
 * é preservada: pendente = borda tracejada; confirmada/realizada/falta = borda
 * sólida; cancelada = borda sólida + hachura (flag `hatch`) + nome riscado (flag
 * `strike`). Ícones lucide e os flags strike/hatch permanecem inalterados.
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
    cell: "border border-dashed agenda-st-pending",
    Icon: Clock,
    label: "Pendente",
    strike: false,
    hatch: false,
  },
  confirmed: {
    cell: "border agenda-st-confirmed",
    Icon: CalendarCheck,
    label: "Confirmada",
    strike: false,
    hatch: false,
  },
  done: {
    cell: "border agenda-st-done",
    Icon: Check,
    label: "Realizada",
    strike: false,
    hatch: false,
  },
  no_show: {
    cell: "border agenda-st-no_show",
    Icon: UserX,
    label: "Falta",
    strike: false,
    hatch: false,
  },
  canceled: {
    cell: "border agenda-st-canceled",
    Icon: CalendarX,
    label: "Cancelada",
    strike: true,
    hatch: true,
  },
}
