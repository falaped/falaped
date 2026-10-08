"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteCaseAction } from "@/actions"
import { formatCentsToBRL } from "@/lib/formatters"

type CaseDetailActionsProps = {
  caseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Lançamentos NÃO-anulados do caso e quanto somam. `> 0` = aviso do que a exclusão vai
   * APAGAR junto (a FK é `on delete cascade`). `null` = a leitura falhou, e aí a exclusão
   * é BLOQUEADA: sem poder dizer o que será apagado não há consentimento informado.
   */
  earningsCount?: number | null
  earningsTotalCents?: number | null
}

/** Confirmação de excluir a consulta, aberta pelo ⋯ do cabeçalho. */
export function CaseDetailActions({
  caseId,
  open,
  onOpenChange,
  earningsCount = 0,
  earningsTotalCents = 0,
}: CaseDetailActionsProps) {
  const router = useRouter()
  const [isPendingDelete, startTransitionDelete] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleDeleteCase() {
    setDeleteError(null)
    startTransitionDelete(async () => {
      const result = await deleteCaseAction(caseId)
      if (result?.ok) {
        onOpenChange(false)
        router.push("/dashboard/cases")
      } else if (result && !result.ok) {
        setDeleteError(result.error ?? "Erro ao excluir.")
      }
    })
  }

  // `financial_entries.case_id` é `on delete cascade`: apagar o caso APAGA os lançamentos
  // dele. Então este bloco não bloqueia mais — ele AVISA o que vai ser destruído, porque
  // é irreversível e sai dos totais do painel, inclusive de meses já fechados.
  //
  // `null` (leitura falhou) continua BLOQUEANDO: sem saber quanto de faturamento está
  // pendurado no caso, não há consentimento informado possível — o médico clicaria em
  // "Excluir" sem que ninguém pudesse dizer o que ele está apagando.
  const earningsUnknown = earningsCount === null
  const hasEarnings = earningsCount !== null && earningsCount > 0

  return (
      <AlertDialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) setDeleteError(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir consulta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O relatório, a conversa e os
              lembretes desta consulta serão apagados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {(earningsUnknown || hasEarnings) && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm">
              {earningsUnknown ? (
                <p className="font-semibold text-destructive">
                  Não foi possível verificar os lançamentos deste caso. Tente novamente.
                </p>
              ) : (
                <>
                  <p className="font-semibold text-destructive">
                    {earningsCount === 1
                      ? "1 lançamento no livro-caixa será apagado junto."
                      : `${earningsCount} lançamentos no livro-caixa serão apagados junto.`}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Somam{" "}
                    <span className="font-medium tabular-nums text-foreground">
                      {formatCentsToBRL(earningsTotalCents ?? 0)}
                    </span>{" "}
                    e saem dos totais de Ganhos — inclusive de meses já fechados. Não há
                    como recuperar.
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Se você só quer corrigir um valor, anule o lançamento em Ganhos em vez
                    de excluir o caso.
                  </p>
                </>
              )}
            </div>
          )}
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPendingDelete}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isPendingDelete || earningsUnknown}
              onClick={handleDeleteCase}
            >
              {isPendingDelete ? "Excluindo…" : "Excluir"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
  )
}
