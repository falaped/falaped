"use client"

import * as React from "react"
import { CalendarCheck, CalendarX, Check, UserX, X } from "lucide-react"
import { toast } from "sonner"

import { transitionAppointmentStatusAction } from "@/actions"
import type { AppointmentStatus } from "@/modules/appointments/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  APPOINTMENT_STATUS_STYLE,
  APPOINTMENT_TYPE_LABEL,
  type CellAppointment,
} from "./appointment-status-style"

/** Variante de Badge por status (07-UI-SPEC §Appointment status color system). */
const BADGE_VARIANT: Record<
  AppointmentStatus,
  "default" | "secondary" | "destructive" | "outline" | "ghost"
> = {
  pending: "outline",
  confirmed: "default",
  done: "secondary",
  no_show: "destructive",
  canceled: "ghost",
}

/** Estados finais (D-06): sem transição de saída. */
const FINAL_STATUSES: AppointmentStatus[] = ["done", "no_show", "canceled"]

/**
 * Snapshot da consulta capturado no instante em que uma transição é INICIADA.
 * Torna o fluxo RESILIENTE ao fechamento do modal: ao abrir o AlertDialog de
 * cancelar, o Dialog dispara onOpenChange(false) → o pai zera `detail` → a prop
 * `appointment` vira null. Sem snapshot, o AlertDialog desmontaria e runTransition
 * abortaria (`if (!appointment) return`). O snapshot mantém `id`/`from` vivos e o
 * corpo do diálogo renderizável mesmo com a prop já nula (mesmo padrão de
 * `pending-requests-panel.tsx`).
 */
type TransitionSnapshot = {
  id: string
  from: AppointmentStatus
  to: AppointmentStatus
  successMsg: string
  patientName: string
  dateLabel: string
  timeLabel: string
}

/**
 * Detalhe + ações de transição de status de uma consulta (APPT-02 / D-06).
 *
 * MODAL CENTRALIZADO (shadcn Dialog) — não mais Popover ancorado (260724-jka).
 * Exibe paciente, responsável, motivo, tipo, data/hora e o badge de status. As
 * ações de transição são ICON-ONLY com Tooltip PT-BR: Confirmada expõe as
 * transições LEGAIS (Marcar como realizada · Marcar falta · Cancelar consulta via
 * AlertDialog destrutivo); Pendente expõe Confirmar (pending→confirmed) e Recusar
 * (pending→canceled, destrutivo); estados finais (realizada/falta/cancelada) são
 * READ-ONLY (sem botões). Tokens oklch, copy PT-BR verbatim do UI-SPEC.
 */
