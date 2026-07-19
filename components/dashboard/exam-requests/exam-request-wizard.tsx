"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  UserPlus,
  ClipboardList,
  Save,
  FileText,
  FlaskConical,
  Trash2,
  LayoutGrid,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
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
import { ExamCatalogSearch } from "@/components/dashboard/exam-requests/exam-catalog-search"
import { formatDate } from "@/lib/formatters"
import {
  generateExamRequestAction,
  createExamRequestTemplateAction,
  createExamPanelAction,
} from "@/actions"
import type { Patient } from "@/modules/patients/types"
import type { ExamRequestPayload } from "@/modules/exam-requests/types"
import type { ExamCatalogItem } from "@/modules/exam-catalog/types"
import type { ExamPanel } from "@/modules/exam-panels/types"
import type { ExamRequestTemplateSnapshot } from "@/modules/exam-request-templates/types"
import type { ExamRequestTemplateOption } from "@/modules/exam-request-templates/get-exam-request-templates-by-profile-id"

type ExamRequestWizardProfile = {
  id: string
  first_name: string | null
  surname: string | null
  crm: string | null
  rqe?: string | null
  default_location_state?: string | null
  default_location_city?: string | null
}

type ExamRequestWizardProps = {
  patients: Patient[]
  profile: ExamRequestWizardProfile
  examCatalogItems: ExamCatalogItem[]
  examPanels: ExamPanel[]
  examRequestTemplates?: ExamRequestTemplateOption[]
  /** When set, pre-selects this patient (e.g. from `?patientId=`). */
  initialPatientId?: string | null
  /** When set, associates the generated exam request with this case (`?caseId=`). */
  initialCaseId?: string | null
  initialTemplate?: { snapshot: ExamRequestTemplateSnapshot } | null
}

const NEW_EXAM_REQUEST_PATH = "/dashboard/exam-requests/new"

/** De-duplicated append that preserves order (accent/case-sensitive exact match). */
function appendUnique(current: string[], name: string): string[] {
  const trimmed = name.trim()
  if (!trimmed) return current
  if (current.some((e) => e.toLowerCase() === trimmed.toLowerCase()))
    return current
  return [...current, trimmed]
}

