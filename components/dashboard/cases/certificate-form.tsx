"use client"

/** Campos de cada tipo de atestado e a prévia, usados pelo painel do atestado (consult-certificate-panel.tsx). */

import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Field,
  FieldContent,
  FieldLabel,
} from "@/components/ui/field"
import { Checkbox } from "@/components/ui/checkbox"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { DatePickerField } from "@/components/dashboard/date-picker-field"
import { DateRangePickerField } from "@/components/dashboard/date-range-picker-field"
import { formatDate } from "@/lib/formatters"
import { getProfileDefaultLocation } from "@/modules/profiles/get-profile-default-location"
import type { Patient } from "@/modules/patients/types"
import type {
  MedicalCertificateType,
  AcompanhantePeriodo,
} from "@/modules/medical-certificates/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getMedicalCertificatePreviewContent } from "@/modules/medical-certificates/get-medical-certificate-preview-content"

export type WizardPayload = {
  comparecimento?: {
    patientName: string
    birthDate: string
    attendanceDate: string
    timeStart: string
    timeEnd: string
    periodo: AcompanhantePeriodo
    observations: string
  }
  aptidao_fisica?: {
    patientName: string
    birthDate: string
    activities: string
    validity: string
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
    periodo: AcompanhantePeriodo
    observations: string
  }
}

export const initialPayload: WizardPayload = {
  comparecimento: {
    patientName: "",
    birthDate: "",
    attendanceDate: "",
    timeStart: "",
    timeEnd: "",
    periodo: "",
    observations: "",
  },
  aptidao_fisica: {
    patientName: "",
    birthDate: "",
    activities: "",
    validity: "",
    observations: "",
  },
  medico: {
    patientName: "",
    birthDate: "",
    daysAway: 1,
    startDate: format(new Date(), "yyyy-MM-dd"),
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
    periodo: "",
    observations: "",
  },
}

type CertificateFormCardProps = {
  type: MedicalCertificateType
  currentPayload: NonNullable<WizardPayload[MedicalCertificateType]>
  setPayload: React.Dispatch<React.SetStateAction<WizardPayload>>
  /** Só o responsável é usado (atalho "Usar nome do responsável"). */
  selectedPatient: Pick<Patient, "responsible"> | null
  /** Sem o cartão e o título de passo: dentro do painel da Consulta. */
  embedded?: boolean
}

