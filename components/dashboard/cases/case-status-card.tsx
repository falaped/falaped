"use client"

import { useState } from "react"
import { LockIcon, UnlockIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CloseCaseWithEarningsDialog } from "@/components/dashboard/cases/close-case-with-earnings-dialog"
import { ReopenCaseDialog } from "@/components/dashboard/cases/reopen-case-dialog"

/**
 * Card em cinza claro na seção Atendimento: encerra o caso ativo (com a etapa
 * de ganhos) ou reabre o encerrado.
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
        <Card className="h-full bg-muted transition-colors group-hover:bg-muted/70">
          <CardHeader className="flex flex-row items-center gap-2.5 space-y-0">
            <Icon className="h-5 w-5" aria-hidden />
            <CardTitle className="text-base font-semibold">
              {isActive ? "Encerrar caso" : "Reabrir caso"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
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
