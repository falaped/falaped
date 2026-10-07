import Link from "next/link"
import { tz } from "@date-fns/tz"
import { differenceInCalendarDays, differenceInMonths, format } from "date-fns"
import {
  ArrowRightIcon,
  CheckIcon,
  FileWarningIcon,
  PillIcon,
  RulerIcon,
  StethoscopeIcon,
  TriangleAlertIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { formatPediatricAgeShort } from "@/lib/format-pediatric-age"
import { formatCentsToBRL, formatRelativeTime } from "@/lib/formatters"
import { getPatientInitials } from "@/lib/get-patient-initials"
import { cn } from "@/lib/utils"
import type { DashboardHomeData } from "@/modules/dashboard/get-dashboard-home-data"
import type { HomeAttention } from "@/modules/dashboard/get-home-attention"

export type HomeOverviewProps = {
  greeting: string
  dateLabel: string
  monthLabel: string
  monthReceivedCents: number
  now: Date
  home: DashboardHomeData
  attention: HomeAttention
}

const MAX_ATTENTION_ROWS = 5
const CONTEXT = { in: tz(CLINIC_TIME_ZONE) }

const ageOf = (birthDate: string | null) => formatPediatricAgeShort(computePediatricAge(birthDate))
const nameAndAge = (name: string, birthDate: string | null) => [name, ageOf(birthDate)].filter(Boolean).join(" · ")

type AttentionRow = {
  key: string
  icon: LucideIcon
  label: string
  title: string
  detail: string
  action: string
  href: string
}

/**
 * Início do dia a dia (protótipo a12): consulta aberta, o que pede atenção,
 * consultas recentes e os números da conta.
 */
export function HomeOverview({ greeting, dateLabel, monthLabel, monthReceivedCents, now, home, attention }: HomeOverviewProps) {
  const rows: AttentionRow[] = []
  if (attention.unbilledCount > 0) {
    rows.push({
      key: "unbilled",
      icon: WalletIcon,
      label: "Sem valor lançado",
      title: attention.unbilledCount === 1 ? "1 consulta" : `${attention.unbilledCount} consultas`,
      detail: `Encerradas em ${monthLabel} sem valor lançado`,
      action: "Lançar valores",
      href: "/dashboard/earnings",
    })
  }
  for (const p of attention.incomplete) {
    const missing = p.missing.map((m) => (m === "sex" ? "o sexo" : "a data de nascimento")).join(" e ")
    rows.push({
      key: `incomplete-${p.patientId}`,
      icon: FileWarningIcon,
      label: "Ficha incompleta",
      title: nameAndAge(p.name, p.birthDate),
      detail: `Falta ${missing}. A curva de crescimento depende disso.`,
      action: "Abrir ficha",
      href: `/dashboard/patients/${p.patientId}`,
    })
  }
  for (const p of attention.staleMeasure) {
    const months = p.lastMeasuredOn ? differenceInMonths(now, new Date(`${p.lastMeasuredOn}T12:00:00`)) : null
    rows.push({
      key: `measure-${p.patientId}`,
      icon: RulerIcon,
      label: "Sem medida recente",
      title: nameAndAge(p.name, p.birthDate),
      detail: months == null ? "Nenhuma medida de peso e altura registrada" : `Sem peso e altura há ${months} meses`,
      action: "Abrir ficha",
      href: `/dashboard/patients/${p.patientId}`,
    })
  }

  const active = home.activeCase
  const activeHref = active
    ? active.origin === "dashboard"
      ? `/dashboard/cases/new/${active.id}`
      : `/dashboard/cases/${active.id}`
    : null

  return (
    <div className="flex w-full max-w-[1440px] flex-col gap-6">
      <div>
        <h1 className="font-display text-page font-semibold">{greeting}</h1>
        <p className="mt-0.5 text-muted-foreground">{dateLabel}</p>
      </div>

      {active && activeHref ? (
        <div className="flex items-center gap-4 rounded-xl border border-primary-soft-border bg-highlight px-5 py-4 shadow-sm">
          <span className="relative">
            <span className="grid size-10 place-items-center rounded-full bg-primary-soft text-label font-semibold text-primary-ink-strong">
              {getPatientInitials(active.patient?.name ?? "?")}
            </span>
            <span className="absolute -top-0.5 -right-0.5 size-3 animate-pulse rounded-full bg-success ring-2 ring-card" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-title font-semibold">{active.patient?.name ?? "Consulta sem paciente"}</span>
              {active.patient?.birthDate ? <span className="text-muted-foreground">· {ageOf(active.patient.birthDate)}</span> : null}
              {active.patient?.allergies ? (
                <AttentionSymbol icon={TriangleAlertIcon} label="Alergia" detail={active.patient.allergies} danger />
              ) : null}
            </div>
            <div className="text-muted-foreground">Em andamento, começou {formatRelativeTime(active.startedAt)}</div>
          </div>
          <Button asChild className="ml-auto">
            <Link href={activeHref}>
              Voltar à consulta
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      ) : null}

      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <Panel title="Precisam de atenção" count={rows.length}>
          {rows.length === 0 ? (
            <div className="flex flex-1 items-center gap-3 px-5 py-6 text-muted-foreground">
              <span className="grid size-7 place-items-center rounded-full bg-success-soft text-success-text">
                <CheckIcon className="size-3.5" aria-hidden />
              </span>
              Nada pendente. As crianças atendidas nos últimos 3 meses estão com a ficha em dia.
            </div>
          ) : (
            rows.slice(0, MAX_ATTENTION_ROWS).map((row) => (
              <div key={row.key} className="flex min-h-16 items-center gap-3 px-5 py-3">
                <AttentionSymbol icon={row.icon} label={row.label} detail={row.detail} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{row.title}</div>
                  <div className="truncate text-caption text-muted-foreground">{row.detail}</div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={row.href}>{row.action}</Link>
                </Button>
              </div>
            ))
          )}
          {rows.length > MAX_ATTENTION_ROWS ? (
            <p className="px-5 py-3 text-caption text-subtle-foreground">
              E mais {rows.length - MAX_ATTENTION_ROWS}. Resolva as de cima e as próximas aparecem aqui.
            </p>
          ) : null}
        </Panel>

        <Panel title="Consultas recentes" footer={{ label: "Ver todas as consultas", href: "/dashboard/cases" }}>
          {home.recentClosedCases.length === 0 ? (
            <p className="flex-1 px-5 py-6 text-muted-foreground">As consultas encerradas aparecem aqui.</p>
          ) : (
            home.recentClosedCases.map((row) => (
              <Link key={row.id} href={`/dashboard/cases/${row.id}`} className="flex min-h-16 items-center gap-3 px-5 py-3 hover:bg-accent">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-label font-semibold text-muted-foreground">
                  {getPatientInitials(row.patientName ?? "?")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate">
                    <span className="font-semibold">{row.patientName ?? "Sem paciente"}</span>
                    {row.birthDate ? <span className="text-subtle-foreground"> · {ageOf(row.birthDate)}</span> : null}
                  </div>
                  <div className="truncate text-caption text-muted-foreground">{row.responsible ?? "Responsável não informado"}</div>
                </div>
                {row.prescriptionsCount > 0 ? <Badge>Receita</Badge> : null}
                {row.certificatesCount > 0 ? <Badge>Atestado</Badge> : null}
                <span className="num w-12 text-right text-caption text-subtle-foreground">{dayLabel(row.endedAt ?? row.startedAt, now)}</span>
              </Link>
            ))
          )}
        </Panel>
      </div>

      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 px-5 pt-4 pb-1">
          <h2 className="font-display text-section font-semibold">Seus números</h2>
          <Button asChild variant="link" size="sm" className="ml-auto">
            <Link href="/dashboard/earnings">
              Ver financeiro
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-4 divide-x divide-border">
          <Kpi icon={UsersIcon} label="Pacientes cadastrados" value={String(home.patientsCount)} note="no total" />
          <Kpi
            icon={StethoscopeIcon}
            label="Consultas no histórico"
            value={String(home.totalCasesCount)}
            note={`${home.closedCasesCount} encerradas`}
          />
          <Kpi icon={PillIcon} label="Receitas emitidas" value={String(home.prescriptionsCount)} note="no total" />
          <Kpi
            icon={WalletIcon}
            label={`Recebido em ${monthLabel}`}
            value={formatCentsToBRL(monthReceivedCents)}
            note={
              attention.unbilledCount > 0
                ? `${attention.unbilledCount} ${attention.unbilledCount === 1 ? "consulta sem valor lançado" : "consultas sem valor lançado"}`
                : "todas as consultas do mês lançadas"
            }
            warning={attention.unbilledCount > 0}
          />
        </div>
      </section>
    </div>
  )
}

function dayLabel(iso: string, now: Date): string {
  const days = differenceInCalendarDays(now, new Date(iso), CONTEXT)
  if (days === 0) return "Hoje"
  if (days === 1) return "Ontem"
  return format(new Date(iso), "dd/MM", CONTEXT)
}

function Panel({
  title,
  count,
  footer,
  children,
}: {
  title: string
  count?: number
  footer?: { label: string; href: string }
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 px-5 pt-4 pb-3">
        <h2 className="font-display text-section font-semibold">{title}</h2>
        {count ? <Badge variant="secondary" className="num">{count}</Badge> : null}
      </div>
      <div className="flex flex-1 flex-col divide-y divide-border border-t border-border">{children}</div>
      {footer ? (
        <Link
          href={footer.href}
          className="flex items-center gap-1 rounded-b-xl border-t border-border px-5 py-3 text-label font-medium text-primary-ink hover:bg-accent"
        >
          {footer.label}
          <ArrowRightIcon className="size-3.5" aria-hidden />
        </Link>
      ) : null}
    </section>
  )
}

/** Símbolo redondo do guia ("Selos e símbolos"): o ícone diz o tipo; hover ou foco mostra o detalhe. */
function AttentionSymbol({ icon: Icon, label, detail, danger }: { icon: LucideIcon; label: string; detail: string; danger?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          aria-label={`${label}: ${detail}`}
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-full border",
            danger ? "border-transparent bg-destructive text-destructive-foreground shadow-xs" : "border-warning-border bg-warning-soft text-warning-text",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        <span className="font-semibold">{label}</span>
        <span className="block">{detail}</span>
      </TooltipContent>
    </Tooltip>
  )
}

function Kpi({ icon: Icon, label, value, note, warning }: { icon: LucideIcon; label: string; value: string; note: string; warning?: boolean }) {
  return (
    <div className="flex flex-col gap-1 px-6 py-5">
      <div className="flex items-center gap-2 text-label text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </div>
      <div className="num font-display text-display font-semibold">{value}</div>
      <div className={cn("text-caption", warning ? "text-warning-text" : "text-subtle-foreground")}>{note}</div>
    </div>
  )
}
