"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownIcon, CircleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { markCaseEarningsPromptedAction } from "@/actions"
import { LaunchEarningsButton } from "@/components/dashboard/cases/launch-earnings-button"
import { Button } from "@/components/ui/button"

/**
 * O que ficou por fechar na consulta encerrada (protótipo b2p). É por aqui que a Home
 * chega ("Finalizar", "Lançar valor"); cada linha traz a ação que a resolve e some
 * quando resolvida. O relatório só aponta para baixo: a ação dele mora nele.
 */
export function CasePendingStrip({
  caseId,
  todayLabel,
  reportDraft,
  billingPending,
}: {
  caseId: string
  todayLabel: string
  reportDraft: boolean
  billingPending: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const count = Number(reportDraft) + Number(billingPending)
  if (count === 0) return null

  function markCourtesy() {
    startTransition(async () => {
      const result = await markCaseEarningsPromptedAction(caseId)
      if (!result.ok) {
        toast.error("Não foi possível registrar. Tente novamente.")
        return
      }
      toast.success("Registrado como cortesia.")
      router.refresh()
    })
  }

  return (
    <section className="rounded-xl border border-warning-border bg-warning-soft/40">
      <div className="flex items-center gap-2 px-5 pt-4 pb-2">
        <CircleAlertIcon className="size-4 text-warning-text" aria-hidden />
        <h2 className="font-display text-title font-semibold">
          Falta fechar {count === 1 ? "1 coisa" : `${count} coisas`} desta consulta
        </h2>
      </div>
      <div className="divide-y divide-warning-border/60 border-t border-warning-border/60">
        {reportDraft ? (
          <div className="flex items-center gap-4 px-5 py-3">
            <div className="flex-1">
              <div className="font-medium">Relatório em rascunho</div>
              <div className="text-caption text-muted-foreground">Confira o texto logo abaixo e finalize.</div>
            </div>
            <ArrowDownIcon className="size-4 text-subtle-foreground" aria-hidden />
          </div>
        ) : null}
        {billingPending ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
            <div className="flex-1">
              <div className="font-medium">Cobrança sem valor</div>
              <div className="text-caption text-muted-foreground">Nada foi lançado nesta consulta.</div>
            </div>
            <Button variant="ghost" size="sm" disabled={isPending} onClick={markCourtesy}>
              Foi cortesia
            </Button>
            <LaunchEarningsButton caseId={caseId} todayLabel={todayLabel} variant="outline" />
          </div>
        ) : null}
      </div>
    </section>
  )
}
