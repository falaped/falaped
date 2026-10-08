import Link from "next/link"
import { ArrowRightIcon, ChevronRightIcon, SendIcon } from "lucide-react"

import { isAdminEmail } from "@/lib/admin"
import { requireAdmin } from "@/lib/admin-guard"
import { ADMIN_SENDER } from "@/lib/admin-sender"
import { accountDisplayName, activityState, paymentState, type ActivityState } from "@/lib/account-health"
import { documentsTotal } from "@/lib/documents-total"
import { accountTask, leadTask, prospectTask, type AdminTask, type TaskGroup } from "@/lib/admin-tasks"
import { formatRelativeTime } from "@/lib/formatters"
import { isFollowUpDue } from "@/lib/funnel"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import { listProfileUsage } from "@/modules/admin/list-profile-usage"
import { listProspects } from "@/modules/admin/list-prospects"
import { Initials, PageHero, PanelCard, StatCard } from "@/components/dashboard/admin/admin-ui"
import { PaymentPill } from "@/components/dashboard/admin/health-badges"
import { TaskRow } from "@/components/dashboard/admin/task-row"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Admin · Painel" }

const DAY_MS = 24 * 60 * 60 * 1000
const HOT_LIMIT = 5
const SIGNUPS_LIMIT = 6
const STEP_LABELS = ["Criou a conta", "Cadastrou paciente", "Iniciou consulta", "Emitiu documento"]

const GROUPS: { key: TaskGroup; label: string; bar: string }[] = [
  { key: "agora", label: "Agora", bar: "bg-danger-text" },
  { key: "semana", label: "Esta semana", bar: "bg-warning" },
  { key: "prospeccao", label: "Prospecção", bar: "bg-primary" },
]

const HEALTH: { key: ActivityState; label: string; color: string }[] = [
  { key: "ativo", label: "Ativas (7 dias)", color: "bg-success" },
  { key: "esfriando", label: "Esfriando", color: "bg-warning" },
  { key: "parado", label: "Paradas", color: "bg-danger-text" },
  { key: "nunca-usou", label: "Nunca usaram", color: "bg-border-strong" },
]

function greeting(now: Date): string {
  const hour = Number(now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }))
  return hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"
}