export function ExamRequestWizard({
  patients,
  examCatalogItems,
  examPanels,
  examRequestTemplates = [],
  initialPatientId = null,
  initialCaseId = null,
  initialTemplate,
}: ExamRequestWizardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const prevPathnameRef = useRef(pathname)
  const initialPatientFromUrlApplied = useRef(false)
  const initialTemplateApplied = useRef(false)

  const [dataSource, setDataSource] = useState<
    "patient" | "manual" | "template" | null
  >(null)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [manualSheetOpen, setManualSheetOpen] = useState(false)
  const [manualConfirmed, setManualConfirmed] = useState(false)
  const [patientName, setPatientName] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [exams, setExams] = useState<string[]>([])
  const [hypothesis, setHypothesis] = useState("")
  const [observations, setObservations] = useState("")
  const [issuedAt] = useState(format(new Date(), "yyyy-MM-dd"))
  const [generating, setGenerating] = useState(false)
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [savePanelOpen, setSavePanelOpen] = useState(false)
  const [panelName, setPanelName] = useState("")
  const [savingPanel, setSavingPanel] = useState(false)
  const [panelPickerOpen, setPanelPickerOpen] = useState(false)

  useEffect(() => {
    const isOnNewPage = pathname === NEW_EXAM_REQUEST_PATH
    const wasOnOtherPage = prevPathnameRef.current !== NEW_EXAM_REQUEST_PATH
    if (isOnNewPage && wasOnOtherPage) {
      setDataSource(null)
      setSelectedPatient(null)
      setPickerOpen(false)
      setManualSheetOpen(false)
      setManualConfirmed(false)
      setPatientName("")
      setBirthDate("")
      setExams([])
      setHypothesis("")
      setObservations("")
      setSaveAsTemplateOpen(false)
      setTemplateName("")
      setTemplatePickerOpen(false)
      setSavePanelOpen(false)
      setPanelName("")
      setPanelPickerOpen(false)
      initialTemplateApplied.current = false
      initialPatientFromUrlApplied.current = false
    }
    prevPathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    if (!initialTemplate?.snapshot || initialTemplateApplied.current) return
    initialTemplateApplied.current = true
    applyTemplateSnapshot(initialTemplate.snapshot)
    setDataSource("template")
    setManualConfirmed(true)
  }, [initialTemplate])

  useEffect(() => {
    if (initialTemplate?.snapshot) return
    const id = initialPatientId?.trim()
    if (!id || patients.length === 0 || initialPatientFromUrlApplied.current)
      return
    const patient = patients.find((p) => p.id === id)
    if (!patient) return
    initialPatientFromUrlApplied.current = true
    setSelectedPatient(patient)
    setPatientName(patient.name ?? "")
    setBirthDate(patient.birth_date ?? "")
    setDataSource("patient")
    setPickerOpen(false)
  }, [initialPatientId, patients, initialTemplate])

  function applyTemplateSnapshot(snapshot: ExamRequestTemplateSnapshot) {
    setExams(snapshot.exams ?? [])
    setHypothesis(snapshot.hypothesis ?? "")
    setObservations(snapshot.observations ?? "")
  }

  function handleSelectTemplate(template: ExamRequestTemplateOption) {
    applyTemplateSnapshot(template.snapshot)
    setDataSource((prev) => prev ?? "template")
    setManualConfirmed(true)
    setTemplatePickerOpen(false)
    toast.success(`Template "${template.name}" aplicado.`)
  }

  function handleAddExam(name: string) {
    setExams((prev) => appendUnique(prev, name))
  }

  function handleRemoveExam(index: number) {
    setExams((prev) => prev.filter((_, i) => i !== index))
  }

  function handleApplyPanel(panel: ExamPanel) {
    setExams((prev) => {
      let next = prev
      for (const item of panel.panel_items) {
        next = appendUnique(next, item)
      }
      return next
    })
    setPanelPickerOpen(false)
    toast.success(`Painel "${panel.name}" aplicado.`)
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

  function buildPayload(): ExamRequestPayload {
    return {
      patientName: patientName.trim() || undefined,
      birthDate: birthDate.trim() ? formatDate(birthDate) : undefined,
      exams: exams.map((e) => e.trim()).filter(Boolean),
      hypothesis: hypothesis.trim() || undefined,
      observations: observations.trim() || undefined,
    }
  }

  function buildTemplateSnapshot(): ExamRequestTemplateSnapshot | null {
    const cleanExams = exams.map((e) => e.trim()).filter(Boolean)
    if (cleanExams.length === 0 && !hypothesis.trim() && !observations.trim())
      return null
    return {
      exams: cleanExams,
      hypothesis: hypothesis.trim() || undefined,
      observations: observations.trim() || undefined,
    }
  }

  async function handleSaveAsTemplate() {
    const snapshot = buildTemplateSnapshot()
    if (!snapshot) {
      toast.error(
        "Adicione ao menos um exame ou preencha um campo para salvar como template.",
      )
      return
    }
    const name = templateName.trim()
    if (!name) {
      toast.error("Informe o nome do template.")
      return
    }
    setSavingTemplate(true)
    const result = await createExamRequestTemplateAction({ name, snapshot })
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

  async function handleSavePanel() {
    const cleanExams = exams.map((e) => e.trim()).filter(Boolean)
    if (cleanExams.length === 0) {
      toast.error("Adicione pelo menos um exame ao painel.")
      return
    }
    const name = panelName.trim()
    if (!name) {
      toast.error("Informe o nome do painel.")
      return
    }
    setSavingPanel(true)
    const result = await createExamPanelAction({
      name,
      panelItems: cleanExams,
    })
    setSavingPanel(false)
    if (result.ok) {
      toast.success("Painel salvo.")
      setPanelName("")
      setSavePanelOpen(false)
      router.refresh()
    } else {
      toast.error(getFriendlyToastMessage(result.error))
    }
  }

  function handleGenerate() {
    const cleanExams = exams.map((e) => e.trim()).filter(Boolean)
    if (cleanExams.length === 0) {
      toast.error("Adicione pelo menos um exame ao pedido.")
      return
    }
    const payload = buildPayload()
    setGenerating(true)
    generateExamRequestAction({
      payload: { ...payload, birthDate: birthDate.trim() || undefined },
      issuedAt: issuedAt
        ? new Date(issuedAt + "T12:00:00").toISOString().slice(0, 10)
        : undefined,
      patientId: selectedPatient?.id ?? null,
      caseId: initialCaseId?.trim() || null,
    })
      .then((result) => {
        if (result.ok) {
          const blob = new Blob(
            [Uint8Array.from(atob(result.pdfBase64), (c) => c.charCodeAt(0))],
            { type: "application/pdf" },
          )
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = result.filename
          a.click()
          URL.revokeObjectURL(url)
          toast.success("Pedido de exames gerado. Download iniciado.")
          router.push("/dashboard/exam-requests")
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

  return (
    <>
      <div className="space-y-6">
        {/* Passo 1 — Associar ou preencher paciente */}
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">
                Passo 1 — Associar ou preencher paciente
              </CardTitle>
              <CardDescription className="mt-1">
                Associe um paciente cadastrado ou preencha os dados manualmente.
              </CardDescription>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {!hasPatient ? (
                <>
                  <Button
                    type="button"
                    variant={
                      dataSource === "patient" && selectedPatient
                        ? "default"
                        : "outline"
                    }
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
                  disabled={examRequestTemplates.length === 0}
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
                    <p className="font-semibold text-foreground">
                      {selectedPatient.name}
                    </p>
                    <span className="text-muted-foreground">·</span>
                    <p className="text-sm text-muted-foreground">
                      {selectedPatient.birth_date
                        ? format(
                            new Date(selectedPatient.birth_date + "T12:00:00"),
                            "dd/MM/yyyy",
                            { locale: ptBR },
                          )
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
                        ? format(
                            new Date(birthDate + "T12:00:00"),
                            "dd/MM/yyyy",
                            { locale: ptBR },
                          )
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

        {/* Passo 2 — Exames do pedido */}
        {hasPatient ? (
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">
                  Passo 2 — Exames do pedido
                </CardTitle>
                <CardDescription className="mt-1">
                  Busque exames no catálogo, digite exames fora do catálogo e
                  aplique painéis reutilizáveis.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setPanelPickerOpen(true)}
                disabled={examPanels.length === 0}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Aplicar painel
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <ExamCatalogSearch
                items={examCatalogItems}
                selected={exams}
                onAdd={handleAddExam}
              />

              <div className="space-y-2">
                <FieldLabel>Exames adicionados</FieldLabel>
                {exams.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                    Nenhum exame adicionado. Busque acima ou digite um exame.
                  </p>
                ) : (
                  <ul className="divide-y divide-border rounded-md border border-border">
                    {exams.map((exam, index) => (
                      <li
                        key={`${exam}-${index}`}
                        className="flex items-center justify-between gap-2 px-3 py-2"
                      >
                        <span className="truncate text-sm">{exam}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveExam(index)}
                          aria-label="Remover exame"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Field>
                <FieldLabel>Hipótese / indicação</FieldLabel>
                <FieldContent>
                  <Textarea
                    value={hypothesis}
                    onChange={(e) => setHypothesis(e.target.value)}
                    placeholder="Hipótese diagnóstica ou indicação clínica (opcional)"
                    rows={3}
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Observações</FieldLabel>
                <FieldContent>
                  <Textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Observações adicionais (opcional)"
                    rows={3}
                  />
                </FieldContent>
              </Field>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {hasPatient ? (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Dialog open={savePanelOpen} onOpenChange={setSavePanelOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline">
                <LayoutGrid className="mr-2 h-4 w-4" />
                Salvar painel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Salvar painel</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Salve os exames atuais como um painel reutilizável para aplicar
                em outros pedidos.
              </p>
              <Field>
                <FieldLabel>Nome do painel</FieldLabel>
                <FieldContent>
                  <Input
                    value={panelName}
                    onChange={(e) => setPanelName(e.target.value)}
                    placeholder="Ex.: Rotina lactente"
                  />
                </FieldContent>
              </Field>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSavePanelOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSavePanel}
                  disabled={savingPanel}
                >
                  {savingPanel ? "Salvando…" : "Salvar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                Salve os exames, a hipótese e as observações atuais para
                reutilizar em outros pedidos de exames.
              </p>
              <Field>
                <FieldLabel>Nome do template</FieldLabel>
                <FieldContent>
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Ex.: Pedido rotina anual"
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
          <Button onClick={handleGenerate} disabled={generating}>
            <FlaskConical className="mr-2 h-4 w-4" />
            {generating ? "Gerando…" : "Gerar pedido de exames"}
          </Button>
        </div>
      ) : null}

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
            {examRequestTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum template salvo. Gere um pedido de exames e use &quot;Salvar
                como template&quot; para reutilizar depois.
              </p>
            ) : (
              examRequestTemplates.map((template) => (
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

      <Sheet open={panelPickerOpen} onOpenChange={setPanelPickerOpen}>
        <SheetContent side="right" className="flex flex-col sm:max-w-md">
          <SheetHeader className="px-6">
            <SheetTitle>Aplicar painel</SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-1 overflow-auto px-6 py-4">
            {examPanels.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum painel salvo. Adicione exames e use &quot;Salvar
                painel&quot; para reutilizar depois.
              </p>
            ) : (
              examPanels.map((panel) => (
                <Button
                  key={panel.id}
                  type="button"
                  variant="ghost"
                  className="h-auto justify-start py-3 text-left font-normal"
                  onClick={() => handleApplyPanel(panel)}
                >
                  <LayoutGrid className="mr-3 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex flex-col items-start">
                    <span className="truncate">{panel.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {panel.panel_items.join(", ")}
                    </span>
                  </span>
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
