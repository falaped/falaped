import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { isAdminEmail } from "@/lib/admin"
import { requireAdmin } from "@/lib/admin-guard"
import { accountDisplayName, activityState, attentionReasons, paymentState } from "@/lib/account-health"
import { formatRelativeTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { listLeads } from "@/modules/admin/list-leads"
import { listProfileUsage } from "@/modules/admin/list-profile-usage"
import { listProspects } from "@/modules/admin/list-prospects"

export const metadata = { title: "Admin · Painel" }

const DAY_MS = 24 * 60 * 60 * 1000
/** Lead da landing fica na fila por duas semanas: depois disso já é prospecção comum. */
const NEW_LEAD_DAYS = 14

type Task = { key: string; who: string; why: string; href: string; when?: string }

export default async function AdminDashboardPage() {
  const admin = await requireAdmin()
  const [usage, leads, prospects] = await Promise.all([listProfileUsage(admin), listLeads(admin), listProspects(admin)])

  const now = Date.now()
  const clients = usage.filter((r) => !isAdminEmail(r.email))
  const siteLeads = leads.filter((l) => l.origin === "site")
  const dueProspects = prospects.filter(
    (p) => p.next_contact_at && new Date(p.next_contact_at).getTime() <= now && p.status !== "fechou" && p.status !== "descartado",
  )

  const clientTasks: Task[] = clients.flatMap((r) => {
    const reasons = attentionReasons(r)
    return reasons.length
      ? [{ key: r.profile_id, who: accountDisplayName(r), why: reasons.join(" · "), href: `/dashboard/admin/users/${r.profile_id}` }]
      : []
  })
  const leadTasks: Task[] = siteLeads
    .filter((l) => now - new Date(l.created_at).getTime() <= NEW_LEAD_DAYS * DAY_MS)
    .map((l) => ({
      key: l.id,
      who: l.name || l.email || l.phone || "Sem nome",
      why: l.detail ? `Pela landing · ${l.detail}` : "Pela landing",
      href: "/dashboard/admin/leads",
      when: formatRelativeTime(l.created_at),
    }))
  const prospectTasks: Task[] = dueProspects
    .sort((a, b) => a.next_contact_at!.localeCompare(b.next_contact_at!))
    .map((p) => ({
      key: p.id,
      who: [p.title, p.name].filter(Boolean).join(" "),
      why: `Follow-up${p.city ? ` · ${p.city}` : ""}${p.email_status === "aberto" || p.email_status === "clicou" ? ` · ${p.email_status} o convite` : ""}`,
      href: "/dashboard/admin/prospects",
      when: `venceu ${formatRelativeTime(p.next_contact_at)}`,
    }))

  const totals = [
    { label: "Ativas na semana", value: clients.filter((r) => activityState(r.last_activity_at) === "ativo").length, of: clients.length },
    { label: "Pagas", value: clients.filter((r) => ["em-dia", "vencendo", "vencido"].includes(paymentState(r).state)).length },
    { label: "Em teste", value: clients.filter((r) => paymentState(r).state === "trial").length },
    { label: "Leads em 30 dias", value: siteLeads.filter((l) => now - new Date(l.created_at).getTime() <= 30 * DAY_MS).length },
    { label: "Prospects a contatar", value: prospects.filter((p) => p.status === "novo").length, of: prospects.length },
  ]

  const taskCount = clientTasks.length + leadTasks.length + prospectTasks.length

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground capitalize">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" })}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {taskCount === 0 ? "Nada pendente hoje" : `${taskCount} ${taskCount === 1 ? "coisa" : "coisas"} para fazer hoje`}
        </h1>
      </header>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-5">
        {totals.map((t) => (
          <div key={t.label} className="border-t pt-3">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t.label}</dt>
            <dd className="mt-1 flex items-baseline gap-1.5">
              <span className={cn("text-4xl font-semibold tabular-nums tracking-tight", t.value === 0 && "text-muted-foreground/40")}>
                {t.value}
              </span>
              {t.of !== undefined ? <span className="text-sm text-muted-foreground tabular-nums">de {t.of}</span> : null}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-12 lg:grid-cols-3">
        <TaskList title="Clientes" empty="Todas as contas em dia e usando." tasks={clientTasks} more={{ href: "/dashboard/admin/users?ver=atencao", label: "Ver clientes" }} />
        <TaskList title="Leads novos" empty={`Nenhum lead nos últimos ${NEW_LEAD_DAYS} dias.`} tasks={leadTasks} more={{ href: "/dashboard/admin/leads", label: "Ver leads" }} />
        <TaskList title="Follow-ups vencidos" empty="Nenhum follow-up vencido." tasks={prospectTasks} limit={8} more={{ href: "/dashboard/admin/prospects", label: "Ver prospecção" }} />
      </div>
    </div>
  )
}

function TaskList({
  title,
  empty,
  tasks,
  limit,
  more,
}: {
  title: string
  empty: string
  tasks: Task[]
  limit?: number
  more: { href: string; label: string }
}) {
  const shown = limit ? tasks.slice(0, limit) : tasks
  return (
    <section className="flex flex-col">
      <h2 className="flex items-baseline justify-between border-b pb-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</span>
        <span className="text-sm tabular-nums text-muted-foreground">{tasks.length}</span>
      </h2>
      {shown.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y">
          {shown.map((t) => (
            <li key={t.key}>
              <Link href={t.href} className="group flex flex-col gap-0.5 py-3">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-medium group-hover:underline">{t.who}</span>
                  {t.when ? <span className="shrink-0 text-xs text-muted-foreground">{t.when}</span> : null}
                </span>
                <span className="text-sm text-muted-foreground">{t.why}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href={more.href} className="mt-2 inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        {more.label}
        {limit && tasks.length > limit ? ` (+${tasks.length - limit})` : ""}
        <ArrowRightIcon className="size-3.5" aria-hidden />
      </Link>
    </section>
  )
}
