"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowRightIcon,
  CheckIcon,
  DownloadIcon,
  FileCheckIcon,
  FileTextIcon,
  FlaskConicalIcon,
  Loader2Icon,
  PillIcon,
  RotateCcwIcon,
  SendIcon,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { downloadCaseReportPdfAction, updateCaseStatusAction } from "@/actions"
import type { CaseDocument } from "@/components/dashboard/cases/case-detail-documents"
import { openStartConsult } from "@/components/dashboard/patient-search"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"

/** Marca na URL que a consulta acabou de ser encerrada pelo drawer: abre este modal. */
export const JUST_CLOSED_PARAM = "encerrada"

const DOC_ICON: Record<CaseDocument["kind"], LucideIcon> = {
  prescription: PillIcon,
  certificate: FileCheckIcon,
  "exam-request": FlaskConicalIcon,
  referral: SendIcon,
}

/**
 * Consulta encerrada (protótipo a11): confirma o que foi salvo, entrega os documentos e
 * emenda no próximo atendimento. Desfazer é "Reabrir consulta", sem "tem certeza?" antes.
 * Fechar fica na página da consulta encerrada.
 */
export function CaseClosedDialog({
  caseId,
  firstName,
  summary,
  documents,
  reportId,
}: {
  caseId: string
  firstName: string | null
  /** "27 min · R$ 350,00 lançado · relatório pronto · 1 lembrete". */
  summary: string
  documents: CaseDocument[]
  /** Relatório mais recente, para baixar; null quando não há. */
  reportId: string | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [open, setOpen] = useState(params.has(JUST_CLOSED_PARAM))
  const [isReopening, startReopening] = useTransition()
  const [isDownloading, setIsDownloading] = useState(false)

  function dismiss() {
    setOpen(false)
    // Tira a marca da URL: recarregar a página não reabre o modal.
    router.replace(pathname, { scroll: false })
  }

  function reopen() {
    startReopening(async () => {
      const result = await updateCaseStatusAction(caseId, "active")
      if (!result.ok) {
        toast.error(getFriendlyToastMessage(result.error))
        return
      }
      router.push(`/dashboard/cases/new/${caseId}`)
    })
  }

  async function downloadReport() {
    if (!reportId) return
    setIsDownloading(true)
    try {
      const result = await downloadCaseReportPdfAction(reportId)
      if (!result.ok) {
        toast.error(getFriendlyToastMessage(result.error))
        return
      }
      const blob = new Blob([Uint8Array.from(atob(result.pdfBase64), (c) => c.charCodeAt(0))], {
        type: "application/pdf",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = result.filename
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent className="gap-5 p-7 sm:max-w-[620px]">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-success-soft text-success-text">
            <CheckIcon className="size-5" aria-hidden />
          </span>
          <div>
            <DialogTitle className="font-display text-section font-semibold">
              {firstName ? `Consulta de ${firstName} encerrada` : "Consulta encerrada"}
            </DialogTitle>
            <DialogDescription className="num text-muted-foreground">{summary}</DialogDescription>
          </div>
        </div>

        {documents.length || reportId ? (
          <ul className="flex flex-col gap-2">
            {documents.map((doc) => {
              const Icon = DOC_ICON[doc.kind]
              return (
                <li key={doc.key} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                  <Icon className="size-4 shrink-0 text-primary-ink" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{doc.label}</span>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={doc.href} download>
                      <DownloadIcon data-icon="inline-start" />
                      Baixar
                    </a>
                  </Button>
                </li>
              )
            })}
            {reportId ? (
              <li className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                <FileTextIcon className="size-4 shrink-0 text-primary-ink" aria-hidden />
                <span className="min-w-0 flex-1 truncate">Relatório da consulta</span>
                <Button variant="ghost" size="sm" disabled={isDownloading} onClick={downloadReport}>
                  {isDownloading ? <Loader2Icon className="animate-spin" /> : <DownloadIcon data-icon="inline-start" />}
                  Baixar
                </Button>
              </li>
            ) : null}
          </ul>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              dismiss()
              openStartConsult()
            }}
          >
            Atender próximo paciente
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground">
          <Button variant="ghost" size="sm" disabled={isReopening} onClick={reopen}>
            <RotateCcwIcon data-icon="inline-start" />
            Reabrir consulta
          </Button>
          ·
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
            Ir ao início
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
