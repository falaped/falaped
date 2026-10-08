"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { createPrescriptionTemplateAction, updatePrescriptionTemplateAction } from "@/actions"
import { AddFieldButton, DocPaper } from "@/components/dashboard/cases/consult-document"
import type { ConsultDoctor } from "@/components/dashboard/cases/consult-prescription-panel"
import { FormCard } from "@/components/dashboard/form-layout"
import { TemplateFormShell, type TemplateSuggestion } from "@/components/dashboard/templates/template-form-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { htmlToPlainMultiline } from "@/lib/formatters"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import type { PrescriptionTemplateSnapshot } from "@/modules/prescription-templates/types"
import { getProfileDefaultLocation } from "@/modules/profiles/get-profile-default-location"

const LIST_HREF = "/dashboard/templates"

type Medication = { name: string; dosage: string; posology: string; duration: string }
const emptyMedication = (): Medication => ({ name: "", dosage: "", posology: "", duration: "" })

/** A folha da prévia não tem criança: o modelo vale para todas. */
const PREVIEW_PATIENT = { name: "Nome da criança", birth_date: null }

/**
 * Criar ou editar o modelo de receita (protótipo g6/g6e/g6a): os mesmos campos da receita, sem
 * criança. A dose pode ficar em branco, porque é ajustada pelo peso em cada consulta.
 */
export function PrescriptionTemplateForm({
  templateId,
  initialName = "",
  initialSnapshot,
  doctor,
  suggestion,
}: {
  /** Ausente = criar. */
  templateId?: string
  initialName?: string
  initialSnapshot?: PrescriptionTemplateSnapshot
  doctor: ConsultDoctor
  suggestion?: TemplateSuggestion
}) {
  const router = useRouter()
  const isCreate = !templateId
  const initial = useMemo(
    () => ({
      name: initialName,
      medications: initialSnapshot?.medications.length
        ? initialSnapshot.medications.map((m) => ({ name: m.name ?? "", dosage: m.dosage ?? "", posology: m.posology ?? "", duration: m.duration ?? "" }))
        : [emptyMedication()],
      orientations: initialSnapshot?.orientations ?? "",
      warningSigns: initialSnapshot?.warningSigns || null,
      additionalNotes: initialSnapshot?.additionalNotes || null,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- valores iniciais, só na montagem
    [],
  )
  const [name, setName] = useState(initial.name)
  const [medications, setMedications] = useState<Medication[]>(initial.medications)
  const [orientations, setOrientations] = useState(initial.orientations)
  const [warningSigns, setWarningSigns] = useState<string | null>(initial.warningSigns)
  const [additionalNotes, setAdditionalNotes] = useState<string | null>(initial.additionalNotes)
  const [saving, setSaving] = useState(false)

  const update = (index: number, field: keyof Medication, value: string) =>
    setMedications((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)))

  const meds = medications
    .filter((m) => m.name.trim() && m.posology.trim())
    .map((m) => ({
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

  const nameChanged = name.trim() !== initial.name.trim()
  const medsChanged = JSON.stringify(medications) !== JSON.stringify(initial.medications)
  // O editor de texto rico normaliza o HTML ao abrir; compara o texto, não a marcação.
  const plain = (value: string | null) => (value ? htmlToPlainMultiline(value).trim() : "")
  const notesChanged =
    plain(orientations) !== plain(initial.orientations) ||
    plain(warningSigns) !== plain(initial.warningSigns) ||
    plain(additionalNotes) !== plain(initial.additionalNotes)
  const changedLabel = [nameChanged && "o nome", medsChanged && "os medicamentos", notesChanged && "as orientações"]
    .filter(Boolean)
    .join(", ")
    .replace(/, ([^,]*)$/, " e $1")
  const missing = [!name.trim() && "o nome", !meds.length && "um medicamento com o “como tomar”"].filter(Boolean) as string[]

  async function save() {
    setSaving(true)
    const payload = {
      name: name.trim(),
      snapshot: { medications: meds, ...extras, locationState: getProfileDefaultLocation(doctor) },
    }
    const result = templateId ? await updatePrescriptionTemplateAction(templateId, payload) : await createPrescriptionTemplateAction(payload)
    setSaving(false)
    if (!result.ok) return void toast.error(getFriendlyToastMessage(result.error))
    toast.success(isCreate ? "Modelo criado." : "Modelo atualizado.")
    router.push(LIST_HREF)
    router.refresh()
  }

  const extraNotes = (
    [
      ["Orientações", extras.orientations],
      ["Sinais de alerta", extras.warningSigns],
      ["Anotações", extras.additionalNotes],
    ] as const
  ).filter(([, value]) => value && htmlToPlainMultiline(value).trim())

  return (
    <TemplateFormShell
      backHref={LIST_HREF}
      title={isCreate ? "Novo modelo de receita" : `Editar ${initial.name}`}
      subtitle="Vira atalho em “Começar de um modelo” na receita. A dose pelo peso você ajusta em cada criança."
      suggestion={suggestion}
      suggestionNote="Confira cada medicamento antes de salvar: você é responsável pelo modelo. A dose fica em branco e é ajustada pelo peso em cada criança."
      isCreate={isCreate}
      isDirty={nameChanged || medsChanged || notesChanged}
      missing={missing}
      changedLabel={changedLabel}
      saving={saving}
      onSave={save}
      onDiscard={() => {
        setName(initial.name)
        setMedications(initial.medications)
        setOrientations(initial.orientations)
        setWarningSigns(initial.warningSigns)
        setAdditionalNotes(initial.additionalNotes)
      }}
      preview={
        <DocPaper doctor={doctor} patient={PREVIEW_PATIENT} title="Receituário">
          {meds.length ? (
            meds.map((m, i) => (
              <div key={i}>
                <b className="text-neutral-900">
                  {i + 1}. {m.name}
                </b>
                <div className="pl-3">{[m.dosage ?? "dose pelo peso", m.posology, m.duration && `por ${m.duration}`].filter(Boolean).join(", ")}.</div>
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
      }
    >
      <FormCard id="nome" title="Nome" description="Aparece na lista e no atalho da receita.">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="template-name">Nome do modelo</Label>
          <Input id="template-name" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Otite, IVAS, Febre" />
        </div>
      </FormCard>

      <FormCard id="medicamentos" title="Medicamentos" description="Os mesmos campos da receita.">
        <ul className="flex flex-col gap-2">
          {medications.map((med, index) => (
            <li key={index} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
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
                  onClick={() => setMedications((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : [emptyMedication()]))}
                >
                  <Trash2Icon />
                </Button>
              </div>
              <div className="grid grid-cols-[110px_minmax(0,1fr)_130px] gap-3 pl-6">
                {(
                  [
                    ["dosage", "Dose", "pelo peso"],
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
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setMedications((prev) => [...prev, emptyMedication()])}
          className="flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <PlusIcon className="size-4" aria-hidden />
          Adicionar medicamento
        </button>
      </FormCard>

      <FormCard id="orientacoes" title="Orientações à família" description="Opcional. Entram na receita quando o modelo é usado.">
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
      </FormCard>
    </TemplateFormShell>
  )
}
