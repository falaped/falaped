import { BabyIcon, CalendarIcon, ClockIcon, MessagesSquareIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatDate, formatDateTime } from "@/lib/formatters"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import {
  formatPediatricAge,
  formatPediatricAgeAbbrev,
} from "@/lib/format-pediatric-age"
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
}

export function CaseDetailHeader({ detail }: CaseDetailHeaderProps) {
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <MessagesSquareIcon
              className="h-5 w-5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <StatusBadge status={detail.status} />
          </div>
          {detail.status === "active" ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Cockpit do atendimento: retome a conversa no painel (quando
              aplicável) e revise o relatório.
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
                    {patient.birth_date ? (
                      <p>Nasc. {formatDate(patient.birth_date)}</p>
                    ) : null}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Iniciado em {formatDateTime(detail.started_at)}
            </span>
            {detail.ended_at ? (
              <span className="flex items-center gap-1.5">
                <ClockIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Encerrado em {formatDateTime(detail.ended_at)}
              </span>
            ) : null}
          </div>
        </div>
        <CaseDetailHeaderToolbar caseId={detail.id} status={detail.status} />
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
