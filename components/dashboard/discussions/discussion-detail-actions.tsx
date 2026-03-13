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
import { updateDiscussionStatusAction, deleteDiscussionAction } from "@/actions"
import { LockIcon, UnlockIcon, Trash2Icon } from "lucide-react"

type DiscussionDetailActionsProps = {
  discussionId: string
  status: "active" | "closed"
}

export function DiscussionDetailActions({
  discussionId,
  status,
}: DiscussionDetailActionsProps) {
  const router = useRouter()
  const [isPendingStatus, startTransitionStatus] = useTransition()
  const [isPendingDelete, startTransitionDelete] = useTransition()
  const [reopenOpen, setReopenOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleCloseDiscussion() {
    startTransitionStatus(async () => {
      await updateDiscussionStatusAction(discussionId, "closed")
    })
  }

  function handleReopenDiscussion() {
    startTransitionStatus(async () => {
      const result = await updateDiscussionStatusAction(discussionId, "active")
      if (result.ok) setReopenOpen(false)
    })
  }

  function handleDeleteDiscussion() {
    setDeleteError(null)
    startTransitionDelete(async () => {
      const result = await deleteDiscussionAction(discussionId)
      if (result?.ok) {
        setDeleteOpen(false)
        router.push("/dashboard/discussions")
      } else if (result && !result.ok) {
        setDeleteError(result.error ?? "Erro ao excluir.")
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
              Encerrar discussão
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Encerrar discussão?</AlertDialogTitle>
              <AlertDialogDescription>
                A discussão será marcada como encerrada. Você poderá reabri-la depois.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleCloseDiscussion}>
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
              Reabrir discussão
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reabrir esta discussão?</AlertDialogTitle>
              <AlertDialogDescription>
                Ao reabrir, a outra discussão ativa (se houver) será encerrada.
                Deseja continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleReopenDiscussion}>
                Reabrir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open)
          if (!open) setDeleteError(null)
        }}
      >
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={isPendingDelete}
          >
            <Trash2Icon className="h-4 w-4" />
            Excluir discussão
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir discussão?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. As mensagens da discussão serão
              removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPendingDelete}>
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isPendingDelete}
              onClick={handleDeleteDiscussion}
            >
              {isPendingDelete ? "Excluindo…" : "Excluir"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
