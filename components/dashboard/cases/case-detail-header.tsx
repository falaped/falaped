import Link from "next/link"
import { ArrowLeftIcon, CalendarIcon, ClockIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatDateTime } from "@/lib/formatters"
import type { CaseDetail } from "@/modules/cases/get-case-by-id"
import type { Patient } from "@/modules/patients/types"
import { CaseDetailActions } from "@/components/dashboard/cases/case-detail-actions"
import { CasePatientPickerTrigger } from "@/components/dashboard/cases/case-patient-picker-trigger"

function StatusBadge({ status }: { status: "active" | "closed" }) {
  if (status === "active") {
    return (
      <Badge variant="default" className="gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary-foreground" />
        </span>
        Caso Ativo
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
  patients: Patient[]
}

export function CaseDetailHeader({ detail, patients }: CaseDetailHeaderProps) {
  const title = getCaseTitle(detail)

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground" asChild>
        <Link href="/dashboard/cases">
          <ArrowLeftIcon className="h-4 w-4" />
          Voltar para casos
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <StatusBadge status={detail.status} />
            <CasePatientPickerTrigger
              caseId={detail.id}
              patients={patients}
              hasPatient={!!detail.patient}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5" />
              Iniciado em {formatDateTime(detail.started_at)}
            </span>
            {detail.ended_at && (
              <span className="flex items-center gap-1.5">
                <ClockIcon className="h-3.5 w-3.5" />
                Encerrado em {formatDateTime(detail.ended_at)}
              </span>
            )}
          </div>
        </div>
        <CaseDetailActions caseId={detail.id} status={detail.status} />
      </div>

      {(detail.awaiting_patient_choice || detail.awaiting_intent) && (
        <div className="flex gap-2">
          {detail.awaiting_patient_choice && (
            <Badge variant="outline">Aguardando associação de paciente</Badge>
          )}
          {detail.awaiting_intent && (
            <Badge variant="outline" className="text-muted-foreground">
              Aguardando resposta do responsável
            </Badge>
          )}
        </div>
      )}

      <Separator />
    </div>
  )
}
