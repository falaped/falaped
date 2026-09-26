"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FileDown, Loader2, Plus, Sparkles, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  deleteExamReadingAction,
  generateExamReportAction,
  generateMedicalReportAction,
  saveExamReadingReportAction,
} from "@/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTime } from "@/lib/formatters"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import type {
  ExamReading,
  ExamReadingFlag,
  ExamReadingItem,
} from "@/modules/exam-readings/types"

export type ExamReadingWithPages = ExamReading & { pageUrls: string[] }

type ExamReadingCardProps = {
  reading: ExamReadingWithPages
  patientName: string
  patientBirthDate: string | null
}

const FLAG_LABEL: Record<ExamReadingFlag, string> = {
  normal: "Normal",
  low: "Baixo",
  high: "Alto",
  unknown: "Sem faixa",
}

const FLAG_ORDER: ExamReadingFlag[] = ["normal", "low", "high", "unknown"]

/** Frase fixa no PDF: registro do apoio de IA (Res. CFM 2.454/2026, art. 4º V). */
const AI_DISCLOSURE =
  "Relatório elaborado com apoio de inteligência artificial a partir do exame anexado e revisado pelo médico responsável."

function textToHtml(text: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${escape(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("")
}

function downloadPdf(base64: string, filename: string) {
  const blob = new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], {
    type: "application/pdf",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ExamReadingCard({
  reading,
  patientName,
  patientBirthDate,
}: ExamReadingCardProps) {
  const router = useRouter()
  const [items, setItems] = useState<ExamReadingItem[]>(reading.items)
  const [reportText, setReportText] = useState(reading.report_text ?? "")
  const [busy, setBusy] = useState<"report" | "pdf" | "delete" | null>(null)

  function updateItem(index: number, patch: Partial<ExamReadingItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  async function handleGenerateReport() {
    setBusy("report")
    try {
      const result = await generateExamReportAction({ readingId: reading.id, items })
      if (result.ok) {
        setReportText(result.reportText)
        toast.success("Rascunho do relatório gerado. Revise antes de emitir.")
      } else toast.error(getFriendlyToastMessage(result.error))
    } finally {
      setBusy(null)
    }
  }

  async function handleEmitPdf() {
    if (reportText.trim() === "") {
      toast.error("Gere ou escreva o relatório antes de emitir.")
      return
    }
    setBusy("pdf")
    try {
      const saved = await saveExamReadingReportAction({ readingId: reading.id, reportText })
      if (!saved.ok) {
        toast.error(getFriendlyToastMessage(saved.error))
        return
      }
      const result = await generateMedicalReportAction({
        payload: {
          patientName,
          birthDate: patientBirthDate ?? undefined,
          title: "Relatório de exames",
          bodyHtml: textToHtml(`${reading.title}\n\n${reportText}\n\n${AI_DISCLOSURE}`),
        },
        patientId: reading.patient_id,
        caseId: reading.case_id,
      })
      if (result.ok) {
        downloadPdf(result.pdfBase64, result.filename)
        toast.success("Relatório emitido. Download iniciado.")
        router.refresh()
      } else toast.error(getFriendlyToastMessage(result.error))
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete() {
    setBusy("delete")
    try {
      const result = await deleteExamReadingAction(reading.id)
      if (result.ok) {
        toast.success("Leitura apagada.")
        router.refresh()
      } else toast.error(getFriendlyToastMessage(result.error))
    } finally {
      setBusy(null)
    }
  }

  const info = reading.exam_info
  const infoLine = [
    info.exam_types.length > 0 ? info.exam_types.join(", ") : null,
    info.laboratory,
    info.collected_at ? `coleta ${info.collected_at}` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{reading.title}</p>
          <p className="text-sm text-muted-foreground">
            {infoLine ? `${infoLine} · ` : ""}
            {reading.page_paths.length} página{reading.page_paths.length === 1 ? "" : "s"} ·{" "}
            {formatDateTime(reading.created_at)}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={busy !== null}
          aria-label={`Apagar leitura ${reading.title}`}
        >
          {busy === "delete" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="h-4 w-4" aria-hidden />
          )}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex max-h-[32rem] flex-col gap-2 overflow-y-auto rounded-md border border-border bg-muted/30 p-2">
          {reading.pageUrls.map((url, i) =>
            url ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed URL de curta duração, sem otimização
              <img
                key={url}
                src={url}
                alt={`Página ${i + 1} do exame ${reading.title}`}
                className="w-full rounded border border-border bg-white"
                loading="lazy"
              />
            ) : null,
          )}
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Confira cada valor com a página ao lado antes de gerar o relatório. A
            faixa de referência é a impressa no laudo.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="pb-1 pr-2 font-medium">Exame</th>
                  <th className="pb-1 pr-2 font-medium">Valor</th>
                  <th className="pb-1 pr-2 font-medium">Unidade</th>
                  <th className="pb-1 pr-2 font-medium">Referência</th>
                  <th className="pb-1 pr-2 font-medium">Pág.</th>
                  <th className="pb-1 font-medium">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="py-1 pr-2">
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(i, { name: e.target.value })}
                        className="h-8 min-w-36"
                        aria-label="Nome do exame"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <Input
                        value={item.value}
                        onChange={(e) => updateItem(i, { value: e.target.value })}
                        className="h-8 min-w-20"
                        aria-label="Valor"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <Input
                        value={item.unit ?? ""}
                        onChange={(e) => updateItem(i, { unit: e.target.value || null })}
                        className="h-8 min-w-20"
                        aria-label="Unidade"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <Input
                        value={item.reference ?? ""}
                        onChange={(e) =>
                          updateItem(i, { reference: e.target.value || null })
                        }
                        className="h-8 min-w-28"
                        aria-label="Faixa de referência"
                      />
                    </td>
                    <td className="py-1 pr-2 text-muted-foreground">{item.page}</td>
                    <td className="py-1 pr-2">
                      <select
                        value={item.flag}
                        onChange={(e) =>
                          updateItem(i, { flag: e.target.value as ExamReadingFlag })
                        }
                        className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                        aria-label="Status do resultado"
                      >
                        {FLAG_ORDER.map((f) => (
                          <option key={f} value={f}>
                            {FLAG_LABEL[f]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1">
                      <div className="flex items-center gap-1">
                        {item.flag === "low" || item.flag === "high" ? (
                          <Badge variant="destructive">{FLAG_LABEL[item.flag]}</Badge>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setItems((prev) => prev.filter((_, j) => j !== i))
                          }
                          aria-label={`Remover ${item.name || "linha"}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setItems((prev) => [
                  ...prev,
                  { name: "", value: "", unit: null, reference: null, flag: "unknown", page: 1 },
                ])
              }
            >
              <Plus className="h-4 w-4" aria-hidden />
              Adicionar linha
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleGenerateReport}
              disabled={busy !== null || items.length === 0}
            >
              {busy === "report" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden />
              )}
              {reportText ? "Gerar relatório de novo" : "Confirmar e gerar relatório"}
            </Button>
          </div>
        </div>
      </div>

      {reportText || busy === "report" ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Rascunho do relatório</p>
          <Textarea
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            rows={14}
            className="font-sans text-sm"
            aria-label="Texto do relatório de exames"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Edite à vontade. O PDF sai com a frase de apoio de IA no final.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={handleEmitPdf}
              disabled={busy !== null}
            >
              {busy === "pdf" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <FileDown className="h-4 w-4" aria-hidden />
              )}
              Emitir relatório (PDF)
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
