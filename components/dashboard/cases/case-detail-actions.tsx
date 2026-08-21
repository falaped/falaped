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
}

export function CaseDetailActions({
  caseId,
  status,
  layout = "inline",
  onRequestCloseCase,
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
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPendingDelete}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isPendingDelete}
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
