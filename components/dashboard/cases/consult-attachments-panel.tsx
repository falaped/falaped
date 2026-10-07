"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { DownloadIcon, EyeIcon, FileTextIcon, ImageIcon, Loader2Icon, Trash2Icon, UploadIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { deleteAttachmentAction, getAttachmentDownloadUrlAction, uploadAttachmentAction } from "@/actions"
import { groupAttachments } from "@/components/dashboard/attachments/attachments-section"
import { PanelFooter } from "@/components/dashboard/cases/consult-document"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { isInlineViewableMimeType } from "@/lib/attachment-inline-view"
import { PATIENT_ATTACHMENT_MAX_BYTES } from "@/lib/constants"
import { formatBytes, formatDate } from "@/lib/formatters"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import type { PatientAttachment } from "@/modules/patient-attachments/types"

const isImage = (a: PatientAttachment) => a.mime_type?.startsWith("image/") ?? false
const kind = (a: PatientAttachment) => (isImage(a) ? a.mime_type!.slice(6).toUpperCase() : a.mime_type === "application/pdf" ? "PDF" : "Arquivo")

/**
 * Anexos dentro da Consulta (protótipo a9b): solta o arquivo, o nome vem dele e se corrige ali
 * mesmo, sem diálogo. Abaixo, tudo o que a criança já tem, desta consulta primeiro.
 */
