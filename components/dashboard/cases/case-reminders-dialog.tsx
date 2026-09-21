"use client"

import { useState } from "react"
import { NotebookPenIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CaseRemindersForm } from "@/components/dashboard/cases/case-reminders-form"
import type { CaseReminder } from "@/modules/cases/types"

/** Lembretes durante a consulta, sem tirar a conversa da tela. */
export function CaseRemindersDialog({
  caseId,
  initialReminders,
}: {
  caseId: string
  initialReminders: CaseReminder[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <NotebookPenIcon className="h-4 w-4" aria-hidden />
          Lembretes
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Lembretes e pendências</DialogTitle>
          <DialogDescription>
            O que precisa ser retomado na próxima consulta desta criança.
            Aparece na abertura do próximo atendimento.
          </DialogDescription>
        </DialogHeader>
        <CaseRemindersForm caseId={caseId} initialReminders={initialReminders} />
      </DialogContent>
    </Dialog>
  )
}
