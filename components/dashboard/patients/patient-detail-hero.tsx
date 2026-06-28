import type { ReactNode } from "react"
import { AlertTriangleIcon, CalendarIcon, PhoneIcon, UserRoundIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate, formatBrazilianPhone } from "@/lib/formatters"
import { getPatientInitials } from "@/lib/get-patient-initials"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { formatPediatricAge } from "@/lib/format-pediatric-age"
import type { Patient } from "@/modules/patients/types"
import { formatPatientSexForDisplay } from "@/modules/patients/patient-sex"
import { isPatientChartIncomplete } from "@/components/dashboard/patients/patient-chart-incomplete"
import { PatientContactPhoneCopy } from "@/components/dashboard/patients/patient-contact-phone-copy"
import { cn } from "@/lib/utils"

type PatientDetailHeroProps = {
  patient: Patient
  /** Actions anchored top-right inside the hero (e.g. Voltar + menu). */
  toolbar?: ReactNode
  /** Opens the edit form (D-09 "Completar cadastro" CTA target). */
  onEditRequest?: () => void
  className?: string
}

export function PatientDetailHero({
  patient,
  toolbar,
  onEditRequest,
  className,
}: PatientDetailHeroProps) {
  const age = computePediatricAge(
    patient.birth_date,
    new Date(),
    patient.gestational_age_weeks,
  )
  const ageText = formatPediatricAge(age)
  const correctedText = age.corrected
    ? formatPediatricAge({
        status: "ok",
        band: age.corrected.band,
        parts: age.corrected.parts,
      })
    : ""
  const sexText = formatPatientSexForDisplay(patient.sex)
  const showIncomplete = isPatientChartIncomplete(patient)
  const initials = getPatientInitials(patient.name)

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-xs",
        className,
      )}
    >
      <div className="border-b border-border/80 bg-muted/20 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          {toolbar ? (
            <div className="order-1 flex w-full shrink-0 justify-end sm:order-2 sm:w-auto sm:items-start">
              {toolbar}
            </div>
          ) : null}
          <div
            className={cn(
              "order-2 flex min-w-0 flex-1 flex-col gap-5 sm:order-1 sm:flex-row sm:items-start sm:gap-6",
            )}
          >
            <Avatar
              className="h-20 w-20 shrink-0 border border-border/80 bg-background shadow-xs sm:h-24 sm:w-24"
              aria-hidden
            >
              <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary sm:text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1 space-y-3 sm:pe-2">
              <div className="flex flex-wrap items-center gap-2 gap-y-1">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {patient.name}
                </h1>
                {showIncomplete ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    Ficha incompleta
                  </Badge>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {age.status === "ok" ? (
                  <>
                    <Badge variant="secondary" className="max-w-full gap-1.5 font-normal">
                      <CalendarIcon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                      <span className="wrap-break-word">
                        {formatDate(patient.birth_date!)}
                        {ageText
                          ? ` · ${correctedText ? "idade cronológica " : ""}${ageText}`
                          : ""}
                      </span>
                    </Badge>
                    {correctedText ? (
                      <Badge variant="secondary" className="max-w-full font-normal">
                        <span className="wrap-break-word">
                          idade corrigida: {correctedText}
                        </span>
                      </Badge>
                    ) : null}
                  </>
                ) : age.status === "missing_birth_date" ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Idade indisponível — informe a data de nascimento para calcular a idade.
                    </span>
                    {onEditRequest ? (
                      <Button type="button" size="sm" onClick={onEditRequest}>
                        Completar cadastro
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="max-w-full gap-1.5 font-normal text-destructive"
                    >
                      <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="wrap-break-word">
                        {age.status === "future"
                          ? "Data de nascimento no futuro — verifique o cadastro."
                          : "Data de nascimento inválida — verifique o cadastro."}
                      </span>
                    </Badge>
                  </div>
                )}
                {sexText ? (
                  <Badge variant="secondary" className="font-normal">
                    {sexText}
                  </Badge>
                ) : null}
                {patient.blood_type ? (
                  <Badge variant="outline" className="font-normal">
                    {patient.blood_type}
                  </Badge>
                ) : null}

                {patient.responsible?.trim() ? (
                  <div className="flex min-w-0 max-w-full items-start gap-2 text-sm sm:max-w-md">
                    <UserRoundIcon
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="wrap-break-word font-medium leading-snug text-foreground">
                      {patient.responsible}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Responsável não informado</span>
                )}

                {patient.contact_phone ? (
                  <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 text-sm">
                    <PhoneIcon
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <a
                      href={`tel:${patient.contact_phone}`}
                      className="wrap-break-word font-medium text-primary hover:underline"
                    >
                      {formatBrazilianPhone(patient.contact_phone)}
                    </a>
                    <PatientContactPhoneCopy rawPhone={patient.contact_phone} />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Telefone não informado</span>
                )}
              </div>

              {patient.legal_guardian?.trim() ? (
                <p className="text-sm text-muted-foreground">
                  Responsável legal:{" "}
                  <span className="text-foreground wrap-break-word">{patient.legal_guardian}</span>
                </p>
              ) : null}

              <p className="text-sm leading-relaxed text-muted-foreground">
                Medidas e histórico clínico na seção abaixo; use o menu para editar ou registrar novo
                atendimento.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
