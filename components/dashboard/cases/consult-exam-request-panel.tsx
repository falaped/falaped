"use client"

import { useState } from "react"
import { format } from "date-fns"
import { PrinterIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { generateExamRequestAction } from "@/actions"
import { emitAndOpenPdf, PanelBody, PanelFooter } from "@/components/dashboard/cases/consult-document"
import { ExamCatalogSearch } from "@/components/dashboard/exam-requests/exam-catalog-search"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { ExamCatalogItem } from "@/modules/exam-catalog/types"
import type { ExamPanel } from "@/modules/exam-panels/types"

const addUnique = (list: string[], names: string[]) =>
  names.reduce(
    (acc, name) => (name.trim() && !acc.some((e) => e.toLowerCase() === name.trim().toLowerCase()) ? [...acc, name.trim()] : acc),
    list,
  )

/** Pedido de exame dentro da Consulta: catálogo, painéis salvos e hipótese, sem escolher a criança. */
export function ConsultExamRequestPanel({
  caseId,
  patient,
  catalog,
  panels,
  onDone,
}: {
  caseId: string
  patient: { id: string; name: string; birth_date: string | null }
  catalog: ExamCatalogItem[]
  panels: ExamPanel[]
  onDone: () => void
}) {
  const [exams, setExams] = useState<string[]>([])
  const [hypothesis, setHypothesis] = useState("")
  const [observations, setObservations] = useState("")
  const [busy, setBusy] = useState(false)

  async function handleEmit() {
    if (!exams.length) return void toast.error("Adicione pelo menos um exame ao pedido.")
    setBusy(true)
    const ok = await emitAndOpenPdf(
      () =>
        generateExamRequestAction({
          payload: {
            patientName: patient.name,
            birthDate: patient.birth_date ?? undefined,
            exams,
            hypothesis: hypothesis.trim() || undefined,
            observations: observations.trim() || undefined,
          },
          issuedAt: format(new Date(), "yyyy-MM-dd"),
          patientId: patient.id,
          caseId,
        }),
      "Pedido de exame emitido",
    )
    setBusy(false)
    if (ok) onDone()
  }

  return (
    <>
      <PanelBody>
        {panels.length ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-label font-medium">Seus painéis</span>
            <div className="flex flex-wrap gap-1.5">
              {panels.map((panel) => (
                <Button
                  key={panel.id}
                  variant="outline"
                  size="xs"
                  className="rounded-full"
                  onClick={() => setExams((prev) => addUnique(prev, panel.panel_items))}
                >
                  {panel.name}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        <ExamCatalogSearch items={catalog} selected={exams} onAdd={(name) => setExams((prev) => addUnique(prev, [name]))} />
        {exams.length ? (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {exams.map((exam, index) => (
              <li key={exam} className="flex items-center gap-2 py-1.5 pr-1.5 pl-4">
                <span className="flex-1 truncate">{exam}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-danger-text"
                  aria-label={`Remover ${exam}`}
                  onClick={() => setExams((prev) => prev.filter((_, i) => i !== index))}
                >
                  <XIcon />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-border-strong px-4 py-5 text-center text-muted-foreground">
            Busque no catálogo ou digite o exame.
          </p>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-label font-medium">
            Hipótese ou indicação <span className="font-normal text-subtle-foreground">(opcional)</span>
          </span>
          <Textarea value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} rows={2} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label font-medium">
            Observações <span className="font-normal text-subtle-foreground">(opcional)</span>
          </span>
          <Textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={2} />
        </label>
      </PanelBody>
      <PanelFooter>
        <span className="num text-caption text-subtle-foreground">
          {exams.length ? `${exams.length} ${exams.length === 1 ? "exame" : "exames"}` : null}
        </span>
        <Button className="ml-auto" onClick={handleEmit} disabled={busy || !exams.length}>
          <PrinterIcon data-icon="inline-start" />
          {busy ? "Emitindo…" : "Emitir e imprimir"}
        </Button>
      </PanelFooter>
    </>
  )
}
