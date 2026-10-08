import Link from "next/link"
import { tz } from "@date-fns/tz"
import { format } from "date-fns"
import { ArrowRightIcon, TriangleAlertIcon } from "lucide-react"

import { AttentionSymbol } from "@/components/dashboard/attention-symbol"
import { Button } from "@/components/ui/button"
import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { consultClock } from "@/lib/consult-idle"
import { formatPediatricAgeShort } from "@/lib/format-pediatric-age"
import { getPatientInitials } from "@/lib/get-patient-initials"
import { cn } from "@/lib/utils"
import type { DashboardHomeActiveCase } from "@/modules/dashboard/get-dashboard-home-data"

/**
 * Consulta em andamento numa linha só (Início e Consultas): quem é, há quanto tempo e
 * "Voltar à consulta". Esquecida aberta (2h30 sem nada salvo), fica amarela e diz desde
 * quando está parada (lib/consult-idle.ts).
 */
export function ActiveConsultBanner({ active, now }: { active: DashboardHomeActiveCase; now: Date }) {
  const href = active.origin === "dashboard" ? `/dashboard/cases/new/${active.id}` : `/dashboard/cases/${active.id}`
  const inClinic = { in: tz(CLINIC_TIME_ZONE) }
  const { elapsedMs, idleSince, paused } = consultClock(active, active.activityAts, now.getTime())

  return (
    <section className={cn("flex items-center gap-4 rounded-xl border bg-card px-6 py-4", idleSince ? "border-warning-border" : "border-success-border")}>
      <span className="relative">
        <span className="grid size-11 place-items-center rounded-full bg-primary-soft text-label font-semibold text-primary-ink-strong">
          {getPatientInitials(active.patient?.name ?? "?")}
        </span>
        <span
          className={cn(
            "absolute -top-0.5 -right-0.5 size-3 rounded-full ring-2 ring-card",
            idleSince ? "bg-warning" : "animate-pulse bg-success",
          )}
          aria-hidden
        />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-title font-semibold">{active.patient?.name ?? "Consulta sem paciente"}</span>
          {active.patient?.birthDate ? (
            <span className="text-muted-foreground">
              · {formatPediatricAgeShort(computePediatricAge(active.patient.birthDate))}
            </span>
          ) : null}
          {active.patient?.allergies ? (
            <AttentionSymbol icon={TriangleAlertIcon} kind="danger" title="Alergia" detail={active.patient.allergies} />
          ) : null}
          {idleSince ? (
            <span className="inline-flex h-6 items-center rounded-md border border-warning-border bg-warning-soft px-2 text-caption font-medium text-warning-text">
              Sem atividade desde {format(idleSince, "HH:mm", inClinic)}
            </span>
          ) : paused ? (
            <span className="inline-flex h-6 items-center rounded-md border border-border bg-muted px-2 text-caption font-medium text-muted-foreground">
              Consulta pausada · {elapsed(elapsedMs)}
            </span>
          ) : (
            <span className="inline-flex h-6 items-center rounded-md border border-success-border bg-success-soft px-2 text-caption font-medium text-success-text">
              Em consulta agora · {elapsed(elapsedMs)}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-muted-foreground">
          Começou às {format(new Date(active.startedAt), "HH:mm", inClinic)}
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

/** "12 min" ou "1 h 05 min" de consulta. */
function elapsed(ms: number): string {
  const minutes = Math.floor(ms / 60_000)
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`
}
