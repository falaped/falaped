"use client"

import { CheckIcon } from "lucide-react"

import { EarningsTable } from "@/components/dashboard/earnings/earnings-table"
import { StandaloneEntryDialog } from "@/components/dashboard/earnings/standalone-entry-dialog"
import { LaunchEarningsButton } from "@/components/dashboard/cases/launch-earnings-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { formatCentsToBRL, formatDate } from "@/lib/formatters"
import { PAYMENT_METHOD_LABEL } from "@/lib/schemas/financial-entry"
import type { FinancialEntryListRow } from "@/modules/financial-entries/list-financial-entries"

type CaseBillingCardProps = {
  caseId: string
  /** Hoje no fuso da clínica, formatado no RSC — o cliente nunca deriva datas. */
  todayLabel: string
  /** Os lançamentos do caso, anulados INCLUSOS e já ordenados pelo SQL. */
  entries: FinancialEntryListRow[]
  /** Contagem e soma dos NÃO-anulados, somadas no servidor. `null` = a leitura falhou. */
  totals: { count: number; totalCents: number } | null
  /** O médico já respondeu "o que foi cobrado?" (lançou ou dispensou como cortesia). */
  prompted: boolean
}

/**
 * Cobrança da consulta (protótipo b2): quanto entrou, como e quando. "Ajustar" abre a
 * mesma tabela do painel de Ganhos, com anulação e lançamento extra. Este componente
 * não soma dinheiro: o total vem do servidor.
 */
export function CaseBillingCard({ caseId, todayLabel, entries, totals, prompted }: CaseBillingCardProps) {
  const live = entries.filter((entry) => !entry.voided_at)
  const methods = [...new Set(live.map((entry) => PAYMENT_METHOD_LABEL[entry.payment_method]))]
  const lastReceived = live.map((entry) => entry.received_on).sort().at(-1)

  // Leitura falhou: não convida a lançar, para não arriscar duplicata (fail-closed).
  if (totals == null) {
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-title font-semibold">Cobrança</h2>
        <p className="mt-2 text-muted-foreground">Não foi possível carregar a cobrança agora.</p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-title font-semibold">Cobrança</h2>
        {totals.count > 0 ? (
          <Badge variant="success">
            <CheckIcon aria-hidden />
            Lançado
          </Badge>
        ) : prompted ? (
          <span className="text-muted-foreground">Cortesia</span>
        ) : (
          <Badge variant="warning">Sem valor</Badge>
        )}
        <div className="ml-auto">
          {entries.length > 0 ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">Ajustar</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Cobrança desta consulta</DialogTitle>
                  <DialogDescription>
                    Para corrigir um valor, anule o lançamento e lance de novo.
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-80 overflow-y-auto">
                  <EarningsTable entries={entries} hideCaseLink />
                </div>
                <div className="flex justify-end">
                  <StandaloneEntryDialog
                    todayLabel={todayLabel}
                    caseId={caseId}
                    triggerVariant="outline"
                    triggerSize="sm"
                  />
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <LaunchEarningsButton caseId={caseId} todayLabel={todayLabel} variant={prompted ? "ghost" : "default"} />
          )}
        </div>
      </div>
      {totals.count > 0 ? (
        <>
          <div className="mt-2 font-display text-section font-semibold num">{formatCentsToBRL(totals.totalCents)}</div>
          <div className="text-caption text-subtle-foreground">
            {methods.join(", ")}
            {lastReceived ? <span className="num"> · {formatDate(lastReceived)}</span> : null}
          </div>
        </>
      ) : (
        <p className="mt-2 text-muted-foreground">
          {prompted
            ? "Nada foi cobrado nesta consulta."
            : "Registre o valor da consulta e os procedimentos. Se foi cortesia, deixe como está."}
        </p>
      )}
    </section>
  )
}
