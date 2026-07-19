"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { UserPlus, ClipboardList, Save, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
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
import { formatDate } from "@/lib/formatters"
import {
  generateMedicalReportAction,
  createMedicalReportTemplateAction,
} from "@/actions"
import type { Patient } from "@/modules/patients/types"
import type { MedicalReportPayload } from "@/modules/medical-reports/types"
import type { MedicalReportTemplateSnapshot } from "@/modules/medical-report-templates/types"
import type { MedicalReportTemplateOption } from "@/modules/medical-report-templates/get-medical-report-templates-by-profile-id"

type MedicalReportWizardProfile = {
  id: string
  first_name: string | null
  surname: string | null
  crm: string | null
  rqe?: string | null
  default_location_state?: string | null
  default_location_city?: string | null
}

type MedicalReportWizardProps = {
  patients: Patient[]
  profile: MedicalReportWizardProfile
  medicalReportTemplates?: MedicalReportTemplateOption[]
  /** When set, pre-selects this patient (e.g. from `?patientId=`). */
  initialPatientId?: string | null
  /** When set, associates the generated report with this case (`?caseId=`). */
  initialCaseId?: string | null
  initialTemplate?: { snapshot: MedicalReportTemplateSnapshot } | null
}

const NEW_MEDICAL_REPORT_PATH = "/dashboard/medical-reports/new"

/** Returns true when the TipTap HTML has no meaningful text content. */
function isBodyEmpty(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length === 0
}

export function MedicalReportWizard({
  patients,
  medicalReportTemplates = [],
  initialPatientId = null,
  initialCaseId = null,
  initialTemplate,
}: MedicalReportWizardProps) {
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
  const [title, setTitle] = useState("")
  const [bodyHtml, setBodyHtml] = useState("")
  const [issuedAt] = useState(format(new Date(), "yyyy-MM-dd"))
  const [generating, setGenerating] = useState(false)
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)

  useEffect(() => {
    const isOnNewPage = pathname === NEW_MEDICAL_REPORT_PATH
    const wasOnOtherPage = prevPathnameRef.current !== NEW_MEDICAL_REPORT_PATH
    if (isOnNewPage && wasOnOtherPage) {
      setDataSource(null)
      setSelectedPatient(null)
      setPickerOpen(false)
      setManualSheetOpen(false)
      setManualConfirmed(false)
      setPatientName("")
      setBirthDate("")
      setTitle("")
      setBodyHtml("")
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

  function applyTemplateSnapshot(snapshot: MedicalReportTemplateSnapshot) {
    setTitle(snapshot.title ?? "")
    setBodyHtml(snapshot.bodyHtml ?? "")
  }

  function handleSelectTemplate(template: MedicalReportTemplateOption) {
    applyTemplateSnapshot(template.snapshot)
    setDataSource((prev) => prev ?? "template")
    setManualConfirmed(true)
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

  function buildPayload(): MedicalReportPayload {
    return {
      patientName: patientName.trim() || undefined,
      birthDate: birthDate.trim() ? formatDate(birthDate) : undefined,
      title: title.trim(),
      bodyHtml,
    }
  }

  function buildTemplateSnapshot(): MedicalReportTemplateSnapshot | null {
    if (!title.trim() && isBodyEmpty(bodyHtml)) return null
    return {
      title: title.trim() || undefined,
      bodyHtml: isBodyEmpty(bodyHtml) ? undefined : bodyHtml,
    }
  }

  async function handleSaveAsTemplate() {
    const snapshot = buildTemplateSnapshot()
    if (!snapshot) {
      toast.error(
        "Preencha ao menos o título ou o corpo para salvar como template.",
      )
      return
    }
    const name = templateName.trim()
    if (!name) {
      toast.error("Informe o nome do template.")
      return
    }
    setSavingTemplate(true)
    const result = await createMedicalReportTemplateAction({ name, snapshot })
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
    if (!title.trim()) {
      toast.error("Informe o título ou a finalidade do relatório.")
      return
    }
    if (isBodyEmpty(bodyHtml)) {
      toast.error("Escreva o corpo do relatório.")
      return
    }
    const payload = buildPayload()
    setGenerating(true)
    generateMedicalReportAction({
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
          toast.success("Relatório gerado. Download iniciado.")
          router.push("/dashboard/medical-reports")
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
                  disabled={medicalReportTemplates.length === 0}
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

        {/* Passo 2 — Dados do relatório */}
        {hasPatient ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Passo 2 — Dados do relatório
              </CardTitle>
              <CardDescription className="mt-1">
                Informe o título ou a finalidade e escreva o corpo do relatório.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field>
                <FieldLabel>Título ou finalidade</FieldLabel>
                <FieldContent>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex.: Relatório clínico para escola"
                    aria-label="Título ou finalidade"
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Corpo do relatório</FieldLabel>
                <FieldContent>
                  <RichTextEditor
                    value={bodyHtml}
                    onChange={setBodyHtml}
                    placeholder="Escreva o relatório…"
                    minHeight="240px"
                  />
                </FieldContent>
              </Field>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {hasPatient ? (
        <div className="mt-6 flex flex-wrap items-center gap-2">
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
                Salve o título e o corpo atuais para reutilizar em outros
                relatórios.
              </p>
              <Field>
                <FieldLabel>Nome do template</FieldLabel>
                <FieldContent>
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Ex.: Relatório escolar"
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
            <FileText className="mr-2 h-4 w-4" />
            {generating ? "Gerando…" : "Gerar relatório"}
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
            {medicalReportTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum template salvo. Gere um relatório e use &quot;Salvar como
                template&quot; para reutilizar depois.
              </p>
            ) : (
              medicalReportTemplates.map((template) => (
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
