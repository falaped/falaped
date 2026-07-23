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
  type MenuAnchor,
} from "./calendar-day-week-grid"

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
 * READ-ONLY: badge + paciente + horário, sem itens de transição. Pendente é
 * acionada pelo painel "Pedidos a confirmar" (não expõe menu aqui, exceto o
 * detalhe). Tokens oklch, copy PT-BR verbatim do UI-SPEC.
 */
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
  const [confirmCancel, setConfirmCancel] = React.useState(false)

  const open = appointment !== null
  const anchorRef = virtualAnchorRef(anchor)

  const runTransition = React.useCallback(
    async (from: AppointmentStatus, to: AppointmentStatus, successMsg: string) => {
      if (!appointment) return
      setBusy(true)
      const result = await transitionAppointmentStatusAction({
        id: appointment.id,
        from,
        to,
      })
      setBusy(false)
      if (result.ok) {
        toast.success(successMsg)
        onOpenChange(false)
      } else {
        toast.error(result.error)
      }
    },
    [appointment, onOpenChange],
  )

  if (!appointment) return null

  const style = APPOINTMENT_STATUS_STYLE[appointment.status]
  const isFinal = FINAL_STATUSES.includes(appointment.status)
  const isConfirmed = appointment.status === "confirmed"

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

            {/* Transições LEGAIS (só Confirmada). Finais: nenhum item (D-06). */}
            {isConfirmed ? (
              <div className="mt-2 flex flex-col border-t border-border pt-2">
                <button
                  type="button"
                  className={MENU_ITEM}
                  disabled={busy}
                  onClick={() =>
                    runTransition("confirmed", "done", "Consulta marcada como realizada.")
                  }
                >
                  Marcar como realizada
                </button>
                <button
                  type="button"
                  className={MENU_ITEM}
                  disabled={busy}
                  onClick={() =>
                    runTransition("confirmed", "no_show", "Falta registrada.")
                  }
                >
                  Marcar falta
                </button>
                <button
                  type="button"
                  className={cn(MENU_ITEM, "text-destructive focus:text-destructive")}
                  disabled={busy}
                  onClick={() => setConfirmCancel(true)}
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

      {/* Cancelar consulta (confirmed → canceled): AlertDialog destrutivo. */}
      <AlertDialog
        open={confirmCancel}
        onOpenChange={(o) => {
          if (!o) setConfirmCancel(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esta consulta?</AlertDialogTitle>
            <AlertDialogDescription>
              {`A consulta de ${appointment.patientName} em ${appointment.dateLabel} ${appointment.timeLabel} será cancelada e o horário liberado. Esta ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmCancel(false)}>
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setConfirmCancel(false)
                runTransition("confirmed", "canceled", "Consulta cancelada.")
              }}
            >
              Cancelar consulta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
