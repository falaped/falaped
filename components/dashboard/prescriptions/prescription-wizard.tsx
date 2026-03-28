"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { UserPlus, ClipboardList, ChevronLeft, Plus, Trash2, Save, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import {
  Field,
  FieldContent,
  FieldLabel,
} from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { MedicalCertificatePatientPickerSheet } from "@/components/dashboard/medical-certificates/medical-certificate-patient-picker-sheet"
import { DatePickerField } from "@/components/dashboard/medical-certificates/date-picker-field"
import { formatDate } from "@/lib/formatters"
import { getProfileDefaultLocation } from "@/modules/profiles/get-profile-default-location"
import { generatePrescriptionAction, createPrescriptionTemplateAction } from "@/actions"
import type { Patient } from "@/modules/patients/types"
import type { PrescriptionPayload } from "@/modules/prescriptions/types"
import { getPrescriptionPreviewParagraphs } from "@/modules/prescriptions/get-prescription-preview-paragraphs"
import type { PrescriptionTemplateSnapshot } from "@/modules/prescription-templates/types"
import type { PrescriptionTemplateOption } from "@/modules/prescription-templates/get-prescription-templates-by-profile-id"
import { cn } from "@/lib/utils"

function WizardStepper({ currentStep }: { currentStep: Step }) {
  return (
    <p className="text-sm text-muted-foreground">
      Passo {currentStep} de 3
    </p>
  )
}

type Step = 1 | 2 | 3

const initialMedication = () => ({
  name: "",
  dosage: "",
  posology: "",
  duration: "",
  observations: "",
})

type PrescriptionWizardProfile = {
  id: string
  first_name: string | null
  surname: string | null
  crm: string | null
  rqe?: string | null
  default_location_state?: string | null
  default_location_city?: string | null
}

type PrescriptionWizardProps = {
  patients: Patient[]
  profile: PrescriptionWizardProfile
  prescriptionTemplates?: PrescriptionTemplateOption[]
  initialTemplate?: { snapshot: PrescriptionTemplateSnapshot } | null
  /** When set, pre-selects this patient (e.g. from `?patientId=` on new prescription page). */
  initialPatientId?: string | null
  /** When set, associates the generated prescription with this case (`?caseId=`). */
  initialCaseId?: string | null
}

function applySnapshotToMedications(
  snapshot: PrescriptionTemplateSnapshot,
): Array<{ name: string; dosage: string; posology: string; duration: string; observations: string }> {
  const meds = snapshot.medications ?? []
  if (meds.length === 0) return []
  return meds.map((m) => ({
    name: m.name ?? "",
    dosage: m.dosage ?? "",
    posology: m.posology ?? "",
    duration: m.duration ?? "",
    observations: m.observations ?? "",
  }))
}

const NEW_PRESCRIPTION_PATH = "/dashboard/prescriptions/new"

