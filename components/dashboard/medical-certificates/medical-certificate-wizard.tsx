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
  MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useLocationState } from "./use-location-state"
import { formatDate } from "@/lib/formatters"
import { generateMedicalCertificateAction } from "@/actions"
import type { Patient } from "@/modules/patients/types"
import type { MedicalCertificateType } from "@/modules/medical-certificates/types"
import { getMedicalCertificatePreviewParagraphs } from "@/modules/medical-certificates/get-medical-certificate-preview-paragraphs"
import { cn } from "@/lib/utils"

const TYPES: { value: MedicalCertificateType; label: string; icon: React.ElementType }[] = [
  { value: "comparecimento", label: "Comparecimento", icon: ClipboardList },
  { value: "aptidao_fisica", label: "Aptidão Física", icon: UserCircle },
  { value: "medico", label: "Médico (afastamento)", icon: Stethoscope },
  { value: "acompanhante", label: "Acompanhante", icon: UserPlus },
]

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
  const [locationState, setLocationState] = useState("")
  const [issuedAt, setIssuedAt] = useState(format(new Date(), "yyyy-MM-dd"))
  const [generating, setGenerating] = useState(false)

  const { state: geoState, loading: geoLoading, error: geoError, requestLocation } = useLocationState((s) => setLocationState(s))

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
    const location = locationState || geoState
    if (!location.trim()) {
      toast.error("Informe o Estado (ex.: São Paulo).")
      return
    }
    setGenerating(true)
    generateMedicalCertificateAction({
      type,
      payload: currentPayload as unknown as Record<string, unknown>,
      locationState: location.trim(),
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
            <CardTitle>Como deseja preencher os dados?</CardTitle>
            <CardDescription>
              Associe a um paciente para usar nome e data de nascimento do cadastro, ou preencha manualmente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setPickerOpen(true)}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Associar a um paciente
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleDataSourceManual}
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              Preencher manualmente
            </Button>
            {selectedPatient && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <p className="font-medium text-foreground">Paciente selecionado: {selectedPatient.name}</p>
                <p className="mt-1 text-muted-foreground">
                  {selectedPatient.birth_date
                    ? `Nascimento: ${format(new Date(selectedPatient.birth_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}`
                    : "Data de nascimento não informada"}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setPickerOpen(true)}
                >
                  Trocar paciente
                </Button>
              </div>
            )}
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
          <CardTitle>Tipo de atestado</CardTitle>
          <CardDescription>
            Escolha o tipo de atestado que deseja gerar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {TYPES.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant="outline"
                className="h-auto flex-col items-start gap-2 p-4 text-left"
                onClick={() => handleSelectType(value)}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{label}</span>
              </Button>
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
          <CardTitle>Preencha os dados</CardTitle>
          <CardDescription>
            Preencha os campos e informe o Estado. Use a localização do navegador ou digite o Estado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(isComparecimento || isAptidao || isMedico) &&
            (dataSource === "patient" && selectedPatient ? (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-medium text-muted-foreground">Paciente associado</p>
                <p className="mt-1 font-medium text-foreground">{selectedPatient.name}</p>
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
            ))}

          {isComparecimento && (
            <>
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
              <Field>
                <FieldLabel>Horário início</FieldLabel>
                <FieldContent>
                  <Input
                    type="time"
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
                    className="[&::-webkit-calendar-picker-indicator]:opacity-100"
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Horário fim</FieldLabel>
                <FieldContent>
                  <Input
                    type="time"
                    value={(currentPayload as { timeEnd?: string }).timeEnd ?? ""}
                    onChange={(e) =>
                      setPayload((prev) => ({
                        ...prev,
                        comparecimento: {
                          ...prev.comparecimento!,
                          timeEnd: e.target.value,
                        },
                      }))
                    }
                    className="[&::-webkit-calendar-picker-indicator]:opacity-100"
                  />
                </FieldContent>
              </Field>
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
                <FieldLabel>Horário início</FieldLabel>
                <FieldContent>
                  <Input
                    type="time"
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
                    className="[&::-webkit-calendar-picker-indicator]:opacity-100"
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Horário fim</FieldLabel>
                <FieldContent>
                  <Input
                    type="time"
                    value={(currentPayload as { timeEnd?: string }).timeEnd ?? ""}
                    onChange={(e) =>
                      setPayload((prev) => ({
                        ...prev,
                        acompanhante: {
                          ...prev.acompanhante!,
                          timeEnd: e.target.value,
                        },
                      }))
                    }
                    className="[&::-webkit-calendar-picker-indicator]:opacity-100"
                  />
                </FieldContent>
              </Field>
            </>
          )}

          <div className="border-t pt-4">
            <Field>
              <FieldLabel>Estado (local do atestado)</FieldLabel>
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
          </div>
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
    const location = locationState || geoState || ""
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
          <CardTitle>Preview do atestado</CardTitle>
          <CardDescription>
            Confira como ficará o atestado. Ao confirmar, o PDF será gerado, salvo e disponível para download.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-background p-6 shadow-sm print:shadow-none">
            <div className="space-y-3 text-sm leading-relaxed text-foreground">
              {paragraphs.map((line, i) => (
                line === "_________________________" ? (
                  <div key={i} className="border-b border-border pb-1 pt-2" aria-hidden />
                ) : (
                  <p key={i} className={cn("whitespace-pre-wrap", line.includes("\n") && "font-medium")}>
                    {line}
                  </p>
                )
              ))}
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
