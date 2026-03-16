"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  UserPlus,
  ClipboardList,
  Stethoscope,
  UserCircle,
  ChevronLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Checkbox } from "@/components/ui/checkbox"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { MedicalCertificatePatientPickerSheet } from "./medical-certificate-patient-picker-sheet"
import { DatePickerField } from "./date-picker-field"
import { DateRangePickerField } from "./date-range-picker-field"
import { formatDate } from "@/lib/formatters"
import { getProfileDefaultLocation } from "@/modules/profiles/get-profile-default-location"
import { generateMedicalCertificateAction } from "@/actions"
import type { Patient } from "@/modules/patients/types"
import type { MedicalCertificateType } from "@/modules/medical-certificates/types"
import { getMedicalCertificatePreviewParagraphs } from "@/modules/medical-certificates/get-medical-certificate-preview-paragraphs"
import { cn } from "@/lib/utils"

const TYPES: {
  value: MedicalCertificateType
  label: string
  description: string
  icon: React.ElementType
}[] = [
    {
      value: "comparecimento",
      label: "Comparecimento",
      description: "Atestado de comparecimento ao atendimento",
      icon: ClipboardList,
    },
    {
      value: "aptidao_fisica",
      label: "Aptidão Física",
      description: "Atestado de aptidão para atividades físicas",
      icon: UserCircle,
    },
    {
      value: "medico",
      label: "Médico (afastamento)",
      description: "Atestado médico de afastamento",
      icon: Stethoscope,
    },
    {
      value: "acompanhante",
      label: "Acompanhante",
      description: "Atestado de acompanhante em consulta",
      icon: UserPlus,
    },
  ]

function WizardStepper({ currentStep }: { currentStep: Step }) {
  return (
    <p className="text-sm text-muted-foreground">
      Passo {currentStep} de 3
    </p>
  )
}

type Step = 1 | 2 | 3

type WizardPayload = {
  comparecimento?: {
    patientName: string
    birthDate: string
    attendanceDate: string
    timeStart: string
    timeEnd: string
    observations: string
  }
  aptidao_fisica?: {
    patientName: string
    birthDate: string
    activities: string
    validityDate: string
    observations: string
  }
  medico?: {
    patientName: string
    birthDate: string
    daysAway: number
    startDate: string
    cid10: string
    canLeaveHome: boolean
    observations: string
  }
  acompanhante?: {
    companionName: string
    patientName: string
    consultationDate: string
    timeStart: string
    timeEnd: string
    observations: string
  }
}

const initialPayload: WizardPayload = {
  comparecimento: {
    patientName: "",
    birthDate: "",
    attendanceDate: "",
    timeStart: "",
    timeEnd: "",
    observations: "",
  },
  aptidao_fisica: {
    patientName: "",
    birthDate: "",
    activities: "",
    validityDate: "",
    observations: "",
  },
  medico: {
    patientName: "",
    birthDate: "",
    daysAway: 1,
    startDate: "",
    cid10: "",
    canLeaveHome: true,
    observations: "",
  },
  acompanhante: {
    companionName: "",
    patientName: "",
    consultationDate: "",
    timeStart: "",
    timeEnd: "",
    observations: "",
  },
}

type CertificateFormCardProps = {
  type: MedicalCertificateType
  currentPayload: NonNullable<WizardPayload[MedicalCertificateType]>
  payload: WizardPayload
  setPayload: React.Dispatch<React.SetStateAction<WizardPayload>>
  selectedPatient: Patient | null
}

