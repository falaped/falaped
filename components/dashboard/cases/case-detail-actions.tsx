"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { updateCaseStatusAction, deleteCaseAction } from "@/actions"
import { formatCentsToBRL } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { LockIcon, UnlockIcon, Trash2Icon } from "lucide-react"

type CaseDetailActionsProps = {
  caseId: string
  status: "active" | "closed"
  /** Vertical stack for popover / narrow menus. */
  layout?: "inline" | "menu"
  /**
   * Abre o fluxo de encerramento, que vive FORA deste componente: o diálogo é irmão do
   * popover, porque `PopoverContent` desmonta ao fechar e levaria o form com ele.
   */
  onRequestCloseCase?: () => void
  /**
   * Lançamentos NÃO-anulados do caso e quanto somam. `null` = a leitura falhou, e a
   * exclusão é BLOQUEADA — jamais prosseguir sem poder verificar (S7 partial).
   */
  earningsCount?: number | null
  earningsTotalCents?: number | null
}

export function CaseDetailActions({
  caseId,
  status,
  layout = "inline",
  onRequestCloseCase,
  earningsCount = 0,
  earningsTotalCents = 0,
}: CaseDetailActionsProps) {
  const router = useRouter()
  const [isPendingStatus, startTransitionStatus] = useTransition()
  const [isPendingDelete, startTransitionDelete] = useTransition()
  const [reopenOpen, setReopenOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleReopenCase() {
    startTransitionStatus(async () => {
      const result = await updateCaseStatusAction(caseId, "active")
      if (result.ok) setReopenOpen(false)
    })
  }

  function handleDeleteCase() {
    setDeleteError(null)
    startTransitionDelete(async () => {
      const result = await deleteCaseAction(caseId)
      if (result?.ok) {
        setDeleteOpen(false)
        router.push("/dashboard/cases")
      } else if (result && !result.ok) {
        setDeleteError(result.error ?? "Erro ao excluir.")
      }
    })
  }

  const menu = layout === "menu"

  // `financial_entries.case_id` é `on delete restrict` (D-26 revisada): o BANCO recusa
  // apagar um caso que tenha lançamento, então este bloco informa e BLOQUEIA — não
  // promete uma exclusão que o Postgres vai negar. `null` (leitura falhou) também
  // bloqueia: prosseguir sem poder verificar seria decidir no escuro.
  const earningsUnknown = earningsCount === null
  const hasEarnings = earningsCount !== null && earningsCount > 0
  const deleteBlocked = earningsUnknown || hasEarnings

  return (
    <div
      className={cn(
        menu ? "flex w-full flex-col gap-2" : "flex flex-wrap items-center gap-2",
      )}
    >
      {status === "active" ? (
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2", menu && "w-full justify-start")}
          disabled={isPendingStatus}
          onClick={onRequestCloseCase}
        >
          <LockIcon className="h-4 w-4" />
          Encerrar caso
        </Button>
      ) : (
        <AlertDialog open={reopenOpen} onOpenChange={setReopenOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn("gap-2", menu && "w-full justify-start")}
              disabled={isPendingStatus}
            >
              <UnlockIcon className="h-4 w-4" />
              Reabrir caso
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reabrir este caso?</AlertDialogTitle>
              <AlertDialogDescription>
                Ao reabrir este caso, o outro caso ativo (se houver) será
                encerrado. Deseja continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleReopenCase}>
                Reabrir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); if (!open) setDeleteError(null); }}>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive",
              menu && "w-full justify-start",
            )}
            disabled={isPendingDelete}
          >
            <Trash2Icon className="h-4 w-4" />
            Excluir caso
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir caso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. As mensagens do caso serão
              removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteBlocked && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm">
              {earningsUnknown ? (
                <p className="font-semibold text-destructive">
                  Não foi possível verificar os lançamentos deste caso. Tente novamente.
                </p>
              ) : (
                <>
                  <p className="font-semibold text-destructive">
                    {earningsCount === 1
                      ? "Este caso tem 1 lançamento no livro-caixa."
                      : `Este caso tem ${earningsCount} lançamentos no livro-caixa.`}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Somam{" "}
                    <span className="font-medium tabular-nums text-foreground">
                      {formatCentsToBRL(earningsTotalCents ?? 0)}
                    </span>{" "}
                    e o faturamento fica registrado para auditoria — inclusive de meses já
                    fechados. Por isso este caso não pode ser excluído.
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
              disabled={isPendingDelete || deleteBlocked}
              onClick={handleDeleteCase}
            >
              {isPendingDelete ? "Excluindo…" : "Excluir"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
