"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"
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
import { cn } from "@/lib/utils"
import {
  APPOINTMENT_STATUS_STYLE,
  type CellAppointment,
} from "./appointment-status-style"
import { type MenuAnchor } from "./calendar-day-week-grid"

/**
 * Cria uma âncora VIRTUAL (retângulo 0×0) na coordenada do clique — mesmo padrão
 * de `availability-cell-menu.tsx` — para posicionar o popover no ponto exato.
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
  const measurable = { getBoundingClientRect: () => rect }
  return { current: measurable } as React.RefObject<typeof measurable>
}

const MENU_ITEM =
  "focus:bg-accent focus:text-accent-foreground flex min-h-11 w-full cursor-default items-center gap-1.5 rounded-md px-2 py-2 text-sm outline-hidden select-none [&_svg]:size-4 [&_svg]:shrink-0"

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
 * Detalhe + menu de transição de status de uma consulta (APPT-02 / D-06).
 *
 * Popover controlado com âncora virtual no ponto do clique. Confirmada expõe só
 * as transições LEGAIS (Marcar como realizada · Marcar falta · Cancelar consulta
 * via AlertDialog destrutivo). Estados finais (realizada/falta/cancelada) são
 * READ-ONLY: badge + paciente + horário, sem itens de transição. Pendente expõe
 * Confirmar (pending→confirmed) e Recusar (pending→canceled) direto no menu (E-5).
 * Tokens oklch, copy PT-BR verbatim do UI-SPEC.
 */
/**
 * Snapshot da consulta capturado no instante em que uma transição é INICIADA.
 * Torna o fluxo RESILIENTE ao fechamento do Popover: ao abrir o AlertDialog de
 * cancelar, o Popover dispara onOpenChange(false) → o pai zera `detail` → a prop
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

export function AppointmentDetailMenu({
  appointment,
  anchor,
  onOpenChange,
}: {
  appointment: CellAppointment | null
  anchor: MenuAnchor | null
  onOpenChange: (open: boolean) => void
}) {
  const [busy, setBusy] = React.useState(false)
  // Cancelar: snapshot que abre o AlertDialog destrutivo (null = fechado).
  const [confirmCancel, setConfirmCancel] =
    React.useState<TransitionSnapshot | null>(null)

  const open = appointment !== null
  const anchorRef = virtualAnchorRef(anchor)

  /**
   * Executa a transição a partir de um SNAPSHOT (não da prop live `appointment`),
   * imune ao fechamento do Popover / prop virando null no meio da confirmação.
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
  // sobreviver a `appointment === null`: ao abrir, o Popover fecha e o pai zera
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

  // Sem consulta selecionada: o Popover não renderiza, MAS o AlertDialog de
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
      <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
        {anchorRef ? <PopoverPrimitive.Anchor virtualRef={anchorRef} /> : null}
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            side="right"
            sideOffset={4}
            className="z-50 w-64 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-md outline-hidden"
          >
            {/* Detalhe: paciente + responsável + horário + badge de status. */}
            <div className="flex flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-base font-medium">
                  {appointment.patientName}
                </p>
                <Badge
                  variant={BADGE_VARIANT[appointment.status]}
                  className={cn(
                    appointment.status === "pending" && "text-primary",
                    appointment.status === "canceled" &&
                      "text-muted-foreground",
                  )}
                >
                  {style.label}
                </Badge>
              </div>
              {appointment.responsible ? (
                <p className="truncate text-sm text-muted-foreground">
                  {appointment.responsible}
                </p>
              ) : null}
              <p className="text-sm text-muted-foreground">
                {appointment.dateLabel} · {appointment.timeLabel}
              </p>
            </div>

            {/* Transições LEGAIS. Pendente: Confirmar/Recusar (E-5). Confirmada:
                realizada/falta/cancelar. Finais: nenhum item (D-06). */}
            {isPending ? (
              <div className="mt-2 flex flex-col border-t border-border pt-2">
                <button
                  type="button"
                  className={MENU_ITEM}
                  disabled={busy}
                  onClick={() =>
                    runTransition(
                      snapshotFor("confirmed", "Consulta confirmada."),
                    )
                  }
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  className={cn(MENU_ITEM, "text-destructive focus:text-destructive")}
                  disabled={busy}
                  onClick={() =>
                    setConfirmCancel(
                      snapshotFor("canceled", "Consulta recusada."),
                    )
                  }
                >
                  Recusar
                </button>
              </div>
            ) : isConfirmed ? (
              <div className="mt-2 flex flex-col border-t border-border pt-2">
                <button
                  type="button"
                  className={MENU_ITEM}
                  disabled={busy}
                  onClick={() =>
                    runTransition(
                      snapshotFor("done", "Consulta marcada como realizada."),
                    )
                  }
                >
                  Marcar como realizada
                </button>
                <button
                  type="button"
                  className={MENU_ITEM}
                  disabled={busy}
                  onClick={() =>
                    runTransition(snapshotFor("no_show", "Falta registrada."))
                  }
                >
                  Marcar falta
                </button>
                <button
                  type="button"
                  className={cn(MENU_ITEM, "text-destructive focus:text-destructive")}
                  disabled={busy}
                  onClick={() =>
                    setConfirmCancel(
                      snapshotFor("canceled", "Consulta cancelada."),
                    )
                  }
                >
                  Cancelar consulta
                </button>
              </div>
            ) : isFinal ? (
              <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
                Consulta finalizada — sem outras ações.
              </p>
            ) : null}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      {/* Cancelar consulta (confirmed → canceled): AlertDialog destrutivo
          dirigido pelo snapshot — resiliente ao fechamento do Popover. */}
      {cancelDialog}
    </>
  )
}