export default async function AdminDashboardPage() {
  const admin = await requireAdmin()
  const session = await createClient()
  const [{ data: auth }, usage, prospects] = await Promise.all([
    session.auth.getUser(),
    listProfileUsage(admin),
    listProspects(admin),
  ])

  const now = new Date()
  const me = usage.find((r) => r.email?.toLowerCase() === auth.user?.email?.toLowerCase())
  const clients = usage.filter((r) => !isAdminEmail(r.email))
  // Lead da landing vive no funil; sem contato e sem conta ainda é "dar boas-vindas".
  const siteLeads = prospects
    .filter((p) => p.lead_at)
    .map((p) => ({ id: p.id, name: p.full_name, email: p.email, phone: p.phone, detail: null, created_at: p.lead_at!, pending: p.status === "novo" && !p.profile_id }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  const hot = prospects
    .map((p) => prospectTask(p, ADMIN_SENDER))
    .filter((t): t is AdminTask => t !== null)
    .sort((a, b) => (a.pill.label === "Quente" ? -1 : 0) - (b.pill.label === "Quente" ? -1 : 0))
  const tasks: AdminTask[] = [
    ...clients.map((r) => accountTask(r, ADMIN_SENDER, now)),
    ...siteLeads.filter((l) => l.pending).map((l) => leadTask(l, ADMIN_SENDER, now)),
    ...hot.slice(0, HOT_LIMIT),
  ].filter((t): t is AdminTask => t !== null)

  const dueFollowUps = prospects.filter((p) => isFollowUpDue(p, now)).length

  const health = HEALTH.map((h) => ({ ...h, value: clients.filter((r) => activityState(r.last_activity_at, now) === h.key).length }))
  const funnel = [
    { label: "Captados", value: prospects.length },
    { label: "Contatados", value: prospects.filter((p) => p.status !== "novo").length },
    {
      label: "Abriram",
      value: prospects.filter((p) => p.opened_at || p.status === "respondeu" || p.profile_id).length,
    },
    { label: "Responderam", value: prospects.filter((p) => p.replied_at || p.status === "respondeu" || p.profile_id).length },
    { label: "Criaram conta", value: prospects.filter((p) => p.profile_id).length },
  ]
  const recentLeads = siteLeads.filter((l) => now.getTime() - new Date(l.created_at).getTime() <= 30 * DAY_MS)
  const leadsToday = recentLeads.filter((l) => now.getTime() - new Date(l.created_at).getTime() <= DAY_MS).length

  const signups = clients
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, SIGNUPS_LIMIT)
    .map((row) => {
      const prospect = prospects.find((p) => p.profile_id === row.profile_id)
      const origin = !prospect ? "Cadastro direto" : prospect.referred_by ? "Indicação" : prospect.lead_at ? "Landing" : "Prospecção"
      const docs = documentsTotal(row)
      const steps = [true, row.patients > 0, row.cases > 0, docs > 0]
      return { row, origin, city: prospect?.city ?? null, steps, reached: STEP_LABELS[steps.lastIndexOf(true)] }
    })

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title={`${greeting(now)}${me?.first_name ? `, ${me.first_name}` : ""}`}
        subtitle={now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).replace(/^./, (c) => c.toUpperCase())}
      />

      <PanelCard
        title="Novos cadastros"
        description="Contas criadas, da mais nova para a mais antiga"
        bodyClassName="p-0"
        action={
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/admin/users?ordem=cadastro">
              Ver todos em Clientes
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        }
      >
        {signups.length === 0 ? (
          <p className="px-5 py-8 text-center text-muted-foreground">Nenhuma conta criada ainda.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-label text-muted-foreground">
                <th className="py-2.5 pr-3 pl-5 font-medium">Conta</th>
                <th className="px-3 font-medium">Criou em</th>
                <th className="px-3 font-medium">Assinatura</th>
                <th className="px-3 font-medium">Primeiros passos</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {signups.map(({ row, origin, city, steps, reached }) => {
                const name = accountDisplayName(row)
                return (
                  <tr key={row.profile_id} className="relative border-b border-border last:border-0 hover:bg-accent">
                    <td className="py-2.5 pr-3 pl-5">
                      <div className="flex items-center gap-3">
                        <Initials name={name} />
                        <div className="min-w-0">
                          {/* O link cobre a linha inteira (after:inset-0): a tabela continua sendo tabela. */}
                          <Link
                            href={`/dashboard/admin/users/${row.profile_id}`}
                            className="font-semibold after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:ring-2 after:focus-visible:ring-ring"
                          >
                            {name}
                          </Link>
                          <p className="truncate text-caption text-subtle-foreground">{[city, origin].filter(Boolean).join(" · ")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="num px-3 text-muted-foreground">{formatSignupDate(row.created_at, now)}</td>
                    <td className="px-3">
                      <PaymentPill payment={paymentState(row, now)} />
                    </td>
                    <td className="px-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex gap-1" aria-hidden>
                          {steps.map((done, i) => (
                            <span key={i} className={cn("h-1.5 w-6 rounded-full", done ? "bg-primary" : "bg-muted")} />
                          ))}
                        </span>
                        <span className="text-caption text-muted-foreground">{reached}</span>
                      </div>
                    </td>
                    <td className="pr-4 text-subtle-foreground">
                      <ChevronRightIcon className="size-4" aria-hidden />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </PanelCard>

      <PanelCard title="Para fazer hoje" description="Por urgência. Cada linha já traz a ação certa." bodyClassName="p-0 pb-1">
        {tasks.length === 0 && dueFollowUps === 0 ? (
          <p className="px-5 py-8 text-center text-muted-foreground">Nenhuma pendência. Todas as contas estão em dia e usando.</p>
        ) : (
          GROUPS.map((group) => {
            const items = tasks.filter((t) => t.group === group.key)
            const isProspect = group.key === "prospeccao"
            if (items.length === 0 && !(isProspect && dueFollowUps > 0)) return null
            return (
              <div key={group.key} className="pb-1">
                <p className="flex items-center gap-2 px-5 pt-4 pb-1 text-label font-semibold">
                  <span className={cn("h-3.5 w-[3px] rounded-full", group.bar)} aria-hidden />
                  {group.label}
                  <span className="num font-normal text-subtle-foreground">
                    {isProspect ? `${items.length} abriram o convite · ${dueFollowUps} follow-ups vencidos` : items.length}
                  </span>
                </p>
                <ul className="divide-y divide-border">
                  {items.map((task) => (
                    <TaskRow key={task.key} task={task} />
                  ))}
                  {isProspect && dueFollowUps > 0 ? (
                    <li className="grid min-h-14 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-4 px-5 py-3">
                      <span className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
                        <SendIcon className="size-4" aria-hidden />
                      </span>
                      <p className="text-muted-foreground">
                        {dueFollowUps} {dueFollowUps === 1 ? "prospect com follow-up vencido" : "prospects com follow-up vencido"}
                      </p>
                      <Button asChild variant="outline" size="sm">
                        <Link href="/dashboard/admin/funil?ver=vencido">Abrir no funil</Link>
                      </Button>
                    </li>
                  ) : null}
                </ul>
              </div>
            )
          })
        )}
      </PanelCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <StatCard title="Saúde das contas" description={`${clients.length} clientes`}>
          <div className="mb-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
            {health
              .filter((h) => h.value > 0)
              .map((h) => (
                <span key={h.key} className={h.color} style={{ flex: h.value }} />
              ))}
          </div>
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2">
            {health.map((h) => (
              <div key={h.key} className="contents">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <span className={cn("size-2 rounded-sm", h.color)} aria-hidden />
                  {h.label}
                </dt>
                <dd className="num text-right font-semibold">{h.value}</dd>
              </div>
            ))}
          </dl>
        </StatCard>

        <StatCard title="Funil de prospecção" description={`${prospects.length.toLocaleString("pt-BR")} pediatras captados`}>
          <div className="flex flex-col gap-2.5">
            {funnel.map((step) => (
              <div key={step.label} className="grid grid-cols-[96px_1fr_48px] items-center gap-2.5 text-label">
                <span className="text-muted-foreground">{step.label}</span>
                <div className="h-5 overflow-hidden rounded-md bg-primary-soft">
                  <div
                    className="h-full min-w-1 rounded-md bg-primary"
                    style={{ width: `${funnel[0].value ? (step.value / funnel[0].value) * 100 : 0}%` }}
                  />
                </div>
                <span className="num text-right font-semibold">{step.value.toLocaleString("pt-BR")}</span>
              </div>
            ))}
          </div>
        </StatCard>

        <StatCard
          title="Leads da landing"
          description="Últimos 30 dias"
          action={
            <Button asChild variant="ghost" size="xs">
              <Link href="/dashboard/admin/funil?ver=landing">Ver no funil</Link>
            </Button>
          }
        >
          <p className="flex items-baseline gap-2">
            <span className="num font-display text-page font-semibold">{recentLeads.length}</span>
            <span className="text-muted-foreground">
              {recentLeads.length === 1 ? "lead" : "leads"}
              {leadsToday > 0 ? `, ${leadsToday} hoje` : ""}
            </span>
          </p>
          {recentLeads.length > 0 ? (
            <ul className="mt-2 divide-y divide-border text-label">
              {recentLeads.slice(0, 4).map((l) => (
                <li key={l.id} className="flex justify-between gap-3 py-2">
                  <Link href={`/dashboard/admin/funil/${l.id}`} className="truncate hover:underline">
                    {l.name || l.email || l.phone || "Sem nome"}
                  </Link>
                  <span className="shrink-0 text-subtle-foreground">{formatRelativeTime(l.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-label text-muted-foreground">Nenhum lead nos últimos 30 dias.</p>
          )}
        </StatCard>
      </div>
    </div>
  )
}

/** "hoje, 09:12", "ontem, 18:40" ou "06/10, 21:05": a lista é de dias recentes. */
function formatSignupDate(iso: string, now: Date): string {
  const tz = { timeZone: "America/Sao_Paulo" } as const
  const day = (d: Date) => d.toLocaleDateString("pt-BR", tz)
  const d = new Date(iso)
  const time = d.toLocaleTimeString("pt-BR", { ...tz, hour: "2-digit", minute: "2-digit" })
  if (day(d) === day(now)) return `hoje, ${time}`
  if (day(d) === day(new Date(now.getTime() - DAY_MS))) return `ontem, ${time}`
  return `${d.toLocaleDateString("pt-BR", { ...tz, day: "2-digit", month: "2-digit" })}, ${time}`
}
