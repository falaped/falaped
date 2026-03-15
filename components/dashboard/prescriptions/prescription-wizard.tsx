"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { UserPlus, ClipboardList, ChevronLeft, MapPin, Plus, Trash2, Save, LayoutTemplate } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldContent,
  FieldError,
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
import { MedicalCertificatePatientPickerSheet } from "@/components/dashboard/medical-certificates/medical-certificate-patient-picker-sheet"
import { DatePickerField } from "@/components/dashboard/medical-certificates/date-picker-field"
import { useLocationState } from "@/components/dashboard/medical-certificates/use-location-state"
import { formatDate } from "@/lib/formatters"
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
      Passo {currentStep} de 4
    </p>
  )
}

type Step = 1 | 2 | 3 | 4

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
}

type PrescriptionWizardProps = {
  patients: Patient[]
  profile: PrescriptionWizardProfile
  prescriptionTemplates?: PrescriptionTemplateOption[]
  initialTemplate?: { snapshot: PrescriptionTemplateSnapshot } | null
}

function applySnapshotToMedications(
  snapshot: PrescriptionTemplateSnapshot,
): Array<{ name: string; dosage: string; posology: string; duration: string; observations: string }> {
  const meds = snapshot.medications ?? []
  if (meds.length === 0) return [initialMedication()]
  return meds.map((m) => ({
    name: m.name ?? "",
    dosage: m.dosage ?? "",
    posology: m.posology ?? "",
    duration: m.duration ?? "",
    observations: m.observations ?? "",
  }))
}

