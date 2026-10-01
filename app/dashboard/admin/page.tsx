import Link from "next/link"
import { ActivityIcon, FilterIcon, ListChecksIcon, MagnetIcon, SendIcon } from "lucide-react"

import { isAdminEmail } from "@/lib/admin"
import { requireAdmin } from "@/lib/admin-guard"
import { ADMIN_SENDER } from "@/lib/admin-sender"
import { activityState, type ActivityState } from "@/lib/account-health"
import { accountTask, leadTask, prospectTask, summarizeTasks, type AdminTask, type TaskGroup } from "@/lib/admin-tasks"
import { formatRelativeTime } from "@/lib/formatters"
import { isFollowUpDue } from "@/lib/funnel"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import { listProfileUsage } from "@/modules/admin/list-profile-usage"
import { listProspects } from "@/modules/admin/list-prospects"
import { PageHero, PanelCard } from "@/components/dashboard/admin/admin-ui"
import { TaskRow } from "@/components/dashboard/admin/task-row"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Admin · Painel" }

const DAY_MS = 24 * 60 * 60 * 1000
const HOT_LIMIT = 5

const GROUPS: { key: TaskGroup; label: string; bar: string }[] = [
  { key: "agora", label: "Agora", bar: "bg-orange-600" },
  { key: "semana", label: "Esta semana", bar: "bg-amber-500" },
  { key: "prospeccao", label: "Prospecção", bar: "bg-primary" },
]

const HEALTH: { key: ActivityState; label: string; color: string }[] = [
  { key: "ativo", label: "Ativas (7 dias)", color: "bg-emerald-500" },
  { key: "esfriando", label: "Esfriando", color: "bg-amber-500" },
  { key: "parado", label: "Paradas", color: "bg-orange-600" },
  { key: "nunca-usou", label: "Nunca usaram", color: "bg-neutral-300 dark:bg-neutral-600" },
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

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        context={now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).replace(/^./, (c) => c.toUpperCase())}
        title={`${greeting(now)}${me?.first_name ? `, ${me.first_name}` : ""}`}
      >
        {summarizeTasks(tasks)}
      </PageHero>

      <PanelCard
        icon={ListChecksIcon}
        iconTone="amber"
        title="Para fazer hoje"
        description="Por urgência. Cada linha já traz a ação certa."
        bodyClassName="px-0 pb-1"
      >
        {tasks.length === 0 && dueFollowUps === 0 ? (
          <p className="border-t px-5 py-8 text-center text-sm text-muted-foreground">
            Nenhuma pendência. Todas as contas estão em dia e usando.
          </p>
        ) : (
          GROUPS.map((group) => {
            const items = tasks.filter((t) => t.group === group.key)
            const isProspect = group.key === "prospeccao"
            if (items.length === 0 && !(isProspect && dueFollowUps > 0)) return null
            return (
              <div key={group.key} className="pb-1">
                <p className="flex items-center gap-2 px-5 pt-3 pb-2 text-[13px] font-semibold">
                  <span className={cn("h-3.5 w-[3px] rounded-full", group.bar)} aria-hidden />
                  {group.label}
                  <span className="font-medium text-muted-foreground">
                    {isProspect ? `${items.length} abriram o convite · ${dueFollowUps} follow-ups vencidos` : items.length}
                  </span>
                </p>
                <ul>
                  {items.map((task) => (
                    <TaskRow key={task.key} task={task} primary={group.key === "agora"} />
                  ))}
                  {isProspect && dueFollowUps > 0 ? (
                    <li className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3.5 border-t px-5 py-3">
                      <span className="flex size-9 items-center justify-center rounded-[10px] bg-muted text-muted-foreground">
                        <SendIcon className="size-4" aria-hidden />
                      </span>
                      <p className="text-[13px] text-muted-foreground">
                        {dueFollowUps} {dueFollowUps === 1 ? "prospect com follow-up vencido" : "prospects com follow-up vencido"}
                      </p>
                      <Button asChild variant="outline">
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

      <div className="grid gap-5 lg:grid-cols-3">
        <PanelCard icon={ActivityIcon} title="Saúde das contas" description={`${clients.length} clientes`}>
          <div className="mb-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
            {health
              .filter((h) => h.value > 0)
              .map((h) => (
                <span key={h.key} className={h.color} style={{ flex: h.value }} />
              ))}
          </div>
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-[13px]">
            {health.map((h) => (
              <div key={h.key} className="contents">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <span className={cn("size-2 rounded-[3px]", h.color)} aria-hidden />
                  {h.label}
                </dt>
                <dd className="text-right font-semibold tabular-nums">{h.value}</dd>
              </div>
            ))}
          </dl>
        </PanelCard>

        <PanelCard icon={FilterIcon} title="Funil de prospecção" description={`${prospects.length} pediatras captados`}>
          <div className="flex flex-col gap-2.5">
            {funnel.map((step) => (
              <div key={step.label} className="grid grid-cols-[96px_1fr_40px] items-center gap-2.5 text-[13px]">
                <span className="text-muted-foreground">{step.label}</span>
                <div className="h-5 overflow-hidden rounded-md bg-primary/8">
                  <div
                    className="h-full min-w-1 rounded-md bg-gradient-to-r from-primary to-primary/60"
                    style={{ width: `${funnel[0].value ? (step.value / funnel[0].value) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-right font-semibold tabular-nums">{step.value}</span>
              </div>
            ))}
          </div>
        </PanelCard>

        <PanelCard
          icon={MagnetIcon}
          title="Leads da landing"
          description="últimos 30 dias"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/admin/funil?ver=landing">Ver no funil</Link>
            </Button>
          }
        >
          <p className="flex items-baseline gap-2">
            <span className="text-[26px] font-semibold tracking-tight tabular-nums">{recentLeads.length}</span>
            <span className="text-[13px] text-muted-foreground">
              {recentLeads.length === 1 ? "lead" : "leads"}
              {leadsToday > 0 ? `, ${leadsToday} hoje` : ""}
            </span>
          </p>
          {recentLeads.length > 0 ? (
            <ul className="mt-3 divide-y text-[13px]">
              {recentLeads.slice(0, 4).map((l) => (
                <li key={l.id} className="flex justify-between gap-3 py-2">
                  <Link href={`/dashboard/admin/funil/${l.id}`} className="truncate hover:underline">
                    {l.name || l.email || l.phone || "Sem nome"}
                  </Link>
                  <span className="shrink-0 text-muted-foreground">{formatRelativeTime(l.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13px] text-muted-foreground">Nenhum lead nos últimos 30 dias.</p>
          )}
        </PanelCard>
      </div>
    </div>
  )
}
