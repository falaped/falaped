"use client"

import { useState } from "react"
import { HistoryIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatDate } from "@/lib/formatters"
import type { CaseCarryover } from "@/modules/cases/get-previous-case-carryover"

type PreviousCaseSummaryDialogProps = {
  carryover: CaseCarryover
  patientName: string
}

/**
 * Abre sozinho ao entrar no atendimento e mostra o que a consulta anterior
 * deixou: o mini resumo e os lembretes escritos pelo médico.
 *
 * Só é renderizado quando há de fato resumo ou lembrete (quem filtra é
 * `getPreviousCaseCarryover`) e quando a consulta está ATIVA — abrir um caso
 * antigo para consultar não é "começar a próxima consulta".
 */
export function PreviousCaseSummaryDialog({
  carryover,
  patientName,
}: PreviousCaseSummaryDialogProps) {
  const [open, setOpen] = useState(true)
  const dateLabel = formatDate(carryover.endedAt ?? carryover.startedAt)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HistoryIcon className="h-4 w-4" aria-hidden />
            Última consulta de {patientName}
          </DialogTitle>
          <DialogDescription>
            Atendimento de {dateLabel}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {carryover.summary ? (
            <div>
              <p className="mb-1 text-sm font-medium">Resumo</p>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {carryover.summary}
              </p>
            </div>
          ) : null}

          {carryover.reminders.length > 0 ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="mb-2 text-sm font-medium">
                Lembretes deixados por você
              </p>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
                {carryover.reminders.map((reminder, index) => (
                  <li key={index} className="wrap-break-word">
                    {reminder}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => setOpen(false)}>
            Começar a consulta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
