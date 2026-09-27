"use client"

import { useState } from "react"
import { LockIcon, UnlockIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CloseCaseWithEarningsDialog } from "@/components/dashboard/cases/close-case-with-earnings-dialog"
import { ReopenCaseDialog } from "@/components/dashboard/cases/reopen-case-dialog"

/**
 * Card de destaque na grade de registros: encerra o caso ativo (com a etapa de
 * ganhos) ou reabre o encerrado. Mesmos diálogos do menu Ações.
 */
export function CaseStatusCard({
  caseId,
  status,
  todayLabel,
}: {
  caseId: string
  status: "active" | "closed"
  /** Hoje no fuso da clínica, formatado no RSC — o cliente nunca deriva datas. */
  todayLabel: string
}) {
  const [open, setOpen] = useState(false)
  const isActive = status === "active"
  const Icon = isActive ? LockIcon : UnlockIcon

  return (
    <>
      <button
        type="button"
        className="group h-full text-left"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <Card className="h-full bg-primary text-primary-foreground ring-primary transition-colors group-hover:bg-primary/90">
          <CardHeader className="flex flex-row items-center gap-2.5 space-y-0">
            <Icon className="h-5 w-5" aria-hidden />
            <CardTitle className="text-base font-semibold">
              {isActive ? "Encerrar caso" : "Reabrir caso"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-primary-foreground/80">
              {isActive
                ? "Finaliza o atendimento e registra o que foi cobrado."
                : "Volta a atender esta criança neste mesmo caso."}
            </p>
          </CardContent>
        </Card>
      </button>
      {isActive ? (
        <CloseCaseWithEarningsDialog
          caseId={caseId}
          open={open}
          onOpenChange={setOpen}
          todayLabel={todayLabel}
        />
      ) : (
        <ReopenCaseDialog caseId={caseId} open={open} onOpenChange={setOpen} />
      )}
    </>
  )
}