export function CertificateFormCard({
  type,
  currentPayload,
  setPayload,
  selectedPatient,
  embedded = false,
}: CertificateFormCardProps) {
  const isComparecimento = type === "comparecimento"
  const isAptidao = type === "aptidao_fisica"
  const isMedico = type === "medico"
  const isAcompanhante = type === "acompanhante"
  const responsibleName = selectedPatient?.responsible?.trim() ?? ""

  const fields = (
        <section className="space-y-4">
          {embedded ? null : <h4 className="text-sm font-medium text-muted-foreground">Dados do atestado</h4>}
          {isComparecimento && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:auto-cols-fr sm:grid-flow-col">
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
                {!(currentPayload as { periodo?: string }).periodo?.trim() ? (
                  <Field>
                    <FieldLabel>Horário</FieldLabel>
                    <FieldContent>
                      <Input
                        value={(currentPayload as { timeStart?: string }).timeStart ?? ""}
                        onChange={(e) => {
                          const v = e.target.value
                          setPayload((prev) => ({
                            ...prev,
                            comparecimento: {
                              ...prev.comparecimento!,
                              timeStart: v,
                              periodo: "",
                            },
                          }))
                        }}
                        placeholder="Ex: 09:00 às 11:00"
                      />
                    </FieldContent>
                  </Field>
                ) : null}
                {!(currentPayload as { timeStart?: string }).timeStart?.trim() ? (
                  <Field>
                    <FieldLabel>Período</FieldLabel>
                    <FieldContent>
                      <Select
                        value={
                          (currentPayload as { periodo?: AcompanhantePeriodo }).periodo || "__none__"
                        }
                        onValueChange={(v) =>
                          setPayload((prev) => ({
                            ...prev,
                            comparecimento: {
                              ...prev.comparecimento!,
                              periodo: (v === "__none__" ? "" : v) as AcompanhantePeriodo,
                              timeStart: "",
                              timeEnd: "",
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione ou limpe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhum</SelectItem>
                          <SelectItem value="matutino">Matutino</SelectItem>
                          <SelectItem value="vespertino">Vespertino</SelectItem>
                          <SelectItem value="noturno">Noturno</SelectItem>
                          <SelectItem value="atual_data">Atual data</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldContent>
                  </Field>
                ) : null}
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
                <Field>
                  <FieldLabel>Validade</FieldLabel>
                  <FieldContent>
                    <Input
                      value={(currentPayload as { validity?: string }).validity ?? ""}
                      onChange={(e) =>
                        setPayload((prev) => ({
                          ...prev,
                          aptidao_fisica: {
                            ...prev.aptidao_fisica!,
                            validity: e.target.value,
                          },
                        }))
                      }
                      placeholder="3 meses, 6 meses ou 12 meses"
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
                    minStartDate={format(new Date(), "yyyy-MM-dd")}
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
                  Apto à retornar para as atividades
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  {responsibleName &&
                  (currentPayload as { companionName?: string }).companionName?.trim() !== responsibleName ? (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto w-fit p-0 text-caption"
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
              </div>
              <div className="grid grid-cols-1 gap-4 sm:auto-cols-fr sm:grid-flow-col">
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
                {!(currentPayload as { periodo?: string }).periodo?.trim() ? (
                  <Field>
                    <FieldLabel>Horário</FieldLabel>
                    <FieldContent>
                      <Input
                        value={(currentPayload as { timeStart?: string }).timeStart ?? ""}
                        onChange={(e) => {
                          const v = e.target.value
                          setPayload((prev) => ({
                            ...prev,
                            acompanhante: {
                              ...prev.acompanhante!,
                              timeStart: v,
                              periodo: "",
                            },
                          }))
                        }}
                        placeholder="Ex: 09:00 às 11:00"
                      />
                    </FieldContent>
                  </Field>
                ) : null}
                {!(currentPayload as { timeStart?: string }).timeStart?.trim() ? (
                  <Field>
                    <FieldLabel>Período</FieldLabel>
                    <FieldContent>
                      <Select
                        value={
                          (currentPayload as { periodo?: AcompanhantePeriodo }).periodo || "__none__"
                        }
                        onValueChange={(v) =>
                          setPayload((prev) => ({
                            ...prev,
                            acompanhante: {
                              ...prev.acompanhante!,
                              periodo: (v === "__none__" ? "" : v) as AcompanhantePeriodo,
                              timeStart: "",
                              timeEnd: "",
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione ou limpe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhum</SelectItem>
                          <SelectItem value="matutino">Matutino</SelectItem>
                          <SelectItem value="vespertino">Vespertino</SelectItem>
                          <SelectItem value="noturno">Noturno</SelectItem>
                          <SelectItem value="atual_data">Atual data</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldContent>
                  </Field>
                ) : null}
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
  )
  if (embedded) return fields

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Passo 3 — Dados do atestado</CardTitle>
        <CardDescription className="mt-1">
          Preencha os campos. Use a localização do navegador ou digite o Estado no perfil.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">{fields}</CardContent>
    </Card>
  )
}

type CertificatePreviewShortProfile = {
  first_name: string | null
  surname: string | null
  crm: string | null
  rqe?: string | null
  default_location_state?: string | null
  default_location_city?: string | null
}

/** Título, bloco da criança, corpo e rodapé do atestado, com as datas já formatadas. */
export function getCertificatePreview(
  type: MedicalCertificateType,
  currentPayload: NonNullable<WizardPayload[MedicalCertificateType]>,
  profile: CertificatePreviewShortProfile,
  issuedAt: string,
  responsible: string | null,
) {
  const location = getProfileDefaultLocation(profile)
  const issuedAtFormatted = issuedAt
    ? format(new Date(issuedAt + "T12:00:00"), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
    : ""
  const doctor = {
    firstName: profile.first_name ?? "",
    surname: profile.surname ?? "",
    crm: profile.crm ?? null,
    rqe: profile.rqe ?? null,
  }
  const formattedPayload = { ...currentPayload } as Record<string, unknown>
  for (const key of ["birthDate", "attendanceDate", "startDate", "consultationDate"])
    if (typeof formattedPayload[key] === "string" && formattedPayload[key])
      formattedPayload[key] = formatDate(formattedPayload[key] as string)

  return getMedicalCertificatePreviewContent(
    type,
    formattedPayload as Parameters<typeof getMedicalCertificatePreviewContent>[1],
    doctor,
    location || "—",
    issuedAtFormatted,
    responsible,
  )
}