function CertificateFormCard({
  type,
  currentPayload,
  payload,
  setPayload,
  selectedPatient,
}: CertificateFormCardProps) {
  const isComparecimento = type === "comparecimento"
  const isAptidao = type === "aptidao_fisica"
  const isMedico = type === "medico"
  const isAcompanhante = type === "acompanhante"
  const responsibleName = selectedPatient?.responsible?.trim() ?? ""

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Passo 3 — Dados do atestado</CardTitle>
        <CardDescription className="mt-1">
          Preencha os campos. Use a localização do navegador ou digite o Estado no perfil.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Dados do atestado</h4>
          {isComparecimento && (
            <>
              <div className="flex flex-wrap gap-4">
                <div className="w-full min-w-0 sm:w-1/2 sm:max-w-[50%]">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <DatePickerField
                      label="Data do atendimento"
                      value={(currentPayload as { attendanceDate?: string }).attendanceDate ?? ""}
                      onChange={(v) =>
                        setPayload((prev) => ({
                          ...prev,
                          comparecimento: { ...prev.comparecimento!, attendanceDate: v },
                        }))
                      }
                      placeholder="Selecione a data"
                    />
                    <Field>
                      <FieldLabel>Horário</FieldLabel>
                      <FieldContent>
                        <Input
                          value={(currentPayload as { timeStart?: string }).timeStart ?? ""}
                          onChange={(e) =>
                            setPayload((prev) => ({
                              ...prev,
                              comparecimento: {
                                ...prev.comparecimento!,
                                timeStart: e.target.value,
                              },
                            }))
                          }
                          placeholder="Ex: 09:00 às 11:00"
                        />
                      </FieldContent>
                    </Field>
                  </div>
                </div>
              </div>
              <Field>
                <FieldLabel>Observações</FieldLabel>
                <FieldContent>
                  <RichTextEditor
                    value={(currentPayload as { observations?: string }).observations ?? ""}
                    onChange={(value) =>
                      setPayload((prev) => ({
                        ...prev,
                        comparecimento: { ...prev.comparecimento!, observations: value },
                      }))
                    }
                    placeholder="Opcional"
                    minHeight="80px"
                  />
                </FieldContent>
              </Field>
            </>
          )}
          {isAptidao && (
            <>
              <div className="w-full min-w-0 sm:w-1/2 sm:max-w-[50%]">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Atividades</FieldLabel>
                    <FieldContent>
                      <Input
                        value={(currentPayload as { activities?: string }).activities ?? ""}
                        onChange={(e) =>
                          setPayload((prev) => ({
                            ...prev,
                            aptidao_fisica: {
                              ...prev.aptidao_fisica!,
                              activities: e.target.value,
                            },
                          }))
                        }
                        placeholder="Ex.: atividades escolares e Natação"
                      />
                    </FieldContent>
                  </Field>
                  <DatePickerField
                    label="Validade"
                    value={(currentPayload as { validityDate?: string }).validityDate ?? ""}
                    onChange={(v) =>
                      setPayload((prev) => ({
                        ...prev,
                        aptidao_fisica: {
                          ...prev.aptidao_fisica!,
                          validityDate: v,
                        },
                      }))
                    }
                    placeholder="Selecione a data"
                  />
                </div>
              </div>
              <Field>
                <FieldLabel>Observações</FieldLabel>
                <FieldContent>
                  <RichTextEditor
                    value={(currentPayload as { observations?: string }).observations ?? ""}
                    onChange={(value) =>
                      setPayload((prev) => ({
                        ...prev,
                        aptidao_fisica: {
                          ...prev.aptidao_fisica!,
                          observations: value,
                        },
                      }))
                    }
                    placeholder="Opcional"
                    minHeight="80px"
                  />
                </FieldContent>
              </Field>
            </>
          )}
          {isMedico && (
            <>
              <div className="w-full min-w-0 sm:w-1/2 sm:max-w-[50%]">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DateRangePickerField
                    label="Período de afastamento"
                    startDate={(currentPayload as { startDate?: string }).startDate ?? ""}
                    daysAway={(currentPayload as { daysAway?: number }).daysAway ?? 1}
                    onChange={({ startDate: v, daysAway: d }) =>
                      setPayload((prev) => ({
                        ...prev,
                        medico: {
                          ...prev.medico!,
                          startDate: v,
                          daysAway: d,
                        },
                      }))
                    }
                    placeholder="Selecione o período"
                  />
                  <Field>
                    <FieldLabel>CID-10</FieldLabel>
                    <FieldContent>
                      <Input
                        value={(currentPayload as { cid10?: string }).cid10 ?? ""}
                        onChange={(e) =>
                          setPayload((prev) => ({
                            ...prev,
                            medico: { ...prev.medico!, cid10: e.target.value },
                          }))
                        }
                        placeholder="Ex.: J00"
                      />
                    </FieldContent>
                  </Field>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="canLeaveHome"
                  checked={(currentPayload as { canLeaveHome?: boolean }).canLeaveHome ?? true}
                  onCheckedChange={(checked) =>
                    setPayload((prev) => ({
                      ...prev,
                      medico: {
                        ...prev.medico!,
                        canLeaveHome: checked === true,
                      },
                    }))
                  }
                />
                <Label htmlFor="canLeaveHome" className="cursor-pointer font-normal">
                  Pode sair de casa
                </Label>
              </div>
              <Field>
                <FieldLabel>Observações</FieldLabel>
                <FieldContent>
                  <RichTextEditor
                    value={(currentPayload as { observations?: string }).observations ?? ""}
                    onChange={(value) =>
                      setPayload((prev) => ({
                        ...prev,
                        medico: {
                          ...prev.medico!,
                          observations: value,
                        },
                      }))
                    }
                    placeholder="Opcional"
                    minHeight="80px"
                  />
                </FieldContent>
              </Field>
            </>
          )}
          {isAcompanhante && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <Field>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <FieldLabel>Nome do acompanhante</FieldLabel>
                    {responsibleName ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto py-1 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          setPayload((prev) => ({
                            ...prev,
                            acompanhante: {
                              ...prev.acompanhante!,
                              companionName: responsibleName,
                            },
                          }))
                        }
                      >
                        Usar nome do responsável
                      </Button>
                    ) : null}
                  </div>
                  <FieldContent>
                    <Input
                      value={(currentPayload as { companionName?: string }).companionName ?? ""}
                      onChange={(e) =>
                        setPayload((prev) => ({
                          ...prev,
                          acompanhante: {
                            ...prev.acompanhante!,
                            companionName: e.target.value,
                          },
                        }))
                      }
                      placeholder="Nome completo"
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>Nome do paciente acompanhado</FieldLabel>
                  <FieldContent>
                    <Input
                      value={(currentPayload as { patientName?: string }).patientName ?? ""}
                      onChange={(e) =>
                        setPayload((prev) => ({
                          ...prev,
                          acompanhante: {
                            ...prev.acompanhante!,
                            patientName: e.target.value,
                          },
                        }))
                      }
                      placeholder="Nome completo"
                    />
                  </FieldContent>
                </Field>
                <DatePickerField
                  label="Data da consulta"
                  value={(currentPayload as { consultationDate?: string }).consultationDate ?? ""}
                  onChange={(v) =>
                    setPayload((prev) => ({
                      ...prev,
                      acompanhante: {
                        ...prev.acompanhante!,
                        consultationDate: v,
                      },
                    }))
                  }
                  placeholder="Selecione a data"
                />
                <Field>
                  <FieldLabel>Horário</FieldLabel>
                  <FieldContent>
                    <Input
                      value={(currentPayload as { timeStart?: string }).timeStart ?? ""}
                      onChange={(e) =>
                        setPayload((prev) => ({
                          ...prev,
                          acompanhante: {
                            ...prev.acompanhante!,
                            timeStart: e.target.value,
                          },
                        }))
                      }
                      placeholder="Ex: 09:00 às 11:00"
                    />
                  </FieldContent>
                </Field>
              </div>
              <Field>
                <FieldLabel>Observações</FieldLabel>
                <FieldContent>
                  <RichTextEditor
                    value={(currentPayload as { observations?: string }).observations ?? ""}
                    onChange={(value) =>
                      setPayload((prev) => ({
                        ...prev,
                        acompanhante: {
                          ...prev.acompanhante!,
                          observations: value,
                        },
                      }))
                    }
                    placeholder="Opcional"
                    minHeight="80px"
                  />
                </FieldContent>
              </Field>
            </>
          )}
        </section>
      </CardContent>
    </Card>
  )
}

