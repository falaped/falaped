import Link from "next/link"
import { tz } from "@date-fns/tz"
import { differenceInMinutes, format } from "date-fns"
import { ArrowRightIcon, TriangleAlertIcon } from "lucide-react"

import { AttentionSymbol } from "@/components/dashboard/attention-symbol"
import { Button } from "@/components/ui/button"
import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { formatPediatricAgeShort } from "@/lib/format-pediatric-age"
import { getPatientInitials } from "@/lib/get-patient-initials"
import type { DashboardHomeActiveCase } from "@/modules/dashboard/get-dashboard-home-data"

/**
 * Consulta em andamento numa linha só (Início e Consultas): quem é, há quanto tempo e
 * "Voltar à consulta".
 */
export function ActiveConsultBanner({ active, now }: { active: DashboardHomeActiveCase; now: Date }) {
  const href = active.origin === "dashboard" ? `/dashboard/cases/new/${active.id}` : `/dashboard/cases/${active.id}`

  return (
    <section className="flex items-center gap-4 rounded-xl border border-success-border bg-card px-6 py-4">
      <span className="relative">
        <span className="grid size-11 place-items-center rounded-full bg-primary-soft text-label font-semibold text-primary-ink-strong">
          {getPatientInitials(active.patient?.name ?? "?")}
        </span>
        <span className="absolute -top-0.5 -right-0.5 size-3 animate-pulse rounded-full bg-success ring-2 ring-card" aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-6 items-center rounded-md border border-success-border bg-success-soft px-2 text-caption font-medium text-success-text">
            Em consulta agora · {elapsed(active.startedAt, now)}
          </span>
          <span className="text-title font-semibold">{active.patient?.name ?? "Consulta sem paciente"}</span>
          {active.patient?.birthDate ? (
            <span className="text-muted-foreground">
              · {formatPediatricAgeShort(computePediatricAge(active.patient.birthDate))}
            </span>
          ) : null}
          {active.patient?.allergies ? (
            <AttentionSymbol icon={TriangleAlertIcon} kind="danger" title="Alergia" detail={active.patient.allergies} />
          ) : null}
        </div>
        <div className="mt-0.5 text-muted-foreground">
          Começou às {format(new Date(active.startedAt), "HH:mm", { in: tz(CLINIC_TIME_ZONE) })}
          {active.patient?.responsible ? ` · com ${active.patient.responsible}` : null}
        </div>
      </div>
      <Button asChild size="lg" className="ml-auto">
        <Link href={href}>
          Voltar à consulta
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
      </Button>
    </section>
  )
}

/** "12 min" ou "1 h 05 min" desde o início da consulta. */
function elapsed(startedAt: string, now: Date): string {
  const minutes = Math.max(0, differenceInMinutes(now, new Date(startedAt)))
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`
}
