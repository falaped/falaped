"use client"

import * as React from "react"
import { toast } from "sonner"

import { transitionAppointmentStatusAction } from "@/actions"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Um pedido pendente (pending) para a fila "Pedidos a confirmar". Os rótulos
 * {data}/{horário} já vêm formatados no fuso da clínica pelo pai.
 */
export type PendingRequest = {
  /** id da consulta (para a transição). */
  id: string
  /** Nome do paciente (text-base). */
  patientName: string
  /** Responsável (text-sm muted); pode faltar. */
  responsible: string | null
  /** Rótulo PT-BR da data (ex.: "12/08"). */
  dateLabel: string
  /** Rótulo PT-BR do horário (ex.: "14:00"). */
  timeLabel: string
}

/**
 * Painel "Pedidos a confirmar" (APPT-03, D-05): fila acionável dos pedidos
 * `pending`. Confirmar → pending→confirmed; Recusar → pending→canceled (libera o
 * horário) via AlertDialog destrutivo. Ambos chamam transitionAppointmentStatusAction.
 * Estado vazio no padrão dashed-border. Tokens oklch, copy PT-BR verbatim do UI-SPEC.
 * Controles ≥44px em um eixo (Button size default satisfaz a altura).
 */
export function PendingRequestsPanel({
  requests,
}: {
  requests: PendingRequest[]
}) {
  // Pedido em processo de recusa (abre o AlertDialog destrutivo).
  const [toReject, setToReject] = React.useState<PendingRequest | null>(null)
  // ids em transição (desabilita os botões da linha).
  const [pendingIds, setPendingIds] = React.useState<Set<string>>(new Set())

  const setBusy = React.useCallback((id: string, busy: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev)
      if (busy) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const handleConfirm = React.useCallback(
    async (request: PendingRequest) => {
      setBusy(request.id, true)
      const result = await transitionAppointmentStatusAction({
        id: request.id,
        from: "pending",
        to: "confirmed",
      })
      setBusy(request.id, false)
      if (result.ok) {
        toast.success("Pedido confirmado.")
      } else {
        toast.error(result.error)
      }
    },
    [setBusy],
  )

  const handleReject = React.useCallback(
    async (request: PendingRequest) => {
      setToReject(null)
      setBusy(request.id, true)
      const result = await transitionAppointmentStatusAction({
        id: request.id,
        from: "pending",
        to: "canceled",
      })
      setBusy(request.id, false)
      if (result.ok) {
        toast.success("Pedido recusado.")
      } else {
        toast.error(result.error)
      }
    },
    [setBusy],
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-xl">Pedidos a confirmar</CardTitle>
        {requests.length > 0 ? (
          <Badge variant="outline" className="text-primary">
            {requests.length} pendente(s)
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="text-sm font-medium">Nenhum pedido a confirmar.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Os pedidos de agendamento aparecem aqui quando a assistente marca
              uma consulta.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {requests.map((request) => {
              const busy = pendingIds.has(request.id)
              return (
                <li
                  key={request.id}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium">
                        {request.patientName}
                      </p>
                      {request.responsible ? (
                        <p className="truncate text-sm text-muted-foreground">
                          {request.responsible}
                        </p>
                      ) : null}
                      <p className="text-sm text-muted-foreground">
                        {request.dateLabel} {request.timeLabel}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-primary">
                      Pendente
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="min-h-11 flex-1"
                      disabled={busy}
                      onClick={() => handleConfirm(request)}
                    >
                      Confirmar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="min-h-11 flex-1"
                      disabled={busy}
                      onClick={() => setToReject(request)}
                    >
                      Recusar
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>

      <AlertDialog
        open={toReject !== null}
        onOpenChange={(open) => {
          if (!open) setToReject(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recusar este pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              {toReject
                ? `A consulta de ${toReject.patientName} em ${toReject.dateLabel} ${toReject.timeLabel} será cancelada e o horário liberado. Esta ação não pode ser desfeita.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setToReject(null)}>
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (toReject) handleReject(toReject)
              }}
            >
              Recusar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
