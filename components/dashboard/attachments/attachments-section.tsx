"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Download, Loader2, Paperclip, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"

import {
  deleteAttachmentAction,
  getAttachmentDownloadUrlAction,
  uploadAttachmentAction,
} from "@/actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PATIENT_ATTACHMENT_MAX_BYTES } from "@/lib/constants"
import { formatDateTime } from "@/lib/formatters"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import type { PatientAttachment } from "@/modules/patient-attachments/types"

type AttachmentsSectionProps = {
  patientId: string
  /** Atendimento em curso; null na ficha do paciente. */
  caseId?: string | null
  attachments: PatientAttachment[]
  title?: string
  description?: string
}

/** Tamanho legível. KB/MB bastam: o teto por anexo é 20 MB. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentsSection({
  patientId,
  caseId = null,
  attachments,
  title = "Anexos",
  description = "Exames, laudos e outros arquivos guardados na ficha da criança.",
}: AttachmentsSectionProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    // Limpa o input já: sem isso, reenviar o MESMO arquivo depois de um erro não
    // dispara change de novo e a tela parece travada.
    event.target.value = ""
    if (!file) return

    if (file.size > PATIENT_ATTACHMENT_MAX_BYTES) {
      toast.error("Arquivo muito grande. O limite por anexo é de 20 MB.")
      return
    }

    const formData = new FormData()
    formData.set("patientId", patientId)
    if (caseId) formData.set("caseId", caseId)
    formData.set("file", file)

    setIsUploading(true)
    try {
      const result = await uploadAttachmentAction(formData)
      if (result.ok) {
        toast.success("Arquivo anexado.")
        router.refresh()
      } else {
        toast.error(getFriendlyToastMessage(result.error))
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao anexar o arquivo. Tente novamente."
      toast.error(getFriendlyToastMessage(message))
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDownload(id: string) {
    setBusyId(id)
    try {
      const result = await getAttachmentDownloadUrlAction(id)
      if (result.ok) {
        window.open(result.url, "_blank", "noopener,noreferrer")
      } else {
        toast.error(getFriendlyToastMessage(result.error))
      }
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id)
    try {
      const result = await deleteAttachmentAction(id)
      if (result.ok) {
        toast.success("Anexo apagado.")
        router.refresh()
      } else {
        toast.error(getFriendlyToastMessage(result.error))
      }
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Card className="border-border/80">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-3">
        <div className="min-w-0">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Upload className="h-4 w-4" aria-hidden />
            )}
            Anexar arquivo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {attachments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Paperclip
                className="h-6 w-6 text-muted-foreground"
                aria-hidden
              />
            </div>
            <p className="mt-4 font-medium text-muted-foreground">
              Nenhum arquivo anexado
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground/80">
              Qualquer tipo de arquivo, até 20 MB cada. Fica guardado na ficha e
              só você tem acesso.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {attachments.map((attachment) => (
              <li
                key={attachment.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Paperclip
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="wrap-break-word font-medium">
                      {attachment.file_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatBytes(attachment.size_bytes)} ·{" "}
                      {formatDateTime(attachment.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(attachment.id)}
                    disabled={busyId === attachment.id}
                    aria-label={`Baixar ${attachment.file_name}`}
                  >
                    <Download className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(attachment.id)}
                    disabled={busyId === attachment.id}
                    aria-label={`Apagar ${attachment.file_name}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