export function AppointmentDetailMenu({
  appointment,
  onOpenChange,
}: {
  appointment: CellAppointment | null
  onOpenChange: (open: boolean) => void
}) {
  const [busy, setBusy] = React.useState(false)
  // Cancelar: snapshot que abre o AlertDialog destrutivo (null = fechado).
  const [confirmCancel, setConfirmCancel] =
    React.useState<TransitionSnapshot | null>(null)

  const open = appointment !== null

  /**
   * Executa a transição a partir de um SNAPSHOT (não da prop live `appointment`),
   * imune ao fechamento do modal / prop virando null no meio da confirmação.
   */
  const runTransition = React.useCallback(
    async (snapshot: TransitionSnapshot) => {
      setBusy(true)
      const result = await transitionAppointmentStatusAction({
        id: snapshot.id,
        from: snapshot.from,
        to: snapshot.to,
      })
      setBusy(false)
      if (result.ok) {
        toast.success(snapshot.successMsg)
        onOpenChange(false)
      } else {
        toast.error(result.error)
      }
    },
    [onOpenChange],
  )

  // AlertDialog de cancelar dirigido SÓ pelo snapshot `confirmCancel`. Precisa
  // sobreviver a `appointment === null`: ao abrir, o modal fecha e o pai zera
  // `detail`, então a prop vira null — mas o diálogo (e o confirm) seguem vivos.
  const cancelDialog = (
    <AlertDialog
      open={confirmCancel !== null}
      onOpenChange={(o) => {
        if (!o) setConfirmCancel(null)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {confirmCancel?.from === "pending"
              ? "Recusar esta consulta?"
              : "Cancelar esta consulta?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {confirmCancel
              ? `A consulta de ${confirmCancel.patientName} em ${confirmCancel.dateLabel} ${confirmCancel.timeLabel} será ${
                  confirmCancel.from === "pending" ? "recusada" : "cancelada"
                } e o horário liberado. Esta ação não pode ser desfeita.`
              : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmCancel(null)}>
            Voltar
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              const snapshot = confirmCancel
              setConfirmCancel(null)
              if (snapshot) runTransition(snapshot)
            }}
          >
            {confirmCancel?.from === "pending"
              ? "Recusar consulta"
              : "Cancelar consulta"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  // Sem consulta selecionada: o modal não renderiza, MAS o AlertDialog de
  // cancelar continua montado enquanto seu snapshot existir (fluxo resiliente).
  if (!appointment) return cancelDialog

  // Snapshot congelado no clique, a partir da prop live ainda montada.
  const snapshotFor = (
    to: AppointmentStatus,
    successMsg: string,
  ): TransitionSnapshot => ({
    id: appointment.id,
    from: appointment.status,
    to,
    successMsg,
    patientName: appointment.patientName,
    dateLabel: appointment.dateLabel,
    timeLabel: appointment.timeLabel,
  })

  const style = APPOINTMENT_STATUS_STYLE[appointment.status]
  const isFinal = FINAL_STATUSES.includes(appointment.status)
  const isConfirmed = appointment.status === "confirmed"
  // E-5: um bloco PENDENTE oferece Confirmar (pending→confirmed) e Recusar
  // (pending→canceled) — transições legais já existentes na máquina de status.
  const isPending = appointment.status === "pending"

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-start justify-between gap-2">
              <DialogTitle className="min-w-0 truncate">
                {appointment.patientName}
              </DialogTitle>
              <Badge
                variant={BADGE_VARIANT[appointment.status]}
                className={cn(
                  appointment.status === "pending" && "text-primary",
                  appointment.status === "canceled" && "text-muted-foreground",
                )}
              >
                {style.label}
              </Badge>
            </div>
            <DialogDescription className="sr-only">
              Detalhe da consulta de {appointment.patientName}.
            </DialogDescription>
          </DialogHeader>

          {/* Campos: responsável (se houver), motivo (se houver), tipo, data/hora. */}
          <div className="flex flex-col gap-3">
            {appointment.responsible ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Responsável
                </span>
                <span className="text-sm">{appointment.responsible}</span>
              </div>
            ) : null}

            {appointment.reason ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Motivo
                </span>
                <span className="text-sm whitespace-pre-wrap">
                  {appointment.reason}
                </span>
              </div>
            ) : null}

            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-muted-foreground">
                Tipo
              </span>
              <span className="text-sm">
                {APPOINTMENT_TYPE_LABEL[appointment.type]}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-muted-foreground">
                Data e hora
              </span>
              <span className="text-sm">
                {appointment.dateLabel} · {appointment.timeLabel}
              </span>
            </div>
          </div>

          {/* Ações icon-only com Tooltip. Pendente: Confirmar/Recusar (E-5).
              Confirmada: realizada/falta/cancelar. Finais: read-only (D-06). */}
          {isPending ? (
            <TooltipProvider>
              <div className="flex items-center gap-1.5 border-t border-border pt-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Confirmar"
                      disabled={busy}
                      onClick={() =>
                        runTransition(
                          snapshotFor("confirmed", "Consulta confirmada."),
                        )
                      }
                    >
                      <Check />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Confirmar</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Recusar"
                      className="text-destructive hover:text-destructive"
                      disabled={busy}
                      onClick={() =>
                        setConfirmCancel(
                          snapshotFor("canceled", "Consulta recusada."),
                        )
                      }
                    >
                      <X />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Recusar</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          ) : isConfirmed ? (
            <TooltipProvider>
              <div className="flex items-center gap-1.5 border-t border-border pt-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Marcar como realizada"
                      disabled={busy}
                      onClick={() =>
                        runTransition(
                          snapshotFor(
                            "done",
                            "Consulta marcada como realizada.",
                          ),
                        )
                      }
                    >
                      <CalendarCheck />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Marcar como realizada</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Marcar falta"
                      disabled={busy}
                      onClick={() =>
                        runTransition(snapshotFor("no_show", "Falta registrada."))
                      }
                    >
                      <UserX />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Marcar falta</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Cancelar consulta"
                      className="text-destructive hover:text-destructive"
                      disabled={busy}
                      onClick={() =>
                        setConfirmCancel(
                          snapshotFor("canceled", "Consulta cancelada."),
                        )
                      }
                    >
                      <CalendarX />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Cancelar consulta</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          ) : isFinal ? (
            <p className="border-t border-border pt-3 text-xs text-muted-foreground">
              Consulta finalizada — sem outras ações.
            </p>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Cancelar consulta (confirmed → canceled): AlertDialog destrutivo
          dirigido pelo snapshot — resiliente ao fechamento do modal. */}
      {cancelDialog}
    </>
  )
}