export function ConsultAttachmentsPanel({
  patientId,
  caseId,
  firstName,
  attachments,
  onDone,
}: {
  patientId: string
  caseId: string
  firstName: string
  /** Anexos da criança, de todas as consultas. */
  attachments: PatientAttachment[]
  onDone: () => void
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [uploading, setUploading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const groups = groupAttachments(
    [...attachments].sort((a, b) => Number(b.case_id === caseId) - Number(a.case_id === caseId) || b.created_at.localeCompare(a.created_at)),
  )

  function choose(picked: File | undefined) {
    if (!picked) return
    if (picked.size > PATIENT_ATTACHMENT_MAX_BYTES) return void toast.error("Arquivo muito grande. O limite por anexo é de 20 MB.")
    setTitle(picked.name.replace(/\.[A-Za-z0-9]{1,12}$/, ""))
    setFile(picked)
  }

  async function handleUpload() {
    if (!file) return
    const formData = new FormData()
    formData.set("patientId", patientId)
    formData.set("caseId", caseId)
    formData.set("file", file)
    formData.set("title", title)
    setUploading(true)
    const result = await uploadAttachmentAction(formData).catch(() => null)
    setUploading(false)
    if (!result?.ok) return void toast.error(getFriendlyToastMessage(result?.error ?? "Erro ao anexar o arquivo."))
    toast.success("Arquivo anexado.")
    setFile(null)
    setTitle("")
    router.refresh()
  }

  async function handleOpen(id: string, mode: "download" | "inline") {
    setBusyId(id)
    const result = await getAttachmentDownloadUrlAction(id, mode).catch(() => null)
    setBusyId(null)
    if (!result?.ok) return void toast.error(getFriendlyToastMessage(result?.error ?? "Erro ao abrir o arquivo."))
    window.open(result.url, "_blank", "noopener,noreferrer")
  }

  /** Relatório e exame da leitura saem juntos: o grupo é uma coisa só para o médico. */
  async function handleDelete(ids: string[]) {
    setBusyId(ids[0])
    for (const id of ids) {
      const result = await deleteAttachmentAction(id).catch(() => null)
      if (!result?.ok) {
        setBusyId(null)
        return void toast.error(getFriendlyToastMessage(result?.error ?? "Erro ao apagar o anexo."))
      }
    }
    setBusyId(null)
    toast.success("Anexo apagado.")
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 overflow-auto px-6 py-6">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            choose(e.target.files?.[0])
            e.target.value = ""
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            choose(e.dataTransfer.files[0])
          }}
          className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border-strong bg-muted/50 px-6 py-8 text-center hover:bg-accent"
        >
          <span className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary-ink-strong">
            <UploadIcon className="size-5" aria-hidden />
          </span>
          <span className="font-semibold">
            Solte o arquivo aqui ou <span className="text-primary-ink underline">escolha no computador</span>
          </span>
          <span className="text-caption text-subtle-foreground">Foto, PDF ou outro arquivo, até 20 MB. Fica guardado só para você.</span>
        </button>

        {file ? (
          <div className="flex items-center gap-3 rounded-xl border border-primary bg-primary-soft/50 p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-card text-primary-ink-strong">
              {file.type.startsWith("image/") ? <ImageIcon className="size-5" aria-hidden /> : <FileTextIcon className="size-5" aria-hidden />}
            </span>
            <div className="min-w-0 flex-1">
              <Input
                autoFocus
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUpload()}
                aria-label="Nome do anexo"
                className="h-8 bg-card font-medium"
              />
              <p className="mt-1 truncate text-caption text-subtle-foreground">
                {file.name} · {formatBytes(file.size)}
              </p>
            </div>
            <Button size="sm" onClick={handleUpload} disabled={uploading}>
              {uploading ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : null}
              {uploading ? "Enviando…" : "Anexar"}
            </Button>
            <Button variant="ghost" size="icon-xs" aria-label="Cancelar" onClick={() => setFile(null)} disabled={uploading}>
              <XIcon />
            </Button>
          </div>
        ) : null}

        <section className="flex flex-col gap-2">
          <div className="flex items-center">
            <h3 className="font-display text-title font-semibold">Arquivos {firstName ? `de ${firstName}` : "da criança"}</h3>
            <span className="num ml-auto text-caption text-subtle-foreground">{groups.length}</span>
          </div>
          {groups.length ? (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {groups.map(({ key, items }) => {
                const main = items[0]
                const label = main.title?.trim() || main.file_name
                const ids = items.map((a) => a.id)
                const busy = busyId !== null && ids.includes(busyId)
                return (
                  <li key={key} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                      {isImage(main) ? <ImageIcon className="size-4" aria-hidden /> : <FileTextIcon className="size-4" aria-hidden />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-medium">
                        <span className="truncate">{label}</span>
                        {items.length > 1 ? (
                          <span className="shrink-0 rounded-full border border-primary-soft-border bg-primary-soft px-2 py-0.5 text-caption font-normal text-primary-ink-strong">
                            com relatório
                          </span>
                        ) : null}
                      </p>
                      <p className="num text-caption text-subtle-foreground">
                        {kind(main)} · {formatBytes(items.reduce((sum, a) => sum + a.size_bytes, 0))} ·{" "}
                        {main.case_id === caseId ? <span className="text-primary-ink">Nesta consulta</span> : formatDate(main.created_at)}
                      </p>
                    </div>
                    {isInlineViewableMimeType(main.mime_type) ? (
                      <Button variant="ghost" size="xs" onClick={() => handleOpen(main.id, "inline")} disabled={busy}>
                        <EyeIcon data-icon="inline-start" />
                        Ver
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="icon-xs" aria-label={`Baixar ${label}`} onClick={() => handleOpen(main.id, "download")} disabled={busy}>
                      <DownloadIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground hover:text-danger-text"
                      aria-label={`Apagar ${label}`}
                      onClick={() => handleDelete(ids)}
                      disabled={busy}
                    >
                      <Trash2Icon />
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-border-strong px-4 py-5 text-center text-muted-foreground">Nenhum arquivo ainda.</p>
          )}
        </section>
      </div>
      <PanelFooter>
        <span className="text-caption text-subtle-foreground">Os arquivos ficam também na ficha da criança</span>
        <Button variant="outline" className="ml-auto" onClick={onDone}>
          Pronto
        </Button>
      </PanelFooter>
    </>
  )
}
