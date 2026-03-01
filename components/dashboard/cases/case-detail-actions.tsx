"use client"

import { useState, useTransition } from "react"
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
import { updateCaseStatusAction } from "@/app/dashboard/cases/actions"
import { deleteCaseAction } from "@/app/dashboard/cases/actions"
import { LockIcon, UnlockIcon, Trash2Icon } from "lucide-react"

type CaseDetailActionsProps = {
  caseId: string
  status: "active" | "closed"
}

export function CaseDetailActions({ caseId, status }: CaseDetailActionsProps) {
  const [isPendingStatus, startTransitionStatus] = useTransition()
  const [isPendingDelete, startTransitionDelete] = useTransition()
  const [reopenOpen, setReopenOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleCloseCase() {
    startTransitionStatus(async () => {
      await updateCaseStatusAction(caseId, "closed")
    })
  }

  function handleReopenCase() {
    startTransitionStatus(async () => {
      const result = await updateCaseStatusAction(caseId, "active")
      if (result.ok) setReopenOpen(false)
    })
  }

  function handleDeleteCase() {
    setDeleteError(null)
    startTransitionDelete(async () => {
      try {
        const result = await deleteCaseAction(caseId)
        if (result?.ok) {
          setDeleteOpen(false)
        } else if (result && !result.ok) {
          setDeleteError(result.error ?? "Erro ao excluir.")
        }
      } catch {
        // redirect() throws on success; do not set error
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "active" ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={isPendingStatus}
            >
              <LockIcon className="h-4 w-4" />
              Encerrar caso
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Encerrar caso?</AlertDialogTitle>
              <AlertDialogDescription>
                O caso será marcado como encerrado. Você poderá reabri-lo depois.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleCloseCase}>
                Encerrar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <AlertDialog open={reopenOpen} onOpenChange={setReopenOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
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
            className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
