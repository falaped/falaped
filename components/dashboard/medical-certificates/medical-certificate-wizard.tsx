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
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Checkbox } from "@/components/ui/checkbox"
import { MedicalCertificatePatientPickerSheet } from "./medical-certificate-patient-picker-sheet"
import { DatePickerField } from "./date-picker-field"
import { TimePickerField } from "./time-picker-field"
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
      Passo {currentStep} de 4
    </p>
  )
}

type Step = 1 | 2 | 3 | 4

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
  },
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
  const [payload, setPayload] = useState<WizardPayload>(initialPayload)
  const [issuedAt] = useState(format(new Date(), "yyyy-MM-dd"))
  const [generating, setGenerating] = useState(false)

  const currentPayload = type ? payload[type] : null

  function handleSelectType(t: MedicalCertificateType) {
    setType(t)
    setStep(3)
  }

  function handleSelectPatient(patient: Patient) {
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
    setDataSource("manual")
    setStep(2)
  }

  function handleDataSourcePatientChosen() {
    setDataSource("patient")
    setStep(2)
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
        <Card>
          <CardHeader>
            <WizardStepper currentStep={1} />
            <CardTitle className="mt-2">Como deseja preencher os dados?</CardTitle>
            <CardDescription>
              Associe a um paciente para usar nome e data de nascimento do cadastro, ou preencha manualmente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            </div>
          </CardContent>
        </Card>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/medical-certificates">
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
          <CardTitle className="mt-2">Tipo de atestado</CardTitle>
          <CardDescription>
            Escolha o tipo de atestado que deseja gerar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {TYPES.map(({ value, label, description, icon: Icon }) => (
              <Card
                key={value}
                className="cursor-pointer border transition-colors hover:border-primary/20 hover:bg-muted/30"
                onClick={() => handleSelectType(value)}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-medium text-foreground">{label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === 3 && type && currentPayload) {
    const isComparecimento = type === "comparecimento"
    const isAptidao = type === "aptidao_fisica"
    const isMedico = type === "medico"
    const isAcompanhante = type === "acompanhante"

    return (
      <Card>
        <CardHeader>
          <WizardStepper currentStep={3} />
          <CardTitle className="mt-2">Preencha os dados</CardTitle>
          <CardDescription>
            Preencha os campos e informe o Estado. Use a localização do navegador ou digite o Estado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(isComparecimento || isAptidao || isMedico || isAcompanhante) && (
            <>
              <section className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Paciente
                </h4>
                {(isComparecimento || isAptidao || isMedico) &&
                  (dataSource === "patient" && selectedPatient ? (
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <p className="font-medium text-foreground">{selectedPatient.name}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {selectedPatient.birth_date
                          ? `Nascimento: ${format(new Date(selectedPatient.birth_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}`
                          : "Data de nascimento não informada"}
                      </p>
                      {selectedPatient.responsible && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          Responsável: {selectedPatient.responsible}
                        </p>
                      )}
                    </div>
                  ) : (
                    (isComparecimento || isAptidao || isMedico) && (
                      <>
                        <Field>
                          <FieldLabel>Nome do paciente</FieldLabel>
                          <FieldContent>
                            <Input
                              value={(currentPayload as { patientName?: string }).patientName ?? ""}
                              onChange={(e) =>
                                setPayload((prev) => ({
                                  ...prev,
                                  [type]: { ...currentPayload, patientName: e.target.value },
                                }))
                              }
                              placeholder="Nome completo"
                            />
                          </FieldContent>
                        </Field>
                        <DatePickerField
                          label="Data de nascimento"
                          value={(currentPayload as { birthDate?: string }).birthDate ?? ""}
                          onChange={(v) =>
                            setPayload((prev) => ({
                              ...prev,
                              [type]: { ...currentPayload, birthDate: v },
                            }))
                          }
                          placeholder="Selecione a data"
                        />
                      </>
                    )
                  ))}
                {isAcompanhante && (
                  <>
                    <Field>
                      <FieldLabel>Nome do acompanhante</FieldLabel>
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
                  </>
                )}
              </section>
              <Separator />
            </>
          )}

          <section className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Dados do atestado
            </h4>
          {isComparecimento && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <DatePickerField
                  label="Data do atendimento"
                  value={(currentPayload as { attendanceDate?: string }).attendanceDate ?? ""}
                  onChange={(v) =>
                    setPayload((prev) => ({
                      ...prev,
                      comparecimento: {
                        ...prev.comparecimento!,
                        attendanceDate: v,
                      },
                    }))
                  }
                  placeholder="Selecione a data"
                />
                <TimePickerField
                  label="Horário início"
                  value={(currentPayload as { timeStart?: string }).timeStart ?? ""}
                  onChange={(v) =>
                    setPayload((prev) => ({
                      ...prev,
                      comparecimento: {
                        ...prev.comparecimento!,
                        timeStart: v,
                      },
                    }))
                  }
                  placeholder="Selecione o horário"
                />
                <TimePickerField
                  label="Horário fim"
                  value={(currentPayload as { timeEnd?: string }).timeEnd ?? ""}
                  onChange={(v) =>
                    setPayload((prev) => ({
                      ...prev,
                      comparecimento: {
                        ...prev.comparecimento!,
                        timeEnd: v,
                      },
                    }))
                  }
                  placeholder="Selecione o horário"
                />
              </div>
              <Field>
                <FieldLabel>Observações</FieldLabel>
                <FieldContent>
                  <Textarea
                    value={(currentPayload as { observations?: string }).observations ?? ""}
                    onChange={(e) =>
                      setPayload((prev) => ({
                        ...prev,
                        comparecimento: {
                          ...prev.comparecimento!,
                          observations: e.target.value,
                        },
                      }))
                    }
                    placeholder="Opcional"
                    rows={2}
                  />
                </FieldContent>
              </Field>
            </>
          )}

          {isAptidao && (
            <>
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
              <Field>
                <FieldLabel>Observações</FieldLabel>
                <FieldContent>
                  <Textarea
                    value={(currentPayload as { observations?: string }).observations ?? ""}
                    onChange={(e) =>
                      setPayload((prev) => ({
                        ...prev,
                        aptidao_fisica: {
                          ...prev.aptidao_fisica!,
                          observations: e.target.value,
                        },
                      }))
                    }
                    rows={2}
                  />
                </FieldContent>
              </Field>
            </>
          )}

          {isMedico && (
            <>
              <Field>
                <FieldLabel>Dias de afastamento</FieldLabel>
                <FieldContent>
                  <Input
                    type="number"
                    min={1}
                    value={(currentPayload as { daysAway?: number }).daysAway ?? 1}
                    onChange={(e) =>
                      setPayload((prev) => ({
                        ...prev,
                        medico: {
                          ...prev.medico!,
                          daysAway: parseInt(e.target.value, 10) || 1,
                        },
                      }))
                    }
                  />
                </FieldContent>
              </Field>
              <DatePickerField
                label="Data de início do afastamento"
                value={(currentPayload as { startDate?: string }).startDate ?? ""}
                onChange={(v) =>
                  setPayload((prev) => ({
                    ...prev,
                    medico: {
                      ...prev.medico!,
                      startDate: v,
                    },
                  }))
                }
                placeholder="Selecione a data"
              />
              <Field>
                <FieldLabel>CID-10</FieldLabel>
                <FieldContent>
                  <Input
                    value={(currentPayload as { cid10?: string }).cid10 ?? ""}
                    onChange={(e) =>
                      setPayload((prev) => ({
                        ...prev,
                        medico: {
                          ...prev.medico!,
                          cid10: e.target.value,
                        },
                      }))
                    }
                    placeholder="Ex.: J00"
                  />
                </FieldContent>
              </Field>
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
                  <Textarea
                    value={(currentPayload as { observations?: string }).observations ?? ""}
                    onChange={(e) =>
                      setPayload((prev) => ({
                        ...prev,
                        medico: {
                          ...prev.medico!,
                          observations: e.target.value,
                        },
                      }))
                    }
                    rows={2}
                  />
                </FieldContent>
              </Field>
            </>
          )}

          {isAcompanhante && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                <TimePickerField
                  label="Horário início"
                  value={(currentPayload as { timeStart?: string }).timeStart ?? ""}
                  onChange={(v) =>
                    setPayload((prev) => ({
                      ...prev,
                      acompanhante: {
                        ...prev.acompanhante!,
                        timeStart: v,
                      },
                    }))
                  }
                  placeholder="Selecione o horário"
                />
                <TimePickerField
                  label="Horário fim"
                  value={(currentPayload as { timeEnd?: string }).timeEnd ?? ""}
                  onChange={(v) =>
                    setPayload((prev) => ({
                      ...prev,
                      acompanhante: {
                        ...prev.acompanhante!,
                        timeEnd: v,
                      },
                    }))
                  }
                  placeholder="Selecione o horário"
                />
              </div>
            </>
          )}
          </section>

        </CardContent>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" onClick={() => setStep(2)}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={() => setStep(4)}>Revisar e gerar</Button>
        </div>
      </Card>
    )
  }

  if (step === 4 && type && currentPayload) {
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
          <WizardStepper currentStep={4} />
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