type MedicalCertificateWizardProfile = {
  id: string
  first_name: string | null
  surname: string | null
  crm: string | null
  default_location_state?: string | null
  default_location_city?: string | null
}

type MedicalCertificateWizardProps = {
  patients: Patient[]
  profile: MedicalCertificateWizardProfile
}

export function MedicalCertificateWizard({ patients, profile }: MedicalCertificateWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [type, setType] = useState<MedicalCertificateType | null>(null)
  const [dataSource, setDataSource] = useState<"patient" | "manual" | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [manualSheetOpen, setManualSheetOpen] = useState(false)
  const [manualConfirmed, setManualConfirmed] = useState(false)
  const [patientName, setPatientName] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [payload, setPayload] = useState<WizardPayload>(initialPayload)
  const [issuedAt] = useState(format(new Date(), "yyyy-MM-dd"))
  const [generating, setGenerating] = useState(false)

  const currentPayload = type ? payload[type] : null
  const hasPatient =
    (dataSource === "patient" && selectedPatient) ||
    (dataSource === "manual" && manualConfirmed)

  function handleSelectType(t: MedicalCertificateType) {
    setType(t)
  }

  function handleSelectPatient(patient: Patient) {
    setDataSource("patient")
    setSelectedPatient(patient)
    const keys = ["comparecimento", "aptidao_fisica", "medico", "acompanhante"] as const
    keys.forEach((k) => {
      if (payload[k]) {
        const next = { ...payload[k] } as Record<string, unknown>
        next.patientName = patient.name ?? ""
        next.birthDate = patient.birth_date ?? ""
        setPayload((prev) => ({ ...prev, [k]: next }))
      }
    })
    setPickerOpen(false)
  }

  function handleDataSourceManual() {
    setManualSheetOpen(true)
  }

  function handleConfirmManualEntry() {
    setDataSource("manual")
    setManualConfirmed(true)
    const keys = ["comparecimento", "aptidao_fisica", "medico", "acompanhante"] as const
    keys.forEach((k) => {
      if (payload[k]) {
        const next = { ...payload[k] } as Record<string, unknown>
        next.patientName = patientName.trim()
        next.birthDate = birthDate.trim()
        setPayload((prev) => ({ ...prev, [k]: next }))
      }
    })
    setManualSheetOpen(false)
  }

  function handleDataSourcePatientChosen() {
    setDataSource("patient")
  }

  function handleRemovePatient() {
    setSelectedPatient(null)
    setDataSource(null)
    setManualConfirmed(false)
    setPatientName("")
    setBirthDate("")
    setType(null)
    setPayload(initialPayload)
  }

  function handleGenerate() {
    if (!type || !currentPayload) return
    setGenerating(true)
    generateMedicalCertificateAction({
      type,
      payload: currentPayload as unknown as Record<string, unknown>,
      issuedAt: issuedAt ? new Date(issuedAt).toISOString() : undefined,
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
          toast.success("Atestado gerado. Download iniciado.")
          router.push("/dashboard/medical-certificates")
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
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <WizardStepper currentStep={1} />
                <CardTitle className="mt-2 text-base">Passo 1 — Associar ou preencher paciente</CardTitle>
                <CardDescription className="mt-1">
                  Associe um paciente cadastrado ou preencha os dados manualmente.
                </CardDescription>
              </div>
              {!hasPatient ? (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={dataSource === "patient" && selectedPatient ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPickerOpen(true)}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Associar paciente
                  </Button>
                  <Button
                    type="button"
                    variant={dataSource === "manual" && manualConfirmed ? "default" : "outline"}
                    size="sm"
                    onClick={handleDataSourceManual}
                  >
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Preencher manualmente
                  </Button>
                </div>
              ) : null}
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
                    <Button type="button" variant="secondary" size="sm" onClick={handleRemovePatient}>
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
                    <Button type="button" variant="secondary" size="sm" onClick={handleRemovePatient}>
                      Remover paciente
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {hasPatient ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Passo 2 — Tipo de atestado</CardTitle>
                <CardDescription className="mt-1">
                  Escolha o tipo de atestado que deseja gerar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  {TYPES.map(({ value, label, description, icon: Icon }) => (
                    <Card
                      key={value}
                      className={cn(
                        "cursor-pointer border transition-colors hover:border-primary/20 hover:bg-muted/30",
                        type === value && "ring-2 ring-primary border-primary",
                      )}
                      onClick={() => handleSelectType(value)}
                    >
                      <CardContent className="p-5">
                        <div className="flex flex-col gap-2">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <h3 className="font-medium text-foreground">{label}</h3>
                          <p className="text-sm text-muted-foreground">{description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {hasPatient && type && currentPayload ? (
            <CertificateFormCard
              type={type}
              currentPayload={currentPayload}
              payload={payload}
              setPayload={setPayload}
              selectedPatient={selectedPatient}
            />
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/medical-certificates">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
          {hasPatient && type ? (
            <Button onClick={() => setStep(2)}>Revisar</Button>
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
              <Button type="button" className="mt-2 w-full" onClick={handleConfirmManualEntry}>
                Concluir
              </Button>
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

  if (step === 2 && type && currentPayload) {
    const location = getProfileDefaultLocation(profile)
    const issuedAtFormatted = issuedAt
      ? format(new Date(issuedAt + "T12:00:00"), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
      : ""
    const doctor = {
      firstName: profile.first_name ?? "",
      surname: profile.surname ?? "",
      crm: profile.crm ?? null,
    }
    const formattedPayload = { ...currentPayload } as Record<string, unknown>
    if (typeof formattedPayload.birthDate === "string" && formattedPayload.birthDate)
      formattedPayload.birthDate = formatDate(formattedPayload.birthDate as string)
    if (typeof formattedPayload.attendanceDate === "string" && formattedPayload.attendanceDate)
      formattedPayload.attendanceDate = formatDate(formattedPayload.attendanceDate as string)
    if (typeof formattedPayload.validityDate === "string" && formattedPayload.validityDate)
      formattedPayload.validityDate = formatDate(formattedPayload.validityDate as string)
    if (typeof formattedPayload.startDate === "string" && formattedPayload.startDate)
      formattedPayload.startDate = formatDate(formattedPayload.startDate as string)
    if (typeof formattedPayload.consultationDate === "string" && formattedPayload.consultationDate)
      formattedPayload.consultationDate = formatDate(formattedPayload.consultationDate as string)

    const paragraphs = getMedicalCertificatePreviewParagraphs(
      type,
      formattedPayload as Parameters<typeof getMedicalCertificatePreviewParagraphs>[1],
      doctor,
      location || "—",
      issuedAtFormatted,
    )

    return (
      <Card>
        <CardHeader>
          <WizardStepper currentStep={2} />
          <CardTitle className="mt-2">Preview do atestado</CardTitle>
          <CardDescription>
            Confira como ficará o atestado. Ao confirmar, o PDF será gerado, salvo e disponível para download.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="mx-auto max-w-[21cm] rounded-md border border-border bg-zinc-50/80 p-6 shadow-sm dark:bg-zinc-900/50 print:shadow-none"
            style={{ aspectRatio: "210/297" }}
          >
            <p className="mb-4 text-xs uppercase tracking-wide text-muted-foreground">
              Atestado médico
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

  if (step === 3 && type && currentPayload) {
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
