"use client"

import { useState } from "react"
import { WalletIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CloseCaseWithEarningsDialog } from "@/components/dashboard/cases/close-case-with-earnings-dialog"

type CasePendingEarningsCardProps = {
  caseId: string
  /** Hoje no fuso da clínica, formatado no RSC — o cliente nunca deriva datas. */
  todayLabel: string
}

/**
 * Convite a lançar o faturamento de um caso ENCERRADO que não tem lançamento não-anulado.
 *
 * Por que existe: a pergunta "o que foi cobrado?" estava amarrada ao EVENTO de
 * encerramento, e só a um dos quatro caminhos que encerram um caso. Os outros três —
 * o assistente (`sendCaseAssistantMessageAction`, intent `confirm_close_case`), abrir um
 * novo atendimento sobre o ativo (`createDashboardCaseWithPatient`) e qualquer chamada
 * direta de `updateCaseStatusAction(id, "closed")` — rodam no servidor, onde não existe
 * cliente para abrir modal. O caso encerrava e o faturamento nunca era perguntado.
 *
 * Ancorar no ESTADO em vez do evento cobre os quatro de uma vez, e resolve de graça um
 * segundo furo: dispensar a etapa 2 é cortesia (D-09) e portanto permitido, mas até aqui
 * era IRREVERSÍVEL — não havia nenhuma volta para lançar depois.
 *
 * Não aparece quando a leitura dos totais falha (`earningsTotals == null` no RSC): nesse
 * caso não se sabe se o caso tem lançamento, e convidar a lançar poderia gerar duplicata.
 * Fail-closed, igual ao bloqueio do diálogo de exclusão (S7).
 */
export function CasePendingEarningsCard({
  caseId,
  todayLabel,
}: CasePendingEarningsCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-dashed border-border p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <WalletIcon
            className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">Nenhum lançamento neste atendimento</p>
            <p className="text-sm text-muted-foreground">
              Registre o valor da consulta e os procedimentos realizados. Se foi cortesia,
              deixe como está.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          Lançar o que foi cobrado
        </Button>
      </div>
      <CloseCaseWithEarningsDialog
        caseId={caseId}
        open={open}
        onOpenChange={setOpen}
        todayLabel={todayLabel}
        mode="earnings"
      />
    </div>
  )
}
