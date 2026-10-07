"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronRightIcon, EyeIcon, PencilIcon, PlusIcon, PrinterIcon, ScaleIcon, TriangleAlertIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { createPrescriptionTemplateAction, generatePrescriptionAction } from "@/actions"
import { emitAndOpenPdf, PanelBody, PanelFooter } from "@/components/dashboard/cases/consult-document"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDate } from "@/lib/formatters"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { cn } from "@/lib/utils"
import { getPrescriptionPreviewParagraphs } from "@/modules/prescriptions/get-prescription-preview-paragraphs"
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
  const [warningSigns, setWarningSigns] = useState("")
  const [additionalNotes, setAdditionalNotes] = useState("")
  const [extrasOpen, setExtrasOpen] = useState(false)
  const [preview, setPreview] = useState(false)
  const [templateName, setTemplateName] = useState<string | null>(null)
  const [busy, setBusy] = useState<"emit" | "template" | null>(null)

  const filled = medications.filter((m) => m.name.trim() && m.posology.trim())
  const update = (index: number, field: keyof Medication, value: string) =>
    setMedications((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)))

  function applyTemplate(id: string) {
    const template = templates.find((t) => t.id === id)
    if (!template) return
    const s = template.snapshot
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
    setWarningSigns(s.warningSigns ?? "")
    setAdditionalNotes(s.additionalNotes ?? "")
    if (s.orientations || s.warningSigns || s.additionalNotes) setExtrasOpen(true)
  }

  const meds = filled.map((m) => ({
    name: m.name.trim(),
    dosage: m.dosage.trim() || undefined,
    posology: m.posology.trim(),
    duration: m.duration.trim() || undefined,
  }))
  const extras = {
    orientations: orientations.trim() || undefined,
    warningSigns: warningSigns.trim() || undefined,
    additionalNotes: additionalNotes.trim() || undefined,
  }

  async function handleEmit() {
    if (!meds.length) return void toast.error("Adicione pelo menos um medicamento com nome e posologia.")
    setBusy("emit")
    const ok = await emitAndOpenPdf(
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

  if (preview) {
    const paragraphs = getPrescriptionPreviewParagraphs(
      {
        patientName: patient.name,
        birthDate: patient.birth_date ? formatDate(patient.birth_date) : undefined,
        medications: meds,
        ...extras,
      },
      { firstName: doctor.first_name ?? "", surname: doctor.surname ?? "", crm: doctor.crm ?? null, rqe: doctor.rqe ?? null },
      getProfileDefaultLocation(doctor),
      format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR }),
    )
    return (
      <>
        <PanelBody>
          <div className="mx-auto aspect-[1/1.414] w-full max-w-md space-y-2 overflow-auto rounded-md border border-border bg-white p-8 text-[12px] leading-relaxed text-neutral-800 shadow-sm">
            {paragraphs.map((line, i) =>
              line === "_________________________" ? (
                <div key={i} className="my-3 border-b border-neutral-300" aria-hidden />
              ) : (
                <p key={i} className={cn("whitespace-pre-wrap", line.includes("\n") && "font-medium")}>
                  {line}
                </p>
              ),
            )}
          </div>
        </PanelBody>
        <PanelFooter>
          <Button variant="ghost" onClick={() => setPreview(false)}>
            <PencilIcon data-icon="inline-start" />
            Voltar a editar
          </Button>
          <Button className="ml-auto" onClick={handleEmit} disabled={busy !== null}>
            <PrinterIcon data-icon="inline-start" />
            {busy === "emit" ? "Emitindo…" : "Emitir e imprimir"}
          </Button>
        </PanelFooter>
      </>
    )
  }

  return (
    <>
      <PanelBody>
        {allergies.length || weightLabel ? (
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl border px-3 py-2.5",
              allergies.length ? "border-danger-border bg-danger-soft" : "border-border bg-muted",
            )}
          >
            {allergies.length ? (
              <>
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-destructive text-destructive-foreground" aria-hidden>
                  <TriangleAlertIcon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-danger-text">Alérgica a {allergies.join(", ")}</p>
                  <p className="text-caption text-muted-foreground">Confira cada item antes de emitir.</p>
                </div>
              </>
            ) : (
              <span className="flex-1" />
            )}
            {weightLabel ? (
              <span className="num inline-flex shrink-0 items-center gap-1 rounded-full bg-card px-2.5 py-1 text-label">
                <ScaleIcon className="size-3.5 text-subtle-foreground" aria-hidden />
                {weightLabel}
              </span>
            ) : null}
          </div>
        ) : null}

        {templates.length ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-label font-medium">Usar modelo</span>
            <Select onValueChange={applyTemplate}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolha um modelo salvo" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        ) : null}

        <ul className="flex flex-col gap-2">
          {medications.map((med, index) => {
            const hit = allergyHit(med.name, allergies)
            return (
              <li key={index} className={cn("rounded-xl border bg-card p-4", hit ? "border-danger-border" : "border-border")}>
                <div className="flex items-start gap-2">
                  <Input
                    aria-label={`Medicamento ${index + 1}`}
                    value={med.name}
                    onChange={(e) => update(index, "name", e.target.value)}
                    placeholder="Medicamento e apresentação. Ex.: Dipirona 500 mg/mL"
                    className="font-medium"
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
                    <XIcon />
                  </Button>
                </div>
                {hit ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-caption font-medium text-danger-text">
                    <TriangleAlertIcon className="size-3.5" aria-hidden />
                    Pode conflitar com a alergia a {hit}
                  </p>
                ) : null}
                <div className="mt-2 grid grid-cols-[1fr_2fr_1fr] gap-2">
                  <Input aria-label="Dose" value={med.dosage} onChange={(e) => update(index, "dosage", e.target.value)} placeholder="Dose" />
                  <Input
                    aria-label="Posologia"
                    value={med.posology}
                    onChange={(e) => update(index, "posology", e.target.value)}
                    placeholder="Posologia. Ex.: 6 gotas de 6/6 h"
                  />
                  <Input aria-label="Duração" value={med.duration} onChange={(e) => update(index, "duration", e.target.value)} placeholder="Duração" />
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

        <Collapsible open={extrasOpen} onOpenChange={setExtrasOpen}>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-label font-medium text-muted-foreground hover:text-foreground">
            <ChevronRightIcon className={cn("size-4 transition-transform", extrasOpen && "rotate-90")} aria-hidden />
            Orientações e sinais de alerta
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 flex flex-col gap-4">
            {(
              [
                ["Orientações", orientations, setOrientations, "Orientações para o responsável"],
                ["Sinais de alerta", warningSigns, setWarningSigns, "Quando voltar ou procurar a urgência"],
                ["Anotações", additionalNotes, setAdditionalNotes, "Opcional"],
              ] as const
            ).map(([label, value, onChange, placeholder]) => (
              <div key={label} className="flex flex-col gap-1.5">
                <span className="text-label font-medium">{label}</span>
                <RichTextEditor value={value} onChange={onChange} placeholder={placeholder} minHeight="72px" />
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </PanelBody>

      <PanelFooter>
        {templateName === null ? (
          <>
            <Button variant="ghost" onClick={() => setPreview(true)} disabled={!meds.length}>
              <EyeIcon data-icon="inline-start" />
              Ver prévia
            </Button>
            <Button variant="ghost" onClick={() => setTemplateName("")} disabled={!meds.length}>
              Salvar como modelo
            </Button>
            <Button className="ml-auto" onClick={handleEmit} disabled={busy !== null || !meds.length}>
              <PrinterIcon data-icon="inline-start" />
              {busy === "emit" ? "Emitindo…" : "Emitir e imprimir"}
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
