"use client"

import { useState } from "react"
import { format } from "date-fns"
import { BookmarkIcon, PlusIcon, PrinterIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { createExamPanelAction, generateExamRequestAction } from "@/actions"
import {
  AddFieldButton,
  ChoiceChip,
  DocLayout,
  DocPaper,
  DocStep,
  emitAndOpenPdf,
  PanelFooter,
} from "@/components/dashboard/cases/consult-document"
import type { ConsultDoctor } from "@/components/dashboard/cases/consult-prescription-panel"
import { ExamCatalogSearch } from "@/components/dashboard/exam-requests/exam-catalog-search"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import type { ExamCatalogItem } from "@/modules/exam-catalog/types"
import type { ExamPanel } from "@/modules/exam-panels/types"

const addUnique = (list: string[], names: string[]) =>
  names.reduce(
    (acc, name) => (name.trim() && !acc.some((e) => e.toLowerCase() === name.trim().toLowerCase()) ? [...acc, name.trim()] : acc),
    list,
  )

/** Pedido de exame dentro da Consulta (protótipo a6e): catálogo, painéis salvos e a folha ao lado. */
export function ConsultExamRequestPanel({
  caseId,
  patient,
  catalog,
  panels,
  doctor,
  onDone,
}: {
  caseId: string
  patient: { id: string; name: string; birth_date: string | null }
  catalog: ExamCatalogItem[]
  panels: ExamPanel[]
  doctor: ConsultDoctor
  onDone: () => void
}) {
  const [exams, setExams] = useState<string[]>([])
  const [hypothesis, setHypothesis] = useState("")
  const [observations, setObservations] = useState<string | null>(null)
  const [panelName, setPanelName] = useState<string | null>(null)
  const [busy, setBusy] = useState<"emit" | "panel" | null>(null)
  const count = `${exams.length} ${exams.length === 1 ? "exame" : "exames"}`

  async function handleEmit() {
    if (!exams.length) return void toast.error("Adicione pelo menos um exame ao pedido.")
    setBusy("emit")
    const ok = await emitAndOpenPdf(
      () =>
        generateExamRequestAction({
          payload: {
            patientName: patient.name,
            birthDate: patient.birth_date ?? undefined,
            exams,
            hypothesis: hypothesis.trim() || undefined,
            observations: observations?.trim() || undefined,
          },
          issuedAt: format(new Date(), "yyyy-MM-dd"),
          patientId: patient.id,
          caseId,
        }),
      "Pedido de exame emitido",
    )
    setBusy(null)
    if (ok) onDone()
  }

  async function handleSavePanel() {
    const name = panelName?.trim()
    if (!name) return void toast.error("Dê um nome ao painel.")
    setBusy("panel")
    const result = await createExamPanelAction({ name, panelItems: exams })
    setBusy(null)
    if (!result.ok) return void toast.error(getFriendlyToastMessage(result.error))
    toast.success("Painel salvo.")
    setPanelName(null)
  }

  const form = (
    <>
      <DocStep n={1} title="Exames" aside={exams.length ? `${exams.length} no pedido` : null}>
        <ExamCatalogSearch items={catalog} selected={exams} onAdd={(name) => setExams((prev) => addUnique(prev, [name]))} />
        {panels.length ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-caption text-subtle-foreground">Seus painéis:</span>
            {panels.map((panel) => (
              <ChoiceChip key={panel.id} onClick={() => setExams((prev) => addUnique(prev, panel.panel_items))}>
                <PlusIcon className="size-3" aria-hidden />
                {panel.name}
              </ChoiceChip>
            ))}
          </div>
        ) : null}
        {exams.length ? (
          <ul className="grid grid-cols-2 gap-2">
            {exams.map((exam, index) => (
              <li key={exam} className="flex items-center gap-2 rounded-lg border border-border bg-card py-1.5 pr-1.5 pl-3">
                <span className="flex-1 truncate">{exam}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
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
            Busque no catálogo, digite o exame ou use um painel.
          </p>
        )}
      </DocStep>
      <DocStep n={2} title="Indicação clínica" aside="opcional">
        <Input value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} placeholder="Ex.: febre sem foco há 3 dias, investigar ITU" />
        {observations !== null ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-label font-medium">Observações</span>
            <Textarea autoFocus value={observations} onChange={(e) => setObservations(e.target.value)} rows={2} />
          </label>
        ) : (
          <AddFieldButton onClick={() => setObservations("")}>Observações</AddFieldButton>
        )}
      </DocStep>
    </>
  )

  const preview = (
    <DocPaper doctor={doctor} patient={patient} title="Solicitação de exames">
      {exams.length ? (
        <>
          <div>Solicito:</div>
          {exams.map((exam, i) => (
            <div key={exam} className="pl-2">
              <b className="text-neutral-900">{i + 1}.</b> {exam}
            </div>
          ))}
        </>
      ) : (
        <p className="text-neutral-400">Os exames aparecem aqui.</p>
      )}
      {hypothesis.trim() ? (
        <div className="pt-2">
          <b className="text-neutral-900">Indicação clínica:</b> {hypothesis.trim()}
        </div>
      ) : null}
      {observations?.trim() ? (
        <div className="whitespace-pre-line">
          <b className="text-neutral-900">Observações:</b> {observations.trim()}
        </div>
      ) : null}
    </DocPaper>
  )

  return (
    <>
      <DocLayout form={form} preview={preview} />
      <PanelFooter>
        {panelName === null ? (
          <>
            <Button variant="ghost" onClick={() => setPanelName("")} disabled={!exams.length}>
              <BookmarkIcon data-icon="inline-start" />
              Salvar como painel
            </Button>
            <span className="num ml-auto text-caption text-subtle-foreground">{exams.length ? count : null}</span>
            <Button onClick={handleEmit} disabled={busy !== null || !exams.length}>
              <PrinterIcon data-icon="inline-start" />
              {busy === "emit" ? "Emitindo…" : "Emitir e imprimir"}
            </Button>
          </>
        ) : (
          <>
            <Input
              autoFocus
              value={panelName}
              onChange={(e) => setPanelName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSavePanel()}
              placeholder="Nome do painel. Ex.: Investigação de ITU"
              className="flex-1"
            />
            <Button variant="ghost" onClick={() => setPanelName(null)}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={handleSavePanel} disabled={busy !== null}>
              {busy === "panel" ? "Salvando…" : "Salvar painel"}
            </Button>
          </>
        )}
      </PanelFooter>
    </>
  )
}
