"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { CloseCaseWithEarningsDialog } from "@/components/dashboard/cases/close-case-with-earnings-dialog"

/**
 * "Lançar valor" de uma consulta ENCERRADA sem lançamento não-anulado.
 *
 * A pergunta "o que foi cobrado?" fica ancorada no ESTADO, não no evento de encerrar:
 * três dos quatro caminhos que encerram um caso (assistente, novo atendimento sobre o
 * ativo, chamada direta de `updateCaseStatusAction`) rodam no servidor e nunca abrem o
 * diálogo. E dispensar como cortesia deixa de ser irreversível: dá para lançar depois.
 */
export function LaunchEarningsButton({
  caseId,
  todayLabel,
  variant = "default",
}: {
  caseId: string
  /** Hoje no fuso da clínica, formatado no RSC — o cliente nunca deriva datas. */
  todayLabel: string
  variant?: "default" | "ghost"
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant={variant} size="sm" onClick={() => setOpen(true)}>
        Lançar valor
      </Button>
      <CloseCaseWithEarningsDialog
        caseId={caseId}
        open={open}
        onOpenChange={setOpen}
        todayLabel={todayLabel}
        mode="earnings"
      />
    </>
  )
}