export function PrescriptionWizard({
  patients,
  profile,
  prescriptionTemplates = [],
  initialTemplate,
  initialPatientId = null,
  initialCaseId = null,
}: PrescriptionWizardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const prevPathnameRef = useRef(pathname)
  const initialPatientFromUrlApplied = useRef(false)

  const [step, setStep] = useState<Step>(1)
  const [dataSource, setDataSource] = useState<"patient" | "manual" | "template" | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [manualSheetOpen, setManualSheetOpen] = useState(false)
  const [manualConfirmed, setManualConfirmed] = useState(false)
  const [patientName, setPatientName] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [medications, setMedications] = useState<Array<{ name: string; dosage: string; posology: string; duration: string; observations: string }>>(
    [],
  )
  const [issuedAt] = useState(format(new Date(), "yyyy-MM-dd"))
  const [orientations, setOrientations] = useState("")
  const [warningSigns, setWarningSigns] = useState("")
  const [additionalNotes, setAdditionalNotes] = useState("")
  const [generating, setGenerating] = useState(false)
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)

  const initialTemplateApplied = useRef(false)

  useEffect(() => {
    const isOnNewPrescriptionPage = pathname === NEW_PRESCRIPTION_PATH
    const wasOnOtherPage = prevPathnameRef.current !== NEW_PRESCRIPTION_PATH
    if (isOnNewPrescriptionPage && wasOnOtherPage) {
      setStep(1)
      setDataSource(null)
      setSelectedPatient(null)
      setPickerOpen(false)
      setManualSheetOpen(false)
      setManualConfirmed(false)
      setPatientName("")
      setBirthDate("")
      setMedications([])
      setOrientations("")
      setWarningSigns("")
      setAdditionalNotes("")
      setSaveAsTemplateOpen(false)
      setTemplateName("")
      setTemplatePickerOpen(false)
      initialTemplateApplied.current = false
      initialPatientFromUrlApplied.current = false
    }
    prevPathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    if (!initialTemplate?.snapshot || initialTemplateApplied.current) return
    initialTemplateApplied.current = true
    const s = initialTemplate.snapshot
    setMedications(applySnapshotToMedications(s))
    setOrientations(s.orientations ?? "")
    setWarningSigns(s.warningSigns ?? "")
    setAdditionalNotes(s.additionalNotes ?? "")
    setDataSource("template")
    setManualConfirmed(true)
    setStep(1)
  }, [initialTemplate])

  useEffect(() => {
    if (initialTemplate?.snapshot) return
    const id = initialPatientId?.trim()
    if (!id || patients.length === 0 || initialPatientFromUrlApplied.current) return
    const patient = patients.find((p) => p.id === id)
    if (!patient) return
    initialPatientFromUrlApplied.current = true
    setSelectedPatient(patient)
    setPatientName(patient.name ?? "")
    setBirthDate(patient.birth_date ?? "")
    setDataSource("patient")
    setPickerOpen(false)
  }, [initialPatientId, patients, initialTemplate])

  function applyTemplateSnapshot(snapshot: PrescriptionTemplateSnapshot) {
    setMedications(applySnapshotToMedications(snapshot))
    setOrientations(snapshot.orientations ?? "")
    setWarningSigns(snapshot.warningSigns ?? "")
    setAdditionalNotes(snapshot.additionalNotes ?? "")
    setDataSource("template")
    setManualConfirmed(true)
  }

  function handleSelectTemplate(template: PrescriptionTemplateOption) {
    applyTemplateSnapshot(template.snapshot)
    setTemplatePickerOpen(false)
    toast.success(`Template "${template.name}" aplicado.`)
  }

  function handleSelectPatient(patient: Patient) {
    setSelectedPatient(patient)
    setPatientName(patient.name ?? "")
    setBirthDate(patient.birth_date ?? "")
    setDataSource("patient")
    setPickerOpen(false)
  }

  function handleDataSourceManual() {
    if (dataSource === "patient" && selectedPatient) {
      setPatientName("")
      setBirthDate("")
    }
    setManualSheetOpen(true)
  }

  function handleConfirmManualEntry() {
    setDataSource("manual")
    setManualConfirmed(true)
    setSelectedPatient(null)
    setManualSheetOpen(false)
  }

  function handleOpenPatientPicker() {
    setPickerOpen(true)
  }

  function handleRemovePatient() {
    setSelectedPatient(null)
    setDataSource(null)
    setManualConfirmed(false)
    setPatientName("")
    setBirthDate("")
  }

  function addMedication() {
    setMedications((prev) => [...prev, initialMedication()])
  }

  function removeMedication(index: number) {
    setMedications((prev) => prev.filter((_, i) => i !== index))
  }

  function updateMedication(index: number, field: string, value: string) {
    setMedications((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    )
  }

  function buildPayload(): PrescriptionPayload {
    return {
      patientName: patientName.trim() || undefined,
      birthDate: birthDate.trim() ? formatDate(birthDate) : undefined,
      medications: medications
        .filter((m) => m.name.trim() && m.posology.trim())
        .map((m) => ({
          name: m.name.trim(),
          dosage: m.dosage.trim() || undefined,
          posology: m.posology.trim(),
          duration: m.duration.trim() || undefined,
          observations: m.observations.trim() || undefined,
        })),
      orientations: orientations.trim() || undefined,
      warningSigns: warningSigns.trim() || undefined,
      additionalNotes: additionalNotes.trim() || undefined,
    }
  }

  function buildTemplateSnapshot() {
    const meds = medications
      .filter((m) => m.name.trim() && m.posology.trim())
      .map((m) => ({
        name: m.name.trim(),
        dosage: m.dosage.trim() || undefined,
        posology: m.posology.trim(),
        duration: m.duration.trim() || undefined,
        observations: m.observations.trim() || undefined,
      }))
    if (meds.length === 0) return null
    return {
      medications: meds,
      orientations: orientations.trim() || undefined,
      warningSigns: warningSigns.trim() || undefined,
      additionalNotes: additionalNotes.trim() || undefined,
      locationState: getProfileDefaultLocation(profile),
    }
  }

  async function handleSaveAsTemplate() {
    const snapshot = buildTemplateSnapshot()
    if (!snapshot) {
      toast.error("Adicione pelo menos um medicamento com nome e posologia para salvar como template.")
      return
    }
    const name = templateName.trim()
    if (!name) {
      toast.error("Informe o nome do template.")
      return
    }
    setSavingTemplate(true)
    const result = await createPrescriptionTemplateAction({ name, snapshot })
    setSavingTemplate(false)
    if (result.ok) {
      toast.success("Template salvo.")
      setTemplateName("")
      setSaveAsTemplateOpen(false)
      router.refresh()
    } else {
      toast.error(getFriendlyToastMessage(result.error))
    }
  }

  function handleGenerate() {
    const payload = buildPayload()
    if (payload.medications.length === 0) {
      toast.error("Adicione pelo menos um medicamento com nome e posologia.")
      return
    }
    setGenerating(true)
    generatePrescriptionAction({
      payload: { ...payload, birthDate: birthDate.trim() || undefined },
      issuedAt: issuedAt ? new Date(issuedAt + "T12:00:00").toISOString().slice(0, 10) : undefined,
      patientId: selectedPatient?.id ?? null,
      caseId: initialCaseId?.trim() || null,
    })
      .then((result) => {
        if (result.ok) {
          const blob = new Blob([Uint8Array.from(atob(result.pdfBase64), (c) => c.charCodeAt(0))], {
            type: "application/pdf",
          })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = result.filename
          a.click()
          URL.revokeObjectURL(url)
          toast.success("Receita gerada. Download iniciado.")
          router.push("/dashboard/prescriptions")
          router.refresh()
        } else {
          toast.error(getFriendlyToastMessage(result.error))
        }
      })
      .finally(() => setGenerating(false))
  }

  const hasPatient =
    (dataSource === "patient" && selectedPatient) ||
    ((dataSource === "manual" || dataSource === "template") && manualConfirmed)

  if (step === 1) {
    return (
      <>
        <div className="space-y-6">
          {/* Passo 1 - Associar ou preencher manualmente um paciente */}
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Passo 1 — Associar ou preencher paciente</CardTitle>
                <CardDescription className="mt-1">
                  Associe um paciente cadastrado ou preencha os dados manualmente.
                </CardDescription>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {!hasPatient ? (
                  <>
                    <Button
                      type="button"
                      variant={dataSource === "patient" && selectedPatient ? "default" : "outline"}
                      size="sm"
                      onClick={handleOpenPatientPicker}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Associar paciente
                    </Button>
                    <Button
                      type="button"
                      variant={dataSource === "manual" ? "default" : "outline"}
                      size="sm"
                      onClick={handleDataSourceManual}
                    >
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Preencher manualmente
                    </Button>
                  </>
                ) : null}
                {hasPatient ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTemplatePickerOpen(true)}
                    disabled={prescriptionTemplates.length === 0}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Usar template
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {dataSource === "patient" && selectedPatient ? (
                <div className="rounded-lg border border-border bg-muted/30 px-5 py-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="font-semibold text-foreground">{selectedPatient.name}</p>
                      <span className="text-muted-foreground">·</span>
                      <p className="text-sm text-muted-foreground">
                        {selectedPatient.birth_date
                          ? format(new Date(selectedPatient.birth_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                          : "Data de nascimento não informada"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleRemovePatient}
                    >
                      Remover paciente
                    </Button>
                  </div>
                </div>
              ) : hasPatient ? (
                <div className="rounded-lg border border-border bg-muted/30 px-5 py-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="font-semibold text-foreground">
                        {patientName.trim() || "Nome não informado"}
                      </p>
                      <span className="text-muted-foreground">·</span>
                      <p className="text-sm text-muted-foreground">
                        {birthDate.trim()
                          ? format(new Date(birthDate + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                          : "Data de nascimento não informada"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleRemovePatient}
                    >
                      Remover paciente
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Passo 2 - Adicionar medicamentos */}
          {hasPatient ? (
            <Card>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">Passo 2 — Adicionar medicamentos</CardTitle>
                  <CardDescription className="mt-1">
                    Inclua os medicamentos da receita com dosagem e posologia.
                  </CardDescription>
                </div>
                {medications.length === 0 ? (
                  <Button type="button" variant="outline" size="sm" onClick={addMedication}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar medicamento
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-4">
                {medications.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      Nenhum medicamento adicionado. Clique no botão acima para adicionar.
                    </p>
                  </div>
                ) : (
                  <>
                    <ul className="space-y-4">
                      {medications.map((med, index) => (
                        <li
                          key={index}
                          className="rounded-lg border border-border bg-muted/20 p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-muted-foreground">
                              Medicamento {index + 1}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeMedication(index)}
                              aria-label="Remover medicamento"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid gap-3">
                            <Field>
                              <FieldLabel>Nome</FieldLabel>
                              <FieldContent>
                                <Input
                                  value={med.name}
                                  onChange={(e) => updateMedication(index, "name", e.target.value)}
                                  placeholder="Ex.: Paracetamol"
                                />
                              </FieldContent>
                            </Field>
                            <div className="grid gap-3 sm:grid-cols-3">
                              <Field>
                                <FieldLabel>Dosagem</FieldLabel>
                                <FieldContent>
                                  <Input
                                    value={med.dosage}
                                    onChange={(e) =>
                                      updateMedication(index, "dosage", e.target.value)
                                    }
                                    placeholder="Ex.: 500mg"
                                  />
                                </FieldContent>
                              </Field>
                              <Field>
                                <FieldLabel>Posologia</FieldLabel>
                                <FieldContent>
                                  <Input
                                    value={med.posology}
                                    onChange={(e) =>
                                      updateMedication(index, "posology", e.target.value)
                                    }
                                    placeholder="Ex.: 1 comprimido de 8 em 8 horas"
                                  />
                                </FieldContent>
                              </Field>
                              <Field>
                                <FieldLabel>Duração</FieldLabel>
                                <FieldContent>
                                  <Input
                                    value={med.duration}
                                    onChange={(e) =>
                                      updateMedication(index, "duration", e.target.value)
                                    }
                                    placeholder="Ex.: 7 dias"
                                  />
                                </FieldContent>
                              </Field>
                            </div>
                            <Field>
                              <FieldLabel>Observações</FieldLabel>
                              <FieldContent>
                                <RichTextEditor
                                  value={med.observations}
                                  onChange={(value) =>
                                    updateMedication(index, "observations", value)
                                  }
                                  placeholder="Opcional"
                                  minHeight="60px"
                                />
                              </FieldContent>
                            </Field>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <Button type="button" variant="outline" size="sm" onClick={addMedication}>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar medicamento
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* Passo 3 - Instruções e informações adicionais */}
          {hasPatient ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Passo 3 — Instruções e informações adicionais</CardTitle>
                <CardDescription className="mt-1">
                  Orientações, sinais de alerta e anotações do médico.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <FieldLabel>Orientações</FieldLabel>
                  <RichTextEditor
                    value={orientations}
                    onChange={setOrientations}
                    placeholder="Orientações gerais para o paciente/responsável"
                    minHeight="80px"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Sinais de alerta</FieldLabel>
                  <RichTextEditor
                    value={warningSigns}
                    onChange={setWarningSigns}
                    placeholder="Sinais de alerta para retorno ou urgência"
                    minHeight="80px"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Anotações adicionais</FieldLabel>
                  <RichTextEditor
                    value={additionalNotes}
                    onChange={setAdditionalNotes}
                    placeholder="Anotações do médico (opcional)"
                    minHeight="80px"
                  />
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {hasPatient ? (
            <>
              <Dialog open={saveAsTemplateOpen} onOpenChange={setSaveAsTemplateOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline">
                    <Save className="mr-2 h-4 w-4" />
                    Salvar como template
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Salvar como template</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    Salve os medicamentos, orientações e anotações atuais para usar em outras receitas.
                  </p>
                  <Field>
                    <FieldLabel>Nome do template</FieldLabel>
                    <FieldContent>
                      <Input
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Ex.: Receita resfriado comum"
                      />
                    </FieldContent>
                  </Field>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSaveAsTemplateOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveAsTemplate}
                      disabled={savingTemplate}
                    >
                      {savingTemplate ? "Salvando…" : "Salvar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button onClick={() => setStep(2)}>Revisar</Button>
            </>
          ) : null}
        </div>

      <Sheet open={manualSheetOpen} onOpenChange={setManualSheetOpen}>
        <SheetContent side="right" className="flex flex-col sm:max-w-md">
          <SheetHeader className="px-6">
            <SheetTitle>Dados do paciente</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-6 pt-4">
            <Field>
              <FieldLabel>Nome do paciente</FieldLabel>
              <FieldContent>
                <Input
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Nome completo"
                />
              </FieldContent>
            </Field>
            <DatePickerField
              label="Data de nascimento"
              value={birthDate}
              onChange={setBirthDate}
              placeholder="Selecione a data"
            />
            <Button
              type="button"
              className="mt-2 w-full"
              onClick={handleConfirmManualEntry}
            >
              Concluir
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={templatePickerOpen} onOpenChange={setTemplatePickerOpen}>
        <SheetContent side="right" className="flex flex-col sm:max-w-md">
          <SheetHeader className="px-6">
            <SheetTitle>Usar template</SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-1 overflow-auto px-6 py-4">
            {prescriptionTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum template salvo. Crie uma receita e use &quot;Salvar como template&quot; para
                reutilizar depois.
              </p>
            ) : (
              prescriptionTemplates.map((template) => (
                <Button
                  key={template.id}
                  type="button"
                  variant="ghost"
                  className="h-auto justify-start py-3 text-left font-normal"
                  onClick={() => handleSelectTemplate(template)}
                >
                  <FileText className="mr-3 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{template.name}</span>
                </Button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <MedicalCertificatePatientPickerSheet
          patients={patients}
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelect={handleSelectPatient}
        />
      </>
    )
  }

  if (step === 2) {
    const payload = buildPayload()
    const issuedAtFormatted = issuedAt
      ? format(new Date(issuedAt + "T12:00:00"), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
      : ""
    const doctor = {
      firstName: profile.first_name ?? "",
      surname: profile.surname ?? "",
      crm: profile.crm ?? null,
      rqe: profile.rqe ?? null,
    }
    const payloadForPreview: PrescriptionPayload = {
      ...payload,
      birthDate: birthDate.trim() ? formatDate(birthDate) : undefined,
    }
    const locationDisplay = getProfileDefaultLocation(profile)
    const paragraphs = getPrescriptionPreviewParagraphs(
      payloadForPreview,
      doctor,
      locationDisplay,
      issuedAtFormatted,
    )

    return (
      <Card>
        <CardHeader>
          <WizardStepper currentStep={2} />
          <CardTitle className="mt-2">Preview da receita</CardTitle>
          <CardDescription>
            Confira como ficará a receita. Ao confirmar, o PDF será gerado, salvo e disponível para download.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="mx-auto max-w-[21cm] rounded-md border border-border bg-zinc-50/80 p-6 shadow-sm dark:bg-zinc-900/50"
            style={{ aspectRatio: "210/297" }}
          >
            <p className="mb-4 text-xs uppercase tracking-wide text-muted-foreground">
              Receita médica
            </p>
            <div className="space-y-3 text-sm leading-relaxed text-foreground">
              {paragraphs.map((line, i) =>
                line === "_________________________" ? (
                  <div
                    key={i}
                    className="my-4 border-b border-border"
                    aria-hidden
                  />
                ) : (
                  <p
                    key={i}
                    className={cn(
                      "whitespace-pre-wrap",
                      line.includes("\n") && "font-medium",
                    )}
                  >
                    {line}
                  </p>
                ),
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button onClick={() => setStep(3)}>Confirmar e gerar</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === 3) {
    return (
      <Card>
        <CardHeader>
          <WizardStepper currentStep={3} />
          <CardTitle className="mt-2">Confirmar e gerar</CardTitle>
          <CardDescription>
            Clique em &quot;Confirmar e gerar&quot; para gerar o PDF, salvar e fazer o download.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(2)}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? "Gerando…" : "Confirmar e gerar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