export function PrescriptionWizard({
  patients,
  profile,
  prescriptionTemplates = [],
  initialTemplate,
}: PrescriptionWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [dataSource, setDataSource] = useState<"patient" | "manual" | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [patientName, setPatientName] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [medications, setMedications] = useState<Array<{ name: string; dosage: string; posology: string; duration: string; observations: string }>>([
    initialMedication(),
  ])
  const [locationState, setLocationState] = useState("")
  const [issuedAt, setIssuedAt] = useState(format(new Date(), "yyyy-MM-dd"))
  const [orientations, setOrientations] = useState("")
  const [warningSigns, setWarningSigns] = useState("")
  const [additionalNotes, setAdditionalNotes] = useState("")
  const [generating, setGenerating] = useState(false)
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)

  const { state: geoState, loading: geoLoading, error: geoError, requestLocation } = useLocationState((s) => setLocationState(s))

  const initialTemplateApplied = useRef(false)
  useEffect(() => {
    if (!initialTemplate?.snapshot || initialTemplateApplied.current) return
    initialTemplateApplied.current = true
    const s = initialTemplate.snapshot
    setMedications(applySnapshotToMedications(s))
    setOrientations(s.orientations ?? "")
    setWarningSigns(s.warningSigns ?? "")
    setAdditionalNotes(s.additionalNotes ?? "")
    if (s.locationState?.trim()) setLocationState(s.locationState.trim())
    setDataSource("template")
    setStep(2)
  }, [initialTemplate])

  function applyTemplateSnapshot(snapshot: PrescriptionTemplateSnapshot) {
    setMedications(applySnapshotToMedications(snapshot))
    setOrientations(snapshot.orientations ?? "")
    setWarningSigns(snapshot.warningSigns ?? "")
    setAdditionalNotes(snapshot.additionalNotes ?? "")
    if (snapshot.locationState?.trim()) setLocationState(snapshot.locationState.trim())
    setDataSource("template")
    setStep(2)
  }

  function handleSelectPatient(patient: Patient) {
    setSelectedPatient(patient)
    setPatientName(patient.name ?? "")
    setBirthDate(patient.birth_date ?? "")
    setPickerOpen(false)
  }

  function handleDataSourceManual() {
    setDataSource("manual")
    setStep(2)
  }

  function handleDataSourcePatientChosen() {
    setDataSource("patient")
    setStep(2)
  }

  function addMedication() {
    setMedications((prev) => [...prev, initialMedication()])
  }

  function removeMedication(index: number) {
    setMedications((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))
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
      locationState: (locationState || geoState).trim() || undefined,
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
      toast.error(result.error)
    }
  }

  function handleGenerate() {
    const payload = buildPayload()
    if (payload.medications.length === 0) {
      toast.error("Adicione pelo menos um medicamento com nome e posologia.")
      return
    }
    const location = locationState || geoState
    if (!location.trim()) {
      toast.error("Informe o Estado (ex.: São Paulo).")
      return
    }
    setGenerating(true)
    generatePrescriptionAction({
      payload: { ...payload, birthDate: birthDate.trim() || undefined },
      locationState: location.trim(),
      issuedAt: issuedAt ? new Date(issuedAt + "T12:00:00").toISOString().slice(0, 10) : undefined,
      patientId: selectedPatient?.id ?? null,
      caseId: null,
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
          toast.error(result.error)
        }
      })
      .finally(() => setGenerating(false))
  }

  if (step === 1) {
    return (
      <>
        <Card>
          <CardHeader>
            <WizardStepper currentStep={1} />
            <CardTitle className="mt-2">Como deseja preencher os dados?</CardTitle>
            <CardDescription>
              Associe a um paciente, use um template ou preencha manualmente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card
                className={cn(
                  "cursor-pointer border transition-colors hover:border-primary/20 hover:bg-muted/30",
                  selectedPatient && "border-primary/30 bg-muted/20",
                )}
                onClick={() => !selectedPatient && setPickerOpen(true)}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col gap-2">
                    <UserPlus className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-medium text-foreground">
                      Associar a um paciente
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Use nome e data de nascimento do cadastro.
                    </p>
                    {selectedPatient && (
                      <div className="mt-3 space-y-1 rounded-md border border-border bg-background/50 p-3 text-sm">
                        <p className="font-medium text-foreground">
                          {selectedPatient.name}
                        </p>
                        <p className="text-muted-foreground">
                          {selectedPatient.birth_date
                            ? `Nascimento: ${format(new Date(selectedPatient.birth_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}`
                            : "Data de nascimento não informada"}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            setPickerOpen(true)
                          }}
                        >
                          Trocar paciente
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer border transition-colors hover:border-primary/20 hover:bg-muted/30"
                onClick={handleDataSourceManual}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col gap-2">
                    <ClipboardList className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-medium text-foreground">
                      Preencher manualmente
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Informe os dados manualmente no próximo passo.
                    </p>
                  </div>
                </CardContent>
              </Card>
              {prescriptionTemplates.length > 0 && (
                <Dialog open={templatePickerOpen} onOpenChange={setTemplatePickerOpen}>
                  <Card
                    className="cursor-pointer border transition-colors hover:border-primary/20 hover:bg-muted/30"
                    onClick={() => setTemplatePickerOpen(true)}
                  >
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-2">
                        <LayoutTemplate className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-medium text-foreground">
                          Usar um template
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Preencher com um modelo que você salvou.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Escolher template</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                      Selecione um template para preencher medicamentos e orientações.
                    </p>
                    <div className="flex flex-col gap-2 py-2">
                      {prescriptionTemplates.map((t) => (
                        <Button
                          key={t.id}
                          variant="outline"
                          className="justify-start text-left"
                          onClick={() => {
                            applyTemplateSnapshot(t.snapshot)
                            setTemplatePickerOpen(false)
                          }}
                        >
                          {t.name}
                        </Button>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/prescriptions">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
          {selectedPatient && (
            <Button onClick={handleDataSourcePatientChosen}>
              Continuar
            </Button>
          )}
        </div>
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
    return (
      <Card>
        <CardHeader>
          <WizardStepper currentStep={2} />
          <CardTitle className="mt-2">Dados da receita</CardTitle>
          <CardDescription>
            Preencha os medicamentos e informe o Estado e a data de emissão.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Paciente
            </h4>
            {dataSource === "patient" && selectedPatient ? (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="font-medium text-foreground">{selectedPatient.name}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {selectedPatient.birth_date
                    ? `Nascimento: ${format(new Date(selectedPatient.birth_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}`
                    : "Data de nascimento não informada"}
                </p>
              </div>
            ) : (
              <>
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
              </>
            )}
          </section>

          <Separator />

          <section className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Medicamentos
            </h4>
            {medications.map((med, index) => (
              <div
                key={index}
                className="rounded-lg border border-border bg-muted/20 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Medicamento {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMedication(index)}
                    disabled={medications.length === 1}
                    aria-label="Remover medicamento"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Nome do medicamento</FieldLabel>
                    <FieldContent>
                      <Input
                        value={med.name}
                        onChange={(e) => updateMedication(index, "name", e.target.value)}
                        placeholder="Ex.: Paracetamol"
                      />
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel>Dosagem</FieldLabel>
                    <FieldContent>
                      <Input
                        value={med.dosage}
                        onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                        placeholder="Ex.: 500mg"
                      />
                    </FieldContent>
                  </Field>
                </div>
                <Field>
                  <FieldLabel>Posologia</FieldLabel>
                  <FieldContent>
                    <Input
                      value={med.posology}
                      onChange={(e) => updateMedication(index, "posology", e.target.value)}
                      placeholder="Ex.: 1 comprimido de 8 em 8 horas"
                    />
                  </FieldContent>
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Duração</FieldLabel>
                    <FieldContent>
                      <Input
                        value={med.duration}
                        onChange={(e) => updateMedication(index, "duration", e.target.value)}
                        placeholder="Ex.: 7 dias"
                      />
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel>Observações</FieldLabel>
                    <FieldContent>
                      <Input
                        value={med.observations}
                        onChange={(e) => updateMedication(index, "observations", e.target.value)}
                        placeholder="Opcional"
                      />
                    </FieldContent>
                  </Field>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addMedication}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar medicamento
            </Button>
          </section>

          <Separator />

          <section className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Local e data
            </h4>
            <Field>
              <FieldLabel>Estado (local da receita)</FieldLabel>
              <FieldContent className="flex gap-2">
                <Input
                  value={locationState || geoState}
                  onChange={(e) => setLocationState(e.target.value)}
                  placeholder="Ex.: São Paulo"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={requestLocation}
                  disabled={geoLoading}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  {geoLoading ? "Obtendo…" : "Usar minha localização"}
                </Button>
              </FieldContent>
              {geoError && <FieldError errors={[{ message: geoError }]} />}
            </Field>
            <DatePickerField
              label="Data de emissão"
              value={issuedAt}
              onChange={setIssuedAt}
              placeholder="Selecione a data"
            />
          </section>

          <Separator />

          <section className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Orientações e anotações
            </h4>
            <Field>
              <FieldLabel>Orientações</FieldLabel>
              <FieldContent>
                <Textarea
                  value={orientations}
                  onChange={(e) => setOrientations(e.target.value)}
                  placeholder="Orientações gerais para o paciente/responsável"
                  rows={3}
                  className="resize-none"
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Sinais de alerta</FieldLabel>
              <FieldContent>
                <Textarea
                  value={warningSigns}
                  onChange={(e) => setWarningSigns(e.target.value)}
                  placeholder="Sinais de alerta para retornar ao médico"
                  rows={3}
                  className="resize-none"
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Anotações adicionais</FieldLabel>
              <FieldContent>
                <Textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Opcional"
                  rows={2}
                  className="resize-none"
                />
              </FieldContent>
            </Field>
          </section>
        </CardContent>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={() => setStep(1)}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
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
          <Button onClick={() => setStep(3)}>Revisar</Button>
        </div>
      </Card>
    )
  }

  if (step === 3) {
    const payload = buildPayload()
    const issuedAtFormatted = issuedAt
      ? format(new Date(issuedAt + "T12:00:00"), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
      : ""
    const doctor = {
      firstName: profile.first_name ?? "",
      surname: profile.surname ?? "",
      crm: profile.crm ?? null,
    }
    const payloadForPreview: PrescriptionPayload = {
      ...payload,
      birthDate: birthDate.trim() ? formatDate(birthDate) : undefined,
    }
    const paragraphs = getPrescriptionPreviewParagraphs(
      payloadForPreview,
      doctor,
      locationState || geoState || "—",
      issuedAtFormatted,
    )

    return (
      <Card>
        <CardHeader>
          <WizardStepper currentStep={3} />
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
            <Button variant="ghost" onClick={() => setStep(2)}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button onClick={() => setStep(4)}>Confirmar e gerar</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === 4) {
    return (
      <Card>
        <CardHeader>
          <WizardStepper currentStep={4} />
          <CardTitle className="mt-2">Confirmar e gerar</CardTitle>
          <CardDescription>
            Clique em &quot;Confirmar e gerar&quot; para gerar o PDF, salvar e fazer o download.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(3)}>
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
