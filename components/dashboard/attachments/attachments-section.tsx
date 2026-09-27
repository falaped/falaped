"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Download,
  ExternalLink,
  FlaskConical,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { isInlineViewableMimeType } from "@/lib/attachment-inline-view"
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

const GROUP_ROLE_LABEL: Record<NonNullable<PatientAttachment["group_role"]>, string> = {
  report: "Relatório",
  exam: "Exame",
}

/**
 * Anexos na ordem da lista, mas os que nasceram juntos (leitura de exames,
 * mesmo group_id) viram UM item com os arquivos dentro. Upload avulso segue só.
 */
function groupAttachments(
  attachments: PatientAttachment[],
): Array<{ key: string; items: PatientAttachment[] }> {
  const groups: Array<{ key: string; items: PatientAttachment[] }> = []
  const byGroup = new Map<string, PatientAttachment[]>()
  for (const a of attachments) {
    if (!a.group_id) {
      groups.push({ key: a.id, items: [a] })
      continue
    }
    const existing = byGroup.get(a.group_id)
    if (existing) existing.push(a)
    else {
      const items = [a]
      byGroup.set(a.group_id, items)
      groups.push({ key: a.group_id, items })
    }
  }
  // Dentro do grupo, relatório primeiro.
  for (const g of groups)
    g.items.sort((a, b) => (a.group_role === "report" ? -1 : b.group_role === "report" ? 1 : 0))
  return groups
}

type AttachmentActionsProps = {
  attachment: PatientAttachment
  label: string
  busy: boolean
  onOpen: (id: string, mode: "download" | "inline") => void
  onDelete: (id: string) => void
}

function AttachmentActions({ attachment, label, busy, onOpen, onDelete }: AttachmentActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      {isInlineViewableMimeType(attachment.mime_type) ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onOpen(attachment.id, "inline")}
          disabled={busy}
          aria-label={`Abrir ${label} em outra aba`}
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onOpen(attachment.id, "download")}
        disabled={busy}
        aria-label={`Baixar ${label}`}
      >
        <Download className="h-4 w-4" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onDelete(attachment.id)}
        disabled={busy}
        aria-label={`Apagar ${label}`}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  )
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
  // Arquivo escolhido aguardando o nome. O diálogo só existe enquanto ele existe.
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [attachmentTitle, setAttachmentTitle] = useState("")

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Limpa o input já: sem isso, escolher o MESMO arquivo depois de cancelar
    // não dispara change de novo e a tela parece travada.
    event.target.value = ""
    if (!file) return

    if (file.size > PATIENT_ATTACHMENT_MAX_BYTES) {
      toast.error("Arquivo muito grande. O limite por anexo é de 20 MB.")
      return
    }

    // Nome sugerido: o do arquivo sem a extensão — o médico só ajusta.
    setAttachmentTitle(file.name.replace(/\.[A-Za-z0-9]{1,12}$/, ""))
    setPendingFile(file)
  }

  async function handleConfirmUpload() {
    if (!pendingFile) return

    const formData = new FormData()
    formData.set("patientId", patientId)
    if (caseId) formData.set("caseId", caseId)
    formData.set("file", pendingFile)
    formData.set("title", attachmentTitle)

    setIsUploading(true)
    try {
      const result = await uploadAttachmentAction(formData)
      if (result.ok) {
        toast.success("Arquivo anexado.")
        setPendingFile(null)
        setAttachmentTitle("")
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

  /**
   * Abre numa aba (`inline`) ou baixa. A URL é assinada no servidor a cada
   * clique — nada de link permanente na tela — e é o servidor que decide se o
   * tipo pode abrir inline; aqui o botão "Abrir" só some para não oferecer o
   * que viraria download de qualquer jeito.
   */
  async function handleOpen(id: string, mode: "download" | "inline") {
    setBusyId(id)
    try {
      const result = await getAttachmentDownloadUrlAction(id, mode)
      if (result.ok) {
        window.open(result.url, "_blank", "noopener,noreferrer")
      } else {
        toast.error(getFriendlyToastMessage(result.error))
      }
    } finally {
      setBusyId(null)
    }
  }

  /** Apaga relatório e exame juntos: o grupo é uma coisa só para o médico. */
  async function handleDeleteGroup(ids: string[]) {
    setBusyId(ids[0])
    try {
      for (const id of ids) {
        const result = await deleteAttachmentAction(id)
        if (!result.ok) {
          toast.error(getFriendlyToastMessage(result.error))
          return
        }
      }
      toast.success("Leitura de exames apagada dos anexos.")
      router.refresh()
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
              Qualquer tipo de arquivo, até 20 MB cada. PDF e imagem abrem em
              outra aba; o resto baixa. Só você tem acesso.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {groupAttachments(attachments).map((group) => {
              if (group.items.length > 1) {
                // Grupo da leitura de exames: MESMA linha de um anexo comum, mas à
                // direita um botão por arquivo (abre em outra aba) e uma lixeira
                // que apaga o grupo inteiro. Sem caixa dentro de caixa.
                const exam = group.items.find((a) => a.group_role === "exam") ?? group.items[0]
                const groupTitle = exam.title?.trim() || exam.file_name
                const groupBusy = group.items.some((a) => busyId === a.id)
                return (
                  <li
                    key={group.key}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <FlaskConical
                        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="wrap-break-word font-medium">{groupTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          Leitura de exames · {formatDateTime(exam.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {group.items.map((attachment) => {
                        const label = attachment.group_role
                          ? GROUP_ROLE_LABEL[attachment.group_role]
                          : attachment.file_name
                        return (
                          <Button
                            key={attachment.id}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpen(attachment.id, "inline")}
                            disabled={groupBusy}
                            aria-label={`Abrir ${label} de ${groupTitle} em outra aba`}
                          >
                            <ExternalLink className="h-4 w-4" aria-hidden />
                            {label}
                          </Button>
                        )
                      })}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteGroup(group.items.map((a) => a.id))}
                        disabled={groupBusy}
                        aria-label={`Apagar relatório e exame de ${groupTitle}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </li>
                )
              }

              const attachment = group.items[0]
              const label = attachment.title?.trim() || attachment.file_name
              return (
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
                      <p className="wrap-break-word font-medium">{label}</p>
                      <p className="text-sm text-muted-foreground">
                        {attachment.title?.trim() ? `${attachment.file_name} · ` : ""}
                        {formatBytes(attachment.size_bytes)} ·{" "}
                        {formatDateTime(attachment.created_at)}
                      </p>
                    </div>
                  </div>
                  <AttachmentActions
                    attachment={attachment}
                    label={label}
                    busy={busyId === attachment.id}
                    onOpen={handleOpen}
                    onDelete={handleDelete}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>

      <Dialog
        open={pendingFile !== null}
        onOpenChange={(open) => {
          if (open || isUploading) return
          setPendingFile(null)
          setAttachmentTitle("")
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nome do anexo</DialogTitle>
            <DialogDescription>
              Dê um nome para reconhecer o arquivo depois. O arquivo original é
              guardado como está.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="attachment-title">Nome</Label>
            <Input
              id="attachment-title"
              value={attachmentTitle}
              maxLength={120}
              autoFocus
              placeholder="Ex.: Hemograma de março"
              onChange={(event) => setAttachmentTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void handleConfirmUpload()
                }
              }}
            />
            <p className="text-sm text-muted-foreground">
              {pendingFile
                ? `${pendingFile.name} · ${formatBytes(pendingFile.size)}`
                : ""}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setPendingFile(null)
                setAttachmentTitle("")
              }}
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              Anexar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
