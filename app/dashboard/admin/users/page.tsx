import Link from "next/link"
import {
  BadgeCheckIcon,
  ChevronRightIcon,
  HourglassIcon,
  SearchIcon,
  TriangleAlertIcon,
  UsersIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react"

import { isAdminEmail } from "@/lib/admin"
import { requireAdmin } from "@/lib/admin-guard"
import {
  EXPIRING_DAYS,
  accountDisplayName,
  activityState,
  attentionReasons,
  paymentState,
  type Payment,
} from "@/lib/account-health"
import { documentsTotal } from "@/lib/documents-total"
import { formatBytes, formatDate, formatRelativeTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { listProfileUsage, type ProfileUsageRow } from "@/modules/admin/list-profile-usage"
import { Initials, PageHero } from "@/components/dashboard/admin/admin-ui"
import { ActivityPill, PaymentPill } from "@/components/dashboard/admin/health-badges"

export const metadata = { title: "Admin · Clientes" }

const isPaid = (r: ProfileUsageRow) => ["em-dia", "vencendo", "vencido"].includes(paymentState(r).state)
const isTrial = (r: ProfileUsageRow) => paymentState(r).state === "trial"

const FILTERS: Record<string, { label: string; icon: LucideIcon; match: (r: ProfileUsageRow) => boolean }> = {
  todos: { label: "Todas", icon: UsersIcon, match: () => true },
  atencao: { label: "Pedem atenção", icon: TriangleAlertIcon, match: (r) => attentionReasons(r).length > 0 },
  ativas: { label: "Ativas", icon: ZapIcon, match: (r) => activityState(r.last_activity_at) === "ativo" },
  teste: { label: "Em teste", icon: HourglassIcon, match: isTrial },
  pagos: { label: "Pagas", icon: BadgeCheckIcon, match: isPaid },
}

/** Complemento da pílula de assinatura: quando vence ou há quanto tempo venceu. */
function paymentSub(row: ProfileUsageRow, payment: Payment): string | null {
  const d = payment.daysLeft
  switch (payment.state) {
    case "em-dia":
    case "vencendo":
      return row.paid_until ? `vence ${formatDate(row.paid_until).slice(0, 5)}` : "sem vencimento lançado"
    case "vencido":
      return `venceu há ${-(d ?? 0)} dias`
    case "trial":
      return d === 0 ? "acaba hoje" : `faltam ${d} ${d === 1 ? "dia" : "dias"}`
    case "trial-acabou":
      return `acabou há ${-(d ?? 0)} dias`
    default:
      return null
  }
}

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string; q?: string }>
}) {
  const admin = await requireAdmin()
  const { ver, q } = await searchParams
  const filter = ver && ver in FILTERS ? ver : "todos"
  const query = (q ?? "").trim().toLowerCase()

  // As contas do time saem da lista e dos totais: são teste, não cliente.
  const rows = (await listProfileUsage(admin)).filter((row) => !isAdminEmail(row.email))
  const visible = rows.filter(
    (r) =>
      FILTERS[filter].match(r) &&
      (!query || `${accountDisplayName(r)} ${r.email ?? ""}`.toLowerCase().includes(query)),
  )
  const count = (key: string) => rows.filter(FILTERS[key].match).length
  const maxDocs = Math.max(1, ...rows.map(documentsTotal))
  const attention = count("atencao")
  const endingTrials = rows.filter((r) => isTrial(r) && (paymentState(r).daysLeft ?? 99) <= EXPIRING_DAYS).length
  const overdue = rows.filter((r) => paymentState(r).state === "vencido").length

  const hints: Record<string, string> = {
    todos: "contas de clientes",
    atencao: "pagamento ou uso pedem você",
    ativas: "usaram nos últimos 7 dias",
    teste: endingTrials ? `${endingTrials} ${endingTrials === 1 ? "acaba" : "acabam"} nesta semana` : "nenhum acabando",
    pagos: overdue ? `${overdue} ${overdue === 1 ? "vencida" : "vencidas"}` : "nenhuma vencida",
  }
  const href = (key: string) => {
    const params = new URLSearchParams()
    if (key !== "todos") params.set("ver", key)
    if (query) params.set("q", q!)
    const s = params.toString()
    return s ? `/dashboard/admin/users?${s}` : "/dashboard/admin/users"
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHero context={`${rows.length} contas de clientes`} title="Clientes">
        Quem tem conta, se está em dia e se está usando.
        {attention > 0 ? ` ${attention === 1 ? "Uma pede" : `${attention} pedem`} você agora.` : " Todas em dia."}
      </PageHero>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Object.entries(FILTERS).map(([key, f]) => {
          const on = filter === key
          const warn = key === "atencao" && count(key) > 0
          const Icon = f.icon
          return (
            <Link
              key={key}
              href={href(key)}
              aria-current={on ? "page" : undefined}
              className={cn(
                "rounded-2xl bg-card px-4 py-3.5 shadow-xs ring-1 ring-foreground/10 transition-shadow hover:ring-primary/60 hover:shadow-md",
                warn &&
                  "bg-[radial-gradient(130%_150%_at_0%_0%,rgb(245_158_11/0.20),rgb(245_158_11/0.06)_45%,var(--card)_75%)] ring-amber-300/70 dark:ring-amber-500/40",
                on &&
                  "bg-[radial-gradient(130%_150%_at_0%_0%,color-mix(in_oklab,var(--primary)_26%,transparent),color-mix(in_oklab,var(--primary)_8%,transparent)_45%,var(--card)_75%)] ring-2 ring-primary",
              )}
            >
              <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <Icon className="size-4" aria-hidden />
                {f.label}
              </span>
              <span
                className={cn(
                  "mt-1.5 block text-[28px] leading-none font-semibold tracking-tight tabular-nums",
                  warn && "text-amber-700 dark:text-amber-400",
                )}
              >
                {count(key)}
              </span>
              <span className="mt-1.5 block text-xs text-muted-foreground">{hints[key]}</span>
            </Link>
          )
        })}
      </div>

      <section className="overflow-hidden rounded-2xl bg-card shadow-xs ring-1 ring-foreground/10">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          {/* GET nativo: a busca vira ?q= e o filtro atual vai junto. */}
          <form action="/dashboard/admin/users" className="flex h-9 w-72 items-center gap-2 rounded-lg px-3 ring-1 ring-border focus-within:ring-2 focus-within:ring-primary">
            <SearchIcon className="size-4 text-muted-foreground" aria-hidden />
            {filter !== "todos" ? <input type="hidden" name="ver" value={filter} /> : null}
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nome ou e-mail"
              aria-label="Buscar por nome ou e-mail"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </form>
          <span className="text-[13px] text-muted-foreground">Ordenado por atividade recente</span>
        </div>

        {visible.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">
            {query ? `Nenhuma conta encontrada para "${q}".` : "Nenhuma conta neste filtro."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="py-2.5 pr-3 pl-5 font-medium">Conta</th>
                <th className="px-3 font-medium">Assinatura</th>
                <th className="px-3 font-medium">Atividade</th>
                <th className="px-3 font-medium">Último login</th>
                <th className="px-3 font-medium">Uso</th>
                <th className="px-3 text-right font-medium">Storage</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const name = accountDisplayName(row)
                const payment = paymentState(row)
                const activity = activityState(row.last_activity_at)
                const reason = attentionReasons(row)[0]
                const docs = documentsTotal(row)
                const sub = paymentSub(row, payment)
                return (
                  <tr key={row.profile_id} className="relative border-b transition-colors last:border-0 hover:bg-primary/5">
                    <td className="py-3 pr-3 pl-5">
                      <div className="flex items-center gap-3">
                        <Initials name={name} />
                        <div className="min-w-0">
                          {/* O link cobre a linha inteira (after:inset-0): a tabela continua sendo tabela. */}
                          <Link
                            href={`/dashboard/admin/users/${row.profile_id}`}
                            className="font-medium after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:ring-2 after:focus-visible:ring-primary"
                          >
                            {name}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">{row.email ?? "sem e-mail"}</p>
                          {reason ? (
                            <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                              <TriangleAlertIcon className="size-3.5" aria-hidden />
                              {reason}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3">
                      <PaymentPill payment={payment} />
                      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
                    </td>
                    <td className="px-3">
                      <ActivityPill state={activity} />
                      {row.last_activity_at ? (
                        <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTime(row.last_activity_at)}</p>
                      ) : null}
                    </td>
                    <td className="px-3 text-xs text-muted-foreground">
                      {row.last_sign_in_at ? formatRelativeTime(row.last_sign_in_at) : "nunca"}
                    </td>
                    <td className="px-3">
                      <div className="flex min-w-40 items-center gap-2.5">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${(docs / maxDocs) * 100}%` }} />
                        </div>
                        <span className="w-16 text-right text-xs text-muted-foreground tabular-nums">
                          {docs > 0 ? `${docs} docs` : "—"}
                        </span>
                      </div>
                    </td>
                    <td className={cn("px-3 text-right tabular-nums", row.storage_bytes === 0 && "text-muted-foreground/50")}>
                      {row.storage_bytes > 0 ? formatBytes(row.storage_bytes) : "—"}
                    </td>
                    <td className="pr-4 text-muted-foreground/60">
                      <ChevronRightIcon className="size-4" aria-hidden />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
