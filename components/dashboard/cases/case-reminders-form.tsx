"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { saveCaseRemindersAction } from "@/actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"

type CaseRemindersFormProps = {
  caseId: string
  initialReminders: string | null
  rows?: number
  onSaved?: () => void
}

/**
 * Campo de lembretes do atendimento. Salva por botão, não a cada tecla: é texto
 * escrito no meio da consulta, e autosave por caractere viraria uma escrita por
 * letra durante o atendimento.
 *
 * Vive sozinho para servir os dois lugares onde o médico escreve lembrete — o
 * card da página do caso e o diálogo dentro da consulta — sem duplicar a lógica.
 */
export function CaseRemindersForm({
  caseId,
  initialReminders,
  rows = 4,
  onSaved,
}: CaseRemindersFormProps) {
  const [value, setValue] = useState(initialReminders ?? "")
  const [saved, setSaved] = useState(initialReminders ?? "")
  const [isSaving, setIsSaving] = useState(false)

  const isDirty = value.trim() !== saved.trim()

  async function handleSave() {
    setIsSaving(true)
    try {
      const result = await saveCaseRemindersAction(caseId, value)
      if (result.ok) {
        setSaved(value)
        toast.success("Lembretes salvos.")
        onSaved?.()
      } else {
        toast.error(getFriendlyToastMessage(result.error))
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao salvar os lembretes. Tente novamente."
      toast.error(getFriendlyToastMessage(message))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={rows}
        maxLength={4000}
        placeholder="Ex.: reavaliar em 15 dias; trazer resultado do hemograma; mãe relatou dificuldade com a mamada."
      />
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : null}
          {isDirty ? "Salvar lembretes" : "Salvo"}
        </Button>
      </div>
    </div>
  )
}
