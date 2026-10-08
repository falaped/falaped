"use client"

import { useState } from "react"
import { format } from "date-fns"
import { BookmarkIcon, PlusIcon, DownloadIcon, ScaleIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { createPrescriptionTemplateAction, generatePrescriptionAction } from "@/actions"
import {
  AddFieldButton,
  ChoiceChip,
  DocLayout,
  DocPaper,
  DocStep,
  emitAndDownloadPdf,
  PanelFooter,
} from "@/components/dashboard/cases/consult-document"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { htmlToPlainMultiline } from "@/lib/formatters"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { cn } from "@/lib/utils"
import type { PrescriptionTemplateOption } from "@/modules/prescription-templates/types"
import { getProfileDefaultLocation } from "@/modules/profiles/get-profile-default-location"

export type ConsultDoctor = {
  first_name: string | null
  surname: string | null
  crm: string | null
  rqe?: string | null
  default_location_state?: string | null
  default_location_city?: string | null
}

type Medication = { name: string; dosage: string; posology: string; duration: string }
const emptyMedication = (): Medication => ({ name: "", dosage: "", posology: "", duration: "" })

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

/**
 * Alergia citada no nome do medicamento (busca simples por palavra, sem acento). Só aponta
 * coincidência óbvia: não sabe de classe (penicilinas × amoxicilina), por isso o painel
 * nunca afirma que "não há conflito".
 */
function allergyHit(medName: string, allergies: string[]): string | null {
  const name = normalize(medName)
  if (!name.trim()) return null
  return (
    allergies.find((allergy) =>
      normalize(allergy)
        .split(/[^a-z0-9]+/)
        .some((word) => word.length >= 4 && name.includes(word)),
    ) ?? null
  )
}

/** Quantos modelos viram atalho; o resto fica em "Ver todos". */
const TEMPLATE_CHIPS = 4

/** Receita dentro da Consulta (protótipo a6): criança, peso e alergia já vêm da consulta. */
export function ConsultPrescriptionPanel({
  caseId,
  patient,
  allergies,
  weightLabel,
  templates,
  doctor,
  onDone,
}: {
  caseId: string
  patient: { id: string; name: string; birth_date: string | null }
  allergies: string[]
  /** "12,4 kg · hoje"; null sem medida de peso. */
  weightLabel: string | null
  templates: PrescriptionTemplateOption[]
  doctor: ConsultDoctor
  onDone: () => void
}) {
  const [medications, setMedications] = useState<Medication[]>([emptyMedication()])
  const [orientations, setOrientations] = useState("")
  const [warningSigns, setWarningSigns] = useState<string | null>(null)
  const [additionalNotes, setAdditionalNotes] = useState<string | null>(null)
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState<string | null>(null)
  const [busy, setBusy] = useState<"emit" | "template" | null>(null)
  const [pages, setPages] = useState(1)

  const filled = medications.filter((m) => m.name.trim() && m.posology.trim())
  const update = (index: number, field: keyof Medication, value: string) =>
    setMedications((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)))

  function applyTemplate(id: string) {
    const template = templates.find((t) => t.id === id)
    if (!template) return
    const s = template.snapshot
    setTemplateId(id)
    setMedications(
      s.medications.length
        ? s.medications.map((m) => ({
            name: m.name ?? "",
            dosage: m.dosage ?? "",
            posology: m.posology ?? "",
            duration: m.duration ?? "",
          }))
        : [emptyMedication()],
    )
    setOrientations(s.orientations ?? "")
    setWarningSigns(s.warningSigns || null)
    setAdditionalNotes(s.additionalNotes || null)
  }

  const meds = filled.map((m) => ({
    name: m.name.trim(),
    dosage: m.dosage.trim() || undefined,
    posology: m.posology.trim(),
    duration: m.duration.trim() || undefined,
  }))
  const extras = {
    orientations: orientations.trim() || undefined,
    warningSigns: warningSigns?.trim() || undefined,
    additionalNotes: additionalNotes?.trim() || undefined,
  }

  async function handleEmit() {
    if (!meds.length) return void toast.error("Adicione pelo menos um medicamento com nome e posologia.")
    setBusy("emit")
    const ok = await emitAndDownloadPdf(
      () =>
        generatePrescriptionAction({
          payload: { patientName: patient.name, birthDate: patient.birth_date ?? undefined, medications: meds, ...extras },
          issuedAt: format(new Date(), "yyyy-MM-dd"),
          patientId: patient.id,
          caseId,
        }),
      "Receita emitida",
    )
    setBusy(null)
    if (ok) onDone()
  }

  async function handleSaveTemplate() {
    const name = templateName?.trim()
    if (!name) return void toast.error("Dê um nome ao modelo.")
    if (!meds.length) return void toast.error("Adicione pelo menos um medicamento com nome e posologia.")
    setBusy("template")
    const result = await createPrescriptionTemplateAction({
      name,
      snapshot: { medications: meds, ...extras, locationState: getProfileDefaultLocation(doctor) },
    })
    setBusy(null)
    if (!result.ok) return void toast.error(getFriendlyToastMessage(result.error))
    toast.success("Modelo salvo.")
    setTemplateName(null)
  }

  const extraNotes = (
    [
      ["Orientações", extras.orientations],
      ["Sinais de alerta", extras.warningSigns],
      ["Anotações", extras.additionalNotes],
    ] as const
  ).filter(([, value]) => value && htmlToPlainMultiline(value).trim())

  const form = (
    <>
      {allergies.length || weightLabel ? (
        <div className="flex flex-wrap items-center gap-2">
          {allergies.length ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-danger-border bg-danger-soft px-2.5 py-0.5 text-label font-medium text-danger-text">
              <TriangleAlertIcon className="size-3.5" aria-hidden />
              Alérgica a {allergies.join(", ")}
            </span>
          ) : null}
          {weightLabel ? (
            <span className="num inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-label text-muted-foreground">
              <ScaleIcon className="size-3.5" aria-hidden />
              {weightLabel}
            </span>
          ) : null}
        </div>
      ) : null}

      <DocStep n={1} title="Medicamentos">
        {templates.length ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-caption text-subtle-foreground">Começar de um modelo:</span>
            {templates.slice(0, TEMPLATE_CHIPS).map((t) => (
              <ChoiceChip key={t.id} selected={templateId === t.id} onClick={() => applyTemplate(t.id)}>
                {t.name}
              </ChoiceChip>
            ))}
            {templates.length > TEMPLATE_CHIPS ? (
              <Select value={templateId ?? ""} onValueChange={applyTemplate}>
                <SelectTrigger size="sm" className="w-auto border-none text-primary-ink shadow-none">
                  <SelectValue placeholder="Ver todos" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        ) : null}

        <ul className="flex flex-col gap-2">
          {medications.map((med, index) => {
            const hit = allergyHit(med.name, allergies)
            return (
              <li key={index} className={cn("flex flex-col gap-3 rounded-xl border bg-card p-4", hit ? "border-danger-border" : "border-border")}>
                <div className="flex items-center gap-2">
                  <span className="num w-4 text-caption text-subtle-foreground">{index + 1}.</span>
                  <Input
                    aria-label={`Medicamento ${index + 1}`}
                    value={med.name}
                    onChange={(e) => update(index, "name", e.target.value)}
                    placeholder="Medicamento e apresentação. Ex.: Dipirona 500 mg/mL, gotas"
                    className="font-semibold"
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-danger-text"
                    aria-label="Remover medicamento"
                    onClick={() =>
                      setMedications((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : [emptyMedication()]))
                    }
                  >
                    <Trash2Icon />
                  </Button>
                </div>
                {hit ? (
                  <p className="flex items-center gap-1.5 pl-6 text-caption font-medium text-danger-text">
                    <TriangleAlertIcon className="size-3.5" aria-hidden />
                    Pode conflitar com a alergia a {hit}
                  </p>
                ) : null}
                <div className="grid grid-cols-[110px_minmax(0,1fr)_130px] gap-3 pl-6">
                  {(
                    [
                      ["dosage", "Dose", "3,1 mL"],
                      ["posology", "Como tomar", "1x ao dia, via oral"],
                      ["duration", "Por quanto tempo", "3 dias"],
                    ] as const
                  ).map(([field, label, placeholder]) => (
                    <label key={field} className="flex flex-col gap-1">
                      <span className="text-label font-medium">{label}</span>
                      <Input
                        value={med[field]}
                        onChange={(e) => update(index, field, e.target.value)}
                        placeholder={placeholder}
                        className={field === "dosage" ? "num" : undefined}
                      />
                    </label>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
        <button
          type="button"
          onClick={() => setMedications((prev) => [...prev, emptyMedication()])}
          className="flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <PlusIcon className="size-4" aria-hidden />
          Adicionar medicamento
        </button>
      </DocStep>

      <DocStep n={2} title="Orientações à família" aside="opcional">
        <RichTextEditor value={orientations} onChange={setOrientations} placeholder="O que a família deve fazer em casa" minHeight="88px" />
        {warningSigns !== null ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-label font-medium">Sinais de alerta</span>
            <RichTextEditor value={warningSigns} onChange={setWarningSigns} placeholder="Quando voltar ou procurar a urgência" minHeight="72px" />
          </div>
        ) : null}
        {additionalNotes !== null ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-label font-medium">Anotações</span>
            <RichTextEditor value={additionalNotes} onChange={setAdditionalNotes} minHeight="72px" />
          </div>
        ) : null}
        <div className="flex flex-wrap gap-1">
          {warningSigns === null ? <AddFieldButton onClick={() => setWarningSigns("")}>Sinais de alerta</AddFieldButton> : null}
          {additionalNotes === null ? <AddFieldButton onClick={() => setAdditionalNotes("")}>Anotação</AddFieldButton> : null}
        </div>
      </DocStep>
    </>
  )

  const preview = (
    <DocPaper doctor={doctor} patient={patient} title="Receituário" onPagesChange={setPages}>
      {meds.length ? (
        meds.map((m, i) => (
          <div key={i}>
            <b className="text-neutral-900">
              {i + 1}. {m.name}
            </b>
            <div className="pl-3">
              {[m.dosage, m.posology, m.duration && `por ${m.duration}`].filter(Boolean).join(", ")}.
            </div>
          </div>
        ))
      ) : (
        <p className="text-neutral-400">Os medicamentos aparecem aqui.</p>
      )}
      {extraNotes.map(([label, value]) => (
        <div key={label} className="pt-2">
          <b className="text-neutral-900">{label}</b>
          <div className="whitespace-pre-line">{htmlToPlainMultiline(value!)}</div>
        </div>
      ))}
    </DocPaper>
  )

  return (
    <>
      <DocLayout form={form} preview={preview} />
      <PanelFooter>
        {templateName === null ? (
          <>
            <Button variant="ghost" onClick={() => setTemplateName("")} disabled={!meds.length}>
              <BookmarkIcon data-icon="inline-start" />
              Salvar como modelo
            </Button>
            {pages > 1 ? (
              <span className="ml-auto flex items-center gap-1.5 text-caption font-medium text-warning-text">
                <TriangleAlertIcon className="size-3.5" aria-hidden />
                Não cabe numa folha: a receita vai sair em {pages} páginas
              </span>
            ) : (
              <span className="num ml-auto text-caption text-subtle-foreground">
                {meds.length ? `${meds.length} ${meds.length === 1 ? "medicamento" : "medicamentos"}` : null}
              </span>
            )}
            <Button onClick={handleEmit} disabled={busy !== null || !meds.length}>
              <DownloadIcon data-icon="inline-start" />
              {busy === "emit" ? "Emitindo…" : "Emitir e download"}
            </Button>
          </>
        ) : (
          <>
            <Input
              autoFocus
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveTemplate()}
              placeholder="Nome do modelo. Ex.: Otite média aguda"
              className="flex-1"
            />
            <Button variant="ghost" onClick={() => setTemplateName(null)}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={handleSaveTemplate} disabled={busy !== null}>
              {busy === "template" ? "Salvando…" : "Salvar modelo"}
            </Button>
          </>
        )}
      </PanelFooter>
    </>
  )
}
