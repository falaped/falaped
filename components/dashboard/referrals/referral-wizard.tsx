"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { UserPlus, ClipboardList, Save, FileText, Share2 } from "lucide-react"
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
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { generateReferralAction, createReferralTemplateAction } from "@/actions"
import type { Patient } from "@/modules/patients/types"
import type { ReferralPayload, ReferralUrgency } from "@/modules/referrals/types"
import type { ReferralTemplateSnapshot } from "@/modules/referral-templates/types"
import type { ReferralTemplateOption } from "@/modules/referral-templates/get-referral-templates-by-profile-id"

/** Common pediatric referral destinations (D-07: picklist + free-text). */
const SPECIALTY_OPTIONS = [
  "Otorrinolaringologia",
  "Oftalmologia",
  "Neuropediatria",
  "Fonoaudiologia",
  "Fisioterapia",
  "Nutrição",
  "Psicologia",
  "Cardiologia pediátrica",
  "Dermatologia",
  "Ortopedia",
  "Outro",
]

const URGENCY_OPTIONS: { value: ReferralUrgency; label: string }[] = [
  { value: "rotina", label: "Rotina" },
  { value: "prioritario", label: "Prioritário" },
  { value: "urgente", label: "Urgente" },
]

type ReferralWizardProfile = {
  id: string
  first_name: string | null
  surname: string | null
  crm: string | null
  rqe?: string | null
  default_location_state?: string | null
  default_location_city?: string | null
}

type ReferralWizardProps = {
  patients: Patient[]
  profile: ReferralWizardProfile
  referralTemplates?: ReferralTemplateOption[]
  /** When set, pre-selects this patient (e.g. from `?patientId=`). */
  initialPatientId?: string | null
  /** When set, associates the generated referral with this case (`?caseId=`). */
  initialCaseId?: string | null
  initialTemplate?: { snapshot: ReferralTemplateSnapshot } | null
}

const NEW_REFERRAL_PATH = "/dashboard/referrals/new"

export function ReferralWizard({
  patients,
  referralTemplates = [],
  initialPatientId = null,
  initialCaseId = null,
  initialTemplate,
}: ReferralWizardProps) {
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
  const [specialty, setSpecialty] = useState("")
  const [reason, setReason] = useState("")
  const [clinicalSummary, setClinicalSummary] = useState("")
  const [urgency, setUrgency] = useState<ReferralUrgency>("rotina")
  const [issuedAt] = useState(format(new Date(), "yyyy-MM-dd"))
  const [generating, setGenerating] = useState(false)
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)

  useEffect(() => {
    const isOnNewPage = pathname === NEW_REFERRAL_PATH
    const wasOnOtherPage = prevPathnameRef.current !== NEW_REFERRAL_PATH
    if (isOnNewPage && wasOnOtherPage) {
      setDataSource(null)
      setSelectedPatient(null)
      setPickerOpen(false)
      setManualSheetOpen(false)
      setManualConfirmed(false)
      setPatientName("")
      setBirthDate("")
      setSpecialty("")
      setReason("")
      setClinicalSummary("")
      setUrgency("rotina")
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

  function applyTemplateSnapshot(snapshot: ReferralTemplateSnapshot) {
    setSpecialty(snapshot.specialty ?? "")
    setReason(snapshot.reason ?? "")
    setClinicalSummary(snapshot.clinicalSummary ?? "")
    setUrgency(snapshot.urgency ?? "rotina")
  }

  function handleSelectTemplate(template: ReferralTemplateOption) {
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

  function buildPayload(): ReferralPayload {
    return {
      patientName: patientName.trim() || undefined,
      birthDate: birthDate.trim() ? formatDate(birthDate) : undefined,
      specialty: specialty.trim(),
      reason: reason.trim(),
      clinicalSummary: clinicalSummary.trim() || undefined,
      urgency,
    }
  }

  function buildTemplateSnapshot(): ReferralTemplateSnapshot | null {
    if (!specialty.trim() && !reason.trim() && !clinicalSummary.trim())
      return null
    return {
      specialty: specialty.trim() || undefined,
      reason: reason.trim() || undefined,
      clinicalSummary: clinicalSummary.trim() || undefined,
      urgency,
    }
  }

  async function handleSaveAsTemplate() {
    const snapshot = buildTemplateSnapshot()
    if (!snapshot) {
      toast.error(
        "Preencha ao menos a especialidade ou o motivo para salvar como template.",
      )
      return
    }
    const name = templateName.trim()
    if (!name) {
      toast.error("Informe o nome do template.")
      return
    }
    setSavingTemplate(true)
    const result = await createReferralTemplateAction({ name, snapshot })
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
    if (!specialty.trim()) {
      toast.error("Informe a especialidade ou serviço de destino.")
      return
    }
    if (!reason.trim()) {
      toast.error("Informe o motivo.")
      return
    }
    const payload = buildPayload()
    setGenerating(true)
    generateReferralAction({
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
          toast.success("Encaminhamento gerado. Download iniciado.")
          router.push("/dashboard/referrals")
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
                  disabled={referralTemplates.length === 0}
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

        {/* Passo 2 — Dados do encaminhamento */}
        {hasPatient ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Passo 2 — Dados do encaminhamento
              </CardTitle>
              <CardDescription className="mt-1">
                Informe a especialidade de destino, o motivo, o resumo clínico e a
                urgência.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field>
                <FieldLabel>Especialidade ou serviço de destino</FieldLabel>
                <FieldContent>
                  <Combobox
                    items={SPECIALTY_OPTIONS}
                    inputValue={specialty}
                    onInputValueChange={(value) => setSpecialty(value)}
                    onValueChange={(value) => {
                      if (typeof value === "string") setSpecialty(value)
                    }}
                  >
                    <ComboboxInput
                      placeholder="Ex.: Otorrinolaringologia"
                      aria-label="Especialidade ou serviço de destino"
                    />
                    <ComboboxContent>
                      <ComboboxEmpty>
                        Nenhuma sugestão. Use o texto digitado.
                      </ComboboxEmpty>
                      <ComboboxList>
                        {(item: string) => (
                          <ComboboxItem key={item} value={item}>
                            {item}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Motivo</FieldLabel>
                <FieldContent>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Motivo do encaminhamento"
                    rows={3}
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Resumo clínico / hipótese</FieldLabel>
                <FieldContent>
                  <Textarea
                    value={clinicalSummary}
                    onChange={(e) => setClinicalSummary(e.target.value)}
                    placeholder="Resumo clínico ou hipótese diagnóstica (opcional)"
                    rows={4}
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Urgência</FieldLabel>
                <FieldContent>
                  <Select
                    value={urgency}
                    onValueChange={(v) => setUrgency(v as ReferralUrgency)}
                  >
                    <SelectTrigger
                      className="w-[220px]"
                      aria-label="Urgência"
                    >
                      <SelectValue placeholder="Urgência" />
                    </SelectTrigger>
                    <SelectContent>
                      {URGENCY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                Salve a especialidade, o motivo, o resumo e a urgência atuais para
                reutilizar em outros encaminhamentos.
              </p>
              <Field>
                <FieldLabel>Nome do template</FieldLabel>
                <FieldContent>
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Ex.: Encaminhamento otorrino"
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
            <Share2 className="mr-2 h-4 w-4" />
            {generating ? "Gerando…" : "Gerar encaminhamento"}
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
            {referralTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum template salvo. Gere um encaminhamento e use &quot;Salvar
                como template&quot; para reutilizar depois.
              </p>
            ) : (
              referralTemplates.map((template) => (
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
