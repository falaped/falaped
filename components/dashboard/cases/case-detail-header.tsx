import Link from "next/link"
import {
  AlertTriangleIcon,
  BabyIcon,
  CakeIcon,
  ClockIcon,
  MarsIcon,
  PhoneIcon,
  UserIcon,
  VenusIcon,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatBrazilianPhone, formatDate, formatDateTime } from "@/lib/formatters"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import {
  formatPediatricAge,
  formatPediatricAgeAbbrev,
} from "@/lib/format-pediatric-age"
import { getPatientInitials } from "@/lib/get-patient-initials"
import { formatPatientSexForDisplay } from "@/modules/patients/patient-sex"
import type { CaseDetail } from "@/modules/cases/get-case-by-id"
import { CaseDetailHeaderToolbar } from "@/components/dashboard/cases/case-detail-header-toolbar"

function StatusBadge({ status }: { status: "active" | "closed" }) {
  if (status === "active") {
    return (
      <Badge variant="default" className="gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary-foreground" />
        </span>
        Caso ativo
      </Badge>
    )
  }

  return <Badge variant="secondary">Encerrado</Badge>
}

function getCaseTitle(detail: CaseDetail): string {
  if (detail.patient?.name) return detail.patient.name
  if (detail.patient?.responsible) return detail.patient.responsible
  return "Caso sem paciente"
}

type CaseDetailHeaderProps = {
  detail: CaseDetail
  /** Signed URL (short-lived) resolvida server-side; null cai para iniciais. */
  photoUrl: string | null
  /** Lançamentos não-anulados do caso; `null` = a leitura falhou (S7 bloqueia). */
  earningsCount: number | null
  earningsTotalCents: number | null
}

export function CaseDetailHeader({
  detail,
  photoUrl,
  earningsCount,
  earningsTotalCents,
}: CaseDetailHeaderProps) {
  const title = getCaseTitle(detail)

  const patient = detail.patient
  const age = patient
    ? computePediatricAge(patient.birth_date, new Date(), patient.gestational_age_weeks)
    : null
  const ageAbbrev = age ? formatPediatricAgeAbbrev(age) : ""
  const ageFull = age ? formatPediatricAge(age) : ""
  const correctedAbbrev =
    age?.corrected
      ? formatPediatricAgeAbbrev({
          status: "ok",
          band: age.corrected.band,
          parts: age.corrected.parts,
        })
      : ""
  const correctedFull =
    age?.corrected
      ? formatPediatricAge({
          status: "ok",
          band: age.corrected.band,
          parts: age.corrected.parts,
        })
      : ""
  const showAge = age?.status === "ok" && ageAbbrev !== ""
  const sexLabel = patient ? formatPatientSexForDisplay(patient.sex) : null
  const SexIcon = patient?.sex === "feminino" ? VenusIcon : MarsIcon

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Avatar size="lg" className="mt-0.5 border border-border/80">
            {photoUrl && patient ? (
              <AvatarImage src={photoUrl} alt={`Foto de ${patient.name}`} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
              {patient ? getPatientInitials(patient.name) : <UserIcon className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {patient ? (
                  <Link
                    href={`/dashboard/patients/${patient.id}`}
                    className="underline-offset-4 hover:underline"
                    title="Ver ficha do paciente"
                  >
                    {title}
                  </Link>
                ) : (
                  title
                )}
              </h1>
              <StatusBadge status={detail.status} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              {showAge && patient ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="gap-1.5 font-normal">
                        <BabyIcon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                        <span>
                          {ageAbbrev}
                          {correctedAbbrev ? " (corr.)" : ""}
                        </span>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {correctedFull ? "Idade cronológica: " : ""}
                        {ageFull}
                      </p>
                      {correctedFull ? <p>Idade corrigida: {correctedFull}</p> : null}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null}
              {patient?.birth_date ? (
                <span className="flex items-center gap-1.5">
                  <CakeIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {formatDate(patient.birth_date)}
                </span>
              ) : null}
              {sexLabel ? (
                <span className="flex items-center gap-1.5">
                  <SexIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {sexLabel}
                </span>
              ) : null}
              {patient?.responsible ? (
                <span className="flex items-center gap-1.5">
                  <UserIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {patient.responsible}
                </span>
              ) : null}
              {patient?.contact_phone ? (
                <span className="flex items-center gap-1.5">
                  <PhoneIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {formatBrazilianPhone(patient.contact_phone)}
                </span>
              ) : null}
              {detail.ended_at ? (
                <span className="flex items-center gap-1.5">
                  <ClockIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Encerrado em {formatDateTime(detail.ended_at)}
                </span>
              ) : null}
              {patient?.allergies ? (
                <span className="flex items-center gap-1.5 font-medium text-destructive">
                  <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {patient.allergies}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <CaseDetailHeaderToolbar
          caseId={detail.id}
          status={detail.status}
          origin={detail.origin}
          earningsCount={earningsCount}
          earningsTotalCents={earningsTotalCents}
        />
      </div>

      {(detail.awaiting_patient_choice || detail.awaiting_intent) && (
        <div className="flex flex-wrap gap-2">
          {detail.awaiting_patient_choice ? (
            <Badge variant="outline">Aguardando associação de paciente</Badge>
          ) : null}
          {detail.awaiting_intent ? (
            <Badge variant="outline" className="text-muted-foreground">
              Aguardando resposta do responsável
            </Badge>
          ) : null}
        </div>
      )}
    </div>
  )
}
