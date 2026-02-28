"use client"

import Link from "next/link"
import { CalendarIcon, ChevronRightIcon, ClockIcon, PhoneIcon, UserIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatDate, formatRelativeTime, formatBrazilianPhone } from "@/lib/formatters"
import type { CaseWithPatient } from "@/modules/cases/get-cases-by-user-phone"

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

function getPrimaryLabel(c: CaseWithPatient): string {
  if (c.patient?.name) return c.patient.name
  if (c.patient?.responsible) return c.patient.responsible
  return "Sem paciente associado"
}

function getSecondaryLabel(c: CaseWithPatient): string | null {
  if (c.patient?.name && c.patient?.responsible) return c.patient.responsible
  return null
}

export function CaseCard({ case_: c }: { case_: CaseWithPatient }) {
  const primaryLabel = getPrimaryLabel(c)
  const secondaryLabel = getSecondaryLabel(c)

  return (
    <Link
      href={`/dashboard/cases/${c.id}`}
      className={cn(
        "group relative block rounded-xl border border-border/60 bg-card px-5 py-4 transition-all duration-200",
        "hover:border-border hover:bg-accent/30 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h3 className="truncate text-lg font-semibold tracking-tight">
              {primaryLabel}
            </h3>
            <StatusBadge status={c.status} />
          </div>
        </div>

        <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-1 group-hover:text-muted-foreground" />
      </div>

      <Separator className="my-3" />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        {secondaryLabel && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <UserIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{secondaryLabel}</span>
          </span>
        )}
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
          {formatDate(c.started_at)}
        </span>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ClockIcon className="h-3.5 w-3.5 shrink-0" />
          {formatRelativeTime(c.started_at)}
        </span>
        {c.patient?.contact_phone && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <PhoneIcon className="h-3.5 w-3.5 shrink-0" />
            {formatBrazilianPhone(c.patient.contact_phone)}
          </span>
        )}
      </div>

      {(c.awaiting_patient_choice || c.awaiting_intent) && (
        <div className="mt-3 flex gap-2">
          {c.awaiting_patient_choice && (
            <Badge variant="outline" className="text-xs">
              Associar paciente
            </Badge>
          )}
          {c.awaiting_intent && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Aguardando resposta
            </Badge>
          )}
        </div>
      )}
    </Link>
  )
}
