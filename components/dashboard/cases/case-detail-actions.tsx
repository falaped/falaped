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
   * Lançamentos NÃO-anulados do caso e quanto somam. `> 0` = aviso do que a exclusão vai
   * APAGAR junto (a FK é `on delete cascade`). `null` = a leitura falhou, e aí a exclusão
   * é BLOQUEADA: sem poder dizer o que será apagado não há consentimento informado.
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
    </div>
  )
}
