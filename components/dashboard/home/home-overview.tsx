import Link from "next/link"
import { tz } from "@date-fns/tz"
import { differenceInCalendarDays, differenceInMinutes, differenceInMonths, format } from "date-fns"
import {
  ArrowRightIcon,
  BellIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CreditCardIcon,
  FilePenLineIcon,
  FileTextIcon,
  InfoIcon,
  ReceiptIcon,
  RulerIcon,
  StethoscopeIcon,
  TriangleAlertIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react"

import { StandaloneEntryDialog } from "@/components/dashboard/earnings/standalone-entry-dialog"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { formatPediatricAgeShort } from "@/lib/format-pediatric-age"
import { formatCentsToBRL } from "@/lib/formatters"
import { getPatientInitials } from "@/lib/get-patient-initials"
import { PAYMENT_METHOD_LABEL } from "@/lib/schemas/financial-entry"
import { cn } from "@/lib/utils"
import type { DashboardHomeData } from "@/modules/dashboard/get-dashboard-home-data"
import type { HomeDay } from "@/modules/dashboard/get-home-day"

export type HomeOverviewProps = {
  greeting: string
  dateLabel: string
  monthLabel: string
  /** Hoje em dd/MM/yyyy, para o diálogo de lançamento. */
  todayLabel: string
  now: Date
  home: DashboardHomeData
  day: HomeDay
  earnings: { todayCents: number; weekCents: number; monthCents: number; averageCents: number }
}

/** Quantos itens cada aba de "Para não esquecer" mostra. */
const MAX_TODO_ROWS = 3
const CONTEXT = { in: tz(CLINIC_TIME_ZONE) }

const ageOf = (birthDate: string | null) => formatPediatricAgeShort(computePediatricAge(birthDate))
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const caseHref = (caseId: string) => `/dashboard/cases/${caseId}`
const firstName = (name: string | null) => name?.split(" ")[0] ?? "Sem paciente"

/**
 * Início do dia a dia (protótipo a12, versão 3): saudação, consulta em andamento,
 * o dia em números ao lado de lembretes e pendências, o financeiro do mês e as
 * últimas consultas.
 */
export function HomeOverview({ greeting, dateLabel, monthLabel, todayLabel, now, home, day, earnings }: HomeOverviewProps) {
  const pendingCount = day.drafts.length + day.unbilled.length + day.staleMeasure.length
  const summary = [
    day.today.closedCount > 0 ? `você já atendeu ${plural(day.today.closedCount, "criança", "crianças")} hoje` : null,
    pendingCount > 0 ? `${day.today.closedCount > 0 ? "tem" : "você tem"} ${plural(pendingCount, "pendência", "pendências")}` : null,
  ].filter(Boolean)

  const active = home.activeCase
  const activeHref = active ? (active.origin === "dashboard" ? `/dashboard/cases/new/${active.id}` : caseHref(active.id)) : null

  const { prescriptions, certificates, otherDocuments } = day.today
  const documentsToday = prescriptions + certificates + otherDocuments
  const methods = day.month.paymentMethods.map((method) => PAYMENT_METHOD_LABEL[method])

  const pendingRows = [
    ...day.drafts.map((c) => (
      <TodoRow
        key={`draft-${c.caseId}`}
        icon={FilePenLineIcon}
        who={firstName(c.patientName)}
        what="relatório da consulta em rascunho"
        from={`Consulta ${consultLabel(c.endedAt, now)}`}
      >
        <Button asChild variant="outline" size="xs">
          <Link href={caseHref(c.caseId)}>Finalizar</Link>
        </Button>
      </TodoRow>
    )),
    ...day.unbilled.map((c) => (
      <TodoRow
        key={`unbilled-${c.caseId}`}
        icon={WalletIcon}
        who={firstName(c.patientName)}
        what="consulta sem valor lançado"
        from={`Consulta ${consultLabel(c.endedAt, now)}`}
      >
        <StandaloneEntryDialog todayLabel={todayLabel} caseId={c.caseId} triggerVariant="outline" triggerSize="xs" triggerLabel="Lançar valor" />
      </TodoRow>
    )),
    ...day.staleMeasure.map((p) => {
      const last = p.lastMeasuredOn ? new Date(`${p.lastMeasuredOn}T12:00:00`) : null
      return (
        <TodoRow
          key={`measure-${p.patientId}`}
          icon={RulerIcon}
          who={firstName(p.name)}
          what={last ? `sem peso e altura há ${plural(differenceInMonths(now, last), "mês", "meses")}` : "sem peso e altura registrados"}
          from={last ? `Última medida em ${format(last, "dd/MM")}` : "Nenhuma medida"}
        >
          <Button asChild variant="outline" size="xs">
            <Link href={`/dashboard/patients/${p.patientId}`}>Abrir ficha</Link>
          </Button>
        </TodoRow>
      )
    }),
  ]

  return (
    <div className="flex w-full max-w-[1440px] flex-col gap-6">
      <section className="rounded-xl border border-primary-soft-border bg-highlight px-8 py-7 shadow-sm">
        <h1 className="font-display text-display font-semibold">{greeting}</h1>
        <p className="mt-1 text-read text-muted-foreground">
          {dateLabel}
          {summary.length ? ` · ${summary.join(" e ")}` : null}
        </p>
      </section>

      {active && activeHref ? (
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
              {active.patient?.birthDate ? <span className="text-muted-foreground">· {ageOf(active.patient.birthDate)}</span> : null}
              {active.patient?.allergies ? <AllergySymbol detail={active.patient.allergies} /> : null}
            </div>
            <div className="mt-0.5 text-muted-foreground">
              Começou às {format(new Date(active.startedAt), "HH:mm", CONTEXT)}
              {active.patient?.responsible ? ` · com ${active.patient.responsible}` : null}
            </div>
          </div>
          <Button asChild size="lg" className="ml-auto">
            <Link href={activeHref}>
              Voltar à consulta
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </section>
      ) : null}

      <div className="grid items-stretch gap-5 xl:grid-cols-12">
        <section className="flex flex-col rounded-xl border border-border bg-card xl:col-span-4">
          <div className="flex items-center px-5 pt-4 pb-3">
            <h2 className="font-display text-section font-semibold">Hoje</h2>
            <span className="ml-auto text-caption text-subtle-foreground">até agora</span>
          </div>
          <div className="flex flex-1 flex-col divide-y divide-border border-t border-border">
            <TodayRow
              icon={StethoscopeIcon}
              label="Consultas"
              note={active ? "+1 em andamento" : "encerradas hoje"}
              value={String(day.today.closedCount)}
            />
            <TodayRow
              icon={FileTextIcon}
              label="Documentos emitidos"
              note={
                documentsToday
                  ? [
                      prescriptions ? plural(prescriptions, "receita", "receitas") : null,
                      certificates ? plural(certificates, "atestado", "atestados") : null,
                      otherDocuments ? plural(otherDocuments, "outro", "outros") : null,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : "nenhum ainda"
              }
              value={String(documentsToday)}
            />
            <TodayRow
              icon={WalletIcon}
              label="Recebido"
              note={
                day.today.closedCount
                  ? `${day.today.billedCount} de ${plural(day.today.closedCount, "consulta lançada", "consultas lançadas")}`
                  : "nenhuma consulta encerrada"
              }
              value={formatCentsToBRL(earnings.todayCents)}
            />
          </div>
        </section>

        <section className="flex flex-col rounded-xl border border-border bg-card xl:col-span-8">
          <Tabs defaultValue="reminders" className="flex-1 gap-0">
            <div className="flex items-end gap-6 px-5 pt-4">
              <h2 className="mr-2 pb-2.5 font-display text-section font-semibold">Para não esquecer</h2>
              <TabsList className="h-auto w-auto gap-5 rounded-none bg-transparent p-0 lg:w-auto">
                <TodoTab value="reminders">
                  Lembretes
                  <span className="num text-caption text-subtle-foreground">{day.reminders.length}</span>
                </TodoTab>
                <TodoTab value="pending">
                  Pendências
                  {pendingCount ? (
                    <span
                      aria-label={plural(pendingCount, "pendência", "pendências")}
                      className="num inline-flex items-center gap-1 rounded-full bg-warning-soft px-1.5 text-caption font-semibold text-warning-text"
                    >
                      <InfoIcon className="size-3" aria-hidden />
                      {pendingCount}
                    </span>
                  ) : null}
                </TodoTab>
              </TabsList>
            </div>
            <TabsContent value="reminders" className="mt-0 divide-y divide-border border-t border-border">
              {day.reminders.length === 0 ? (
                <Empty>Os lembretes que você deixar nas últimas consultas aparecem aqui.</Empty>
              ) : (
                day.reminders.slice(0, MAX_TODO_ROWS).map((reminder) => (
                  <TodoRow
                    key={reminder.id}
                    icon={BellIcon}
                    who={firstName(reminder.patientName)}
                    what={reminder.text}
                    from={`Consulta ${consultLabel(reminder.endedAt, now)}`}
                  >
                    <Button asChild variant="outline" size="xs">
                      <Link href={caseHref(reminder.caseId)}>Ver consulta</Link>
                    </Button>
                  </TodoRow>
                ))
              )}
            </TabsContent>
            <TabsContent value="pending" className="mt-0 divide-y divide-border border-t border-border">
              {pendingCount === 0 ? (
                <Empty>Nada pendente: relatórios finalizados, valores lançados e medidas em dia.</Empty>
              ) : (
                <>
                  {pendingRows.slice(0, MAX_TODO_ROWS)}
                  {pendingCount > MAX_TODO_ROWS ? (
                    <p className="px-5 py-3 text-caption text-subtle-foreground">
                      E mais {pendingCount - MAX_TODO_ROWS}. Resolva as de cima e as próximas aparecem aqui.
                    </p>
                  ) : null}
                </>
              )}
            </TabsContent>
          </Tabs>
        </section>
      </div>

      <Collapsible asChild>
        <section className="rounded-xl border border-primary-soft-border bg-highlight shadow-sm">
          <div className="flex flex-wrap items-center gap-2 px-6 pt-5">
            <h2 className="font-display text-section font-semibold">Financeiro de {monthLabel}</h2>
            {day.unbilled.length ? (
              <CollapsibleTrigger className="group inline-flex h-6 cursor-pointer items-center gap-1 rounded-md border border-warning-border bg-warning-soft px-2 text-caption font-medium text-warning-text hover:border-warning-text/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                <WalletIcon className="size-3.5" aria-hidden />
                {plural(day.unbilled.length, "consulta sem valor", "consultas sem valor")}
                <ChevronDownIcon className="size-3.5 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
              </CollapsibleTrigger>
            ) : null}
            <Button asChild variant="link" size="sm" className="ml-auto">
              <Link href="/dashboard/earnings">
                Ver financeiro
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </div>
          <CollapsibleContent className="mx-6 mt-3 rounded-lg border border-warning-border bg-card">
            <div className="px-4 py-2 text-caption font-medium text-warning-text">Consultas de {monthLabel} sem valor lançado</div>
            {day.unbilled.map((c) => (
              <div key={c.caseId} className="flex items-center gap-3 border-t border-border px-4 py-2.5">
                <Initials name={c.patientName} small />
                <div className="min-w-0 flex-1">
                  <div className="truncate">
                    <span className="font-semibold">{c.patientName ?? "Sem paciente"}</span>
                    {c.birthDate ? <span className="text-subtle-foreground"> · {ageOf(c.birthDate)}</span> : null}
                  </div>
                  <div className="truncate text-caption text-muted-foreground">
                    {c.reason ?? "Consulta"} · {consultLabel(c.endedAt, now, true)}
                  </div>
                </div>
                <StandaloneEntryDialog todayLabel={todayLabel} caseId={c.caseId} triggerSize="xs" triggerLabel="Lançar valor" />
                <Button asChild variant="outline" size="xs">
                  <Link href={caseHref(c.caseId)}>Abrir consulta</Link>
                </Button>
              </div>
            ))}
          </CollapsibleContent>
          <div className="grid grid-cols-4 divide-x divide-primary-soft-border/70">
            <Money
              icon={WalletIcon}
              label="Recebido no mês"
              value={formatCentsToBRL(earnings.monthCents)}
              note={`${formatCentsToBRL(earnings.weekCents)} nesta semana`}
              big
            />
            <Money icon={StethoscopeIcon} label="Consultas" value={String(day.month.closedCount)} note={`${day.month.billedCount} com valor lançado`} />
            <Money icon={ReceiptIcon} label="Média por consulta" value={formatCentsToBRL(earnings.averageCents)} note="das consultas lançadas" />
            <Money
              icon={CreditCardIcon}
              label="Como recebeu"
              value={methods.length ? methods.slice(0, 2).map((label, index) => (index ? label.toLowerCase() : label)).join(" · ") : "—"}
              note={
                methods.length > 2
                  ? `e também ${methods.slice(2).join(", ").toLowerCase()}`
                  : methods.length
                    ? "formas usadas no mês"
                    : "nenhum lançamento ainda"
              }
            />
          </div>
        </section>
      </Collapsible>

      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 px-5 pt-4 pb-3">
          <h2 className="font-display text-section font-semibold">Últimas consultas</h2>
          <Button asChild variant="link" size="sm" className="ml-auto">
            <Link href="/dashboard/cases">
              Ver todas
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>
        <div className="divide-y divide-border border-t border-border">
          {home.recentClosedCases.length === 0 ? (
            <Empty>As consultas encerradas aparecem aqui.</Empty>
          ) : (
            home.recentClosedCases.map((row) => (
              <Link key={row.id} href={caseHref(row.id)} className="flex items-center gap-3 px-5 py-3 hover:bg-accent">
                <Initials name={row.patientName} />
                <div className="min-w-0 flex-1">
                  <div className="truncate">
                    <span className="font-semibold">{row.patientName ?? "Sem paciente"}</span>
                    {row.birthDate ? <span className="text-subtle-foreground"> · {ageOf(row.birthDate)}</span> : null}
                  </div>
                  <div className="truncate text-caption text-muted-foreground">{row.reason ?? "Consulta"}</div>
                </div>
                <span className="num text-caption text-subtle-foreground">{consultLabel(row.endedAt ?? row.startedAt, now, true)}</span>
                <ChevronRightIcon className="size-3.5 text-subtle-foreground" aria-hidden />
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

/** "12 min" ou "1 h 05 min" desde o início da consulta. */
function elapsed(startedAt: string, now: Date): string {
  const minutes = Math.max(0, differenceInMinutes(now, new Date(startedAt)))
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`
}

/** "de hoje, 10:14", "de ontem", "de 04/10"; com `bare`, "Hoje, 10:14", "Ontem, 16:52", "04/10". */
function consultLabel(iso: string, now: Date, bare = false): string {
  const date = new Date(iso)
  const days = differenceInCalendarDays(now, date, CONTEXT)
  const time = format(date, "HH:mm", CONTEXT)
  if (days === 0) return bare ? `Hoje, ${time}` : `de hoje, ${time}`
  if (days === 1) return bare ? `Ontem, ${time}` : "de ontem"
  const day = format(date, "dd/MM", CONTEXT)
  return bare ? day : `de ${day}`
}

function Initials({ name, small }: { name: string | null; small?: boolean }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-muted font-semibold text-muted-foreground",
        small ? "size-8 text-caption" : "size-9 text-label",
      )}
    >
      {getPatientInitials(name ?? "?")}
    </span>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-6 text-muted-foreground">{children}</p>
}

function TodayRow({ icon: Icon, label, note, value }: { icon: LucideIcon; label: string; note: string; value: string }) {
  return (
    <div className="flex flex-1 items-center gap-3 px-5 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-label text-muted-foreground">{label}</div>
        <div className="truncate text-caption text-subtle-foreground">{note}</div>
      </div>
      <div className="num font-display text-page font-semibold">{value}</div>
    </div>
  )
}

function TodoTab({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <TabsTrigger
      value={value}
      className="-mb-px flex-none gap-1.5 rounded-none border-b-2 border-transparent px-1 pt-0 pb-2.5 text-body font-normal text-muted-foreground shadow-none hover:text-foreground sm:px-1 sm:text-body data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none"
    >
      {children}
    </TabsTrigger>
  )
}

function TodoRow({
  icon: Icon,
  who,
  what,
  from,
  children,
}: {
  icon: LucideIcon
  who: string
  what: string
  from: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full border border-border bg-muted text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate">
          <span className="font-semibold">{who}</span> <span className="text-muted-foreground">{what}</span>
        </div>
        <div className="text-caption text-subtle-foreground">{from}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Money({ icon: Icon, label, value, note, big }: { icon: LucideIcon; label: string; value: string; note: string; big?: boolean }) {
  return (
    <div className="flex flex-col gap-1 px-6 py-5">
      <div className="flex items-center gap-2 text-label text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </div>
      <div className={cn("num font-display font-semibold", big ? "text-display" : "text-page")}>{value}</div>
      <div className="text-caption text-subtle-foreground">{note}</div>
    </div>
  )
}

/** Símbolo de alergia do guia ("Selos e símbolos"): hover ou foco mostra qual é. */
function AllergySymbol({ detail }: { detail: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          aria-label={`Alergia: ${detail}`}
          className="grid size-7 shrink-0 place-items-center rounded-full border border-transparent bg-destructive text-destructive-foreground shadow-xs"
        >
          <TriangleAlertIcon className="size-3.5" aria-hidden />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        <span className="font-semibold">Alergia</span>
        <span className="block">{detail}</span>
      </TooltipContent>
    </Tooltip>
  )
}
