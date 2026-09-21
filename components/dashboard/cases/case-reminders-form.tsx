"use client"

import { useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { addCaseReminderAction, deleteCaseReminderAction } from "@/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import type { CaseReminder } from "@/modules/cases/types"

type CaseRemindersFormProps = {
  caseId: string
  initialReminders: CaseReminder[]
}

/**
 * Lista de lembretes do atendimento, um registro por item: escreve e adiciona,
 * apaga um a um. Apagar É resolver a pendência — o que continua na lista é o
 * que continua em aberto.
 *
 * A lista é local e otimista (a action devolve a linha criada) para o médico
 * poder escrever vários seguidos sem esperar a página revalidar entre um e outro.
 */
export function CaseRemindersForm({
  caseId,
  initialReminders,
}: CaseRemindersFormProps) {
  const [reminders, setReminders] = useState<CaseReminder[]>(initialReminders)
  const [text, setText] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleAdd() {
    const clean = text.trim()
    if (!clean || isSaving) return

    setIsSaving(true)
    try {
      const result = await addCaseReminderAction(caseId, clean)
      if (result.ok) {
        setReminders((prev) => [...prev, result.reminder])
        setText("")
      } else {
        toast.error(getFriendlyToastMessage(result.error))
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao salvar o lembrete. Tente novamente."
      toast.error(getFriendlyToastMessage(message))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const result = await deleteCaseReminderAction(id, caseId)
      if (result.ok) {
        setReminders((prev) => prev.filter((item) => item.id !== id))
      } else {
        toast.error(getFriendlyToastMessage(result.error))
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao apagar o lembrete. Tente novamente."
      toast.error(getFriendlyToastMessage(message))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {reminders.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {reminders.map((reminder) => (
            <li
              key={reminder.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-border px-3 py-2"
            >
              <span className="min-w-0 flex-1 wrap-break-word text-sm">
                {reminder.text}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(reminder.id)}
                disabled={deletingId === reminder.id}
                aria-label={`Apagar lembrete: ${reminder.text}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhum lembrete neste atendimento.
        </p>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={text}
          maxLength={500}
          placeholder="Ex.: reavaliar em 15 dias"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              void handleAdd()
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={!text.trim() || isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="h-4 w-4" aria-hidden />
          )}
          Adicionar
        </Button>
      </div>
    </div>
  )
}
