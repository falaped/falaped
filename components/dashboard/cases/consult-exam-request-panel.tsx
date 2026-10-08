"use client"

import { useRef, useState } from "react"
import { format } from "date-fns"
import { BookmarkIcon, CheckIcon, PlusIcon, DownloadIcon, SearchIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { createExamPanelAction, generateExamRequestAction } from "@/actions"
import {
  AddFieldButton,
  ChoiceChip,
  DocLayout,
  DocPaper,
  DocStep,
  emitAndDownloadPdf,
  PanelFooter,
} from "@/components/dashboard/cases/consult-document"
import type { ConsultDoctor } from "@/components/dashboard/cases/consult-prescription-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { cn } from "@/lib/utils"
import type { ExamCatalogItem } from "@/modules/exam-catalog/types"
import type { ExamPanel } from "@/modules/exam-panels/types"

const addUnique = (list: string[], names: string[]) =>
  names.reduce(
    (acc, name) => (name.trim() && !acc.some((e) => e.toLowerCase() === name.trim().toLowerCase()) ? [...acc, name.trim()] : acc),
    list,
  )

/** Pedido de exame dentro da Consulta (protótipo a6e): catálogo, modelos salvos e a folha ao lado. */
export function ConsultExamRequestPanel({
  caseId,
  patient,
  catalog,
  panels,
  doctor,
  onDone,
}: {
  /** null = fora da consulta (Documentos). */
  caseId: string | null
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
    const ok = await emitAndDownloadPdf(
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
    if (!name) return void toast.error("Dê um nome ao modelo.")
    setBusy("panel")
    const result = await createExamPanelAction({ name, panelItems: exams })
    setBusy(null)
    if (!result.ok) return void toast.error(getFriendlyToastMessage(result.error))
    toast.success("Modelo salvo.")
    setPanelName(null)
  }

  const form = (
    <>
      <DocStep n={1} title="Exames" aside={exams.length ? `${exams.length} no pedido` : null}>
        <ExamSearch catalog={catalog} selected={exams} onAdd={(name) => setExams((prev) => addUnique(prev, [name]))} />
        {panels.length ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-caption text-subtle-foreground">Começar de um modelo:</span>
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
            Nenhum exame no pedido ainda.
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
              Salvar como modelo
            </Button>
            <span className="num ml-auto text-caption text-subtle-foreground">{exams.length ? count : null}</span>
            <Button onClick={handleEmit} disabled={busy !== null || !exams.length}>
              <DownloadIcon data-icon="inline-start" />
              {busy === "emit" ? "Emitindo…" : "Emitir e download"}
            </Button>
          </>
        ) : (
          <>
            <Input
              autoFocus
              value={panelName}
              onChange={(e) => setPanelName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSavePanel()}
              placeholder="Nome do modelo. Ex.: Investigação de ITU"
              className="flex-1"
            />
            <Button variant="ghost" onClick={() => setPanelName(null)}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={handleSavePanel} disabled={busy !== null}>
              {busy === "panel" ? "Salvando…" : "Salvar modelo"}
            </Button>
          </>
        )}
      </PanelFooter>
    </>
  )
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()

/** Quantas sugestões do catálogo aparecem por vez. */
const MAX_SUGGESTIONS = 8

/**
 * Campo único para pôr exame no pedido: digita, aparecem as sugestões do catálogo e, por
 * último, "Adicionar" o que foi digitado. Enter adiciona a opção destacada.
 */
function ExamSearch({ catalog, selected, onAdd }: { catalog: ExamCatalogItem[]; selected: string[]; onAdd: (name: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const [focused, setFocused] = useState(false)
  const q = normalize(query)
  const taken = new Set(selected.map(normalize))
  const matches = q ? catalog.filter((item) => normalize(item.name).includes(q)).slice(0, MAX_SUGGESTIONS) : []
  const exact = matches.some((item) => normalize(item.name) === q)
  const options = [
    ...matches.map((item) => ({ name: item.name, inRequest: taken.has(normalize(item.name)), free: false })),
    ...(q && !exact ? [{ name: query.trim(), inRequest: taken.has(q), free: true }] : []),
  ]

  function add(name: string) {
    onAdd(name)
    setQuery("")
    setActive(0)
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
      <Input
        ref={inputRef}
        value={query}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setActive((i) => Math.min(i + 1, options.length - 1))
          else if (e.key === "ArrowUp") setActive((i) => Math.max(i - 1, 0))
          else if (e.key === "Escape") setQuery("")
          else if (e.key === "Enter" && options[active] && !options[active].inRequest) add(options[active].name)
          else return
          e.preventDefault()
        }}
        placeholder="Digite o exame. Ex.: hemograma"
        aria-label="Adicionar exame ao pedido"
        className="h-10 pr-24 pl-9"
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-caption text-subtle-foreground">↵ adiciona</span>
      {focused && options.length ? (
        <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-md">
          {options.map((option, i) => (
            <li key={`${option.free}-${option.name}`}>
              <button
                type="button"
                disabled={option.inRequest}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(option.name)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left",
                  i === active && !option.inRequest && "bg-accent",
                  option.inRequest && "cursor-default text-muted-foreground",
                )}
              >
                {option.free ? <PlusIcon className="size-4 shrink-0 text-primary-ink" aria-hidden /> : null}
                <span className="flex-1 truncate">{option.free ? `Adicionar "${option.name}"` : option.name}</span>
                {option.inRequest ? (
                  <span className="flex items-center gap-1 text-caption text-success-text">
                    <CheckIcon className="size-3" aria-hidden />
                    no pedido
                  </span>
                ) : option.free ? (
                  <span className="text-caption text-subtle-foreground">fora do catálogo</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
