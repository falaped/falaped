"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"

import { updateCaseStatusAction } from "@/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

/** Confirmação de reabertura, compartilhada pelo menu Ações e pelo card de status. */
export function ReopenCaseDialog({
  caseId,
  open,
  onOpenChange,
}: {
  caseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleReopen() {
    startTransition(async () => {
      const result = await updateCaseStatusAction(caseId, "active")
      if (result.ok) {
        onOpenChange(false)
        router.refresh()
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reabrir este caso?</AlertDialogTitle>
          <AlertDialogDescription>
            Ao reabrir este caso, o outro caso ativo (se houver) será
            encerrado. Deseja continuar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={handleReopen}>
            Reabrir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
