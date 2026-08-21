"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { BanIcon } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { formatCentsToBRL } from "@/lib/formatters"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { restoreFinancialEntryAction, voidFinancialEntryAction } from "@/actions"

type VoidEntryButtonProps = {
  entryId: string
  /** Caso do lançamento, ou `null` no avulso. Serve só ao alvo de revalidação. */
  caseId: string | null
  amountCents: number
  /** `received_on` cru (`yyyy-MM-dd`). O rótulo sai de fatias da string, sem construir data. */
  receivedOn: string
}

/**
 * A anulação de um lançamento (EARN-05), compartilhada pelo painel de Ganhos e pelo card
 * de ganhos dentro do caso — UM componente serve as duas superfícies.
 *
 * O "Desfazer" do toast é um round-trip REAL de servidor (um segundo action gateado), não
 * um rollback em memória: anular é um UPDATE de uma coluna, então há o que restaurar no
 * banco. A janela é a vida do toast e NADA expira do lado do servidor (D-22) — passada a
 * janela o botão simplesmente não está mais na tela, e a anulação ficou definitiva na
 * prática sem nenhum timer nem coluna de validade.
 *
 * ⚠️ `duration: 8000` é uma DEVIAÇÃO deliberada, introduzida nesta fase: nenhum toast do
 * repo passa duração, e a janela real da agenda é o default da biblioteca (~4 s). Quatro
 * segundos não dão tempo de notar um valor errado, ler e decidir — e isto é uma correção
 * financeira. Não citar como padrão do repo.
 */
export function VoidEntryButton({
  entryId,
  caseId,
  amountCents,
  receivedOn,
}: VoidEntryButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const amountLabel = formatCentsToBRL(amountCents)
  const dateLabel = `${receivedOn.slice(8, 10)}/${receivedOn.slice(5, 7)}/${receivedOn.slice(0, 4)}`

  function handleUndo() {
    void (async () => {
      const undo = await restoreFinancialEntryAction(entryId, caseId)
      if (undo.ok) {
        toast.success("Anulação desfeita.")
        router.refresh()
      } else {
        toast.error(getFriendlyToastMessage(undo.error))
      }
    })()
  }

  function handleVoid() {
    startTransition(async () => {
      const result = await voidFinancialEntryAction(entryId, caseId)
      if (!result.ok) {
        toast.error(getFriendlyToastMessage(result.error))
        return
      }
      setOpen(false)
      toast.success("Lançamento anulado.", {
        duration: 8000,
        action: { label: "Desfazer", onClick: handleUndo },
      })
      router.refresh()
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Anular lançamento"
          disabled={isPending}
        >
          <BanIcon className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Anular lançamento?</AlertDialogTitle>
          <AlertDialogDescription>
            O lançamento de {amountLabel} de {dateLabel} sai dos totais e da média. O
            lançamento continua registrado para auditoria — você não pode editar valores,
            só anular e lançar de novo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <Button variant="destructive" disabled={isPending} onClick={handleVoid}>
            {isPending ? "Anulando…" : "Anular"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
