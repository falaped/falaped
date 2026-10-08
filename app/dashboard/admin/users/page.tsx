import Link from "next/link"
import { ChevronRightIcon, SearchIcon, TriangleAlertIcon } from "lucide-react"

import { isAdminEmail } from "@/lib/admin"
import { requireAdmin } from "@/lib/admin-guard"
import {
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
import { Initials, LinkTab, PageHero } from "@/components/dashboard/admin/admin-ui"
import { ActivityPill, PaymentPill } from "@/components/dashboard/admin/health-badges"

export const metadata = { title: "Admin · Clientes" }

const isPaid = (r: ProfileUsageRow) => ["em-dia", "vencendo", "vencido"].includes(paymentState(r).state)
const isTrial = (r: ProfileUsageRow) => paymentState(r).state === "trial"

const FILTERS: Record<string, { label: string; match: (r: ProfileUsageRow) => boolean }> = {
  todos: { label: "Todas", match: () => true },
  atencao: { label: "Pedem atenção", match: (r) => attentionReasons(r).length > 0 },
  ativas: { label: "Ativas", match: (r) => activityState(r.last_activity_at) === "ativo" },
  teste: { label: "Em teste", match: isTrial },
  pagos: { label: "Pagas", match: isPaid },
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
  searchParams: Promise<{ ver?: string; q?: string; ordem?: string }>
}) {
  const admin = await requireAdmin()
  const { ver, q, ordem } = await searchParams
  const sortBy = ordem === "cadastro" ? "cadastro" : null
  const filter = ver && ver in FILTERS ? ver : "todos"
  const query = (q ?? "").trim().toLowerCase()

  // As contas do time saem da lista e dos totais: são teste, não cliente.
  const rows = (await listProfileUsage(admin)).filter((row) => !isAdminEmail(row.email))
  const visible = rows.filter(
    (r) =>
      FILTERS[filter].match(r) &&
      (!query || `${accountDisplayName(r)} ${r.email ?? ""}`.toLowerCase().includes(query)),
  )
  // A lista já vem da mais ativa; "Mais novas" é a ordem de cadastro (Novos cadastros do Painel).
  if (sortBy) visible.sort((a, b) => b.created_at.localeCompare(a.created_at))
  const count = (key: string) => rows.filter(FILTERS[key].match).length
  const maxDocs = Math.max(1, ...rows.map(documentsTotal))
  const href = (key: string, order: string | null = sortBy) => {
    const params = new URLSearchParams()
    if (key !== "todos") params.set("ver", key)
    if (order) params.set("ordem", order)
    if (query) params.set("q", q!)
    const s = params.toString()
    return s ? `/dashboard/admin/users?${s}` : "/dashboard/admin/users"
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHero title="Seus clientes" subtitle="Quem tem conta, se está em dia e se está usando" />

      <section className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-end gap-x-5 gap-y-3 border-b border-border px-5 pt-4">
          {Object.entries(FILTERS).map(([key, f]) => (
            <LinkTab key={key} href={href(key)} active={filter === key} count={count(key)} warn={key === "atencao"}>
              {f.label}
            </LinkTab>
          ))}
          <div className="ml-auto flex items-center gap-2 pb-2">
            <div className="flex rounded-lg bg-muted p-0.5 text-label">
              {(
                [
                  [null, "Mais ativas"],
                  ["cadastro", "Mais novas"],
                ] as const
              ).map(([value, label]) => (
                <Link
                  key={label}
                  href={href(filter, value)}
                  aria-current={sortBy === value ? "page" : undefined}
                  className={cn("rounded-md px-2.5 py-1", sortBy === value ? "bg-card font-medium shadow-xs" : "text-muted-foreground hover:text-foreground")}
                >
                  {label}
                </Link>
              ))}
            </div>
            {/* GET nativo: a busca vira ?q= e o filtro e a ordem atuais vão junto. */}
            <form action="/dashboard/admin/users" className="flex h-9 w-64 items-center gap-2 rounded-lg border border-input bg-card px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
              <SearchIcon className="size-4 text-subtle-foreground" aria-hidden />
              {filter !== "todos" ? <input type="hidden" name="ver" value={filter} /> : null}
              {sortBy ? <input type="hidden" name="ordem" value={sortBy} /> : null}
              <input
                name="q"
                defaultValue={q}
                placeholder="Nome ou e-mail"
                aria-label="Buscar por nome ou e-mail"
                className="w-full bg-transparent outline-none placeholder:text-subtle-foreground"
              />
            </form>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="px-5 py-12 text-center text-muted-foreground">
            {query ? `Nenhuma conta encontrada para "${q}".` : "Nenhuma conta neste filtro."}
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-label text-muted-foreground">
                <th className="py-2.5 pr-3 pl-5 font-medium">Conta</th>
                <th className="px-3 font-medium">Assinatura</th>
                <th className="px-3 font-medium">Atividade</th>
                <th className="px-3 font-medium">{sortBy === "cadastro" ? "Criou em" : "Último login"}</th>
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
                  <tr key={row.profile_id} className="relative border-b border-border last:border-0 hover:bg-accent">
                    <td className="py-3 pr-3 pl-5">
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
                          <p className="truncate text-caption text-subtle-foreground">{row.email ?? "sem e-mail"}</p>
                          {reason ? (
                            <p className="mt-0.5 flex items-center gap-1 text-caption font-medium text-warning-text">
                              <TriangleAlertIcon className="size-3.5" aria-hidden />
                              {reason}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3">
                      <PaymentPill payment={payment} />
                      {sub ? <p className="mt-1 text-caption text-subtle-foreground">{sub}</p> : null}
                    </td>
                    <td className="px-3">
                      <ActivityPill state={activity} />
                      {row.last_activity_at ? (
                        <p className="mt-1 text-caption text-subtle-foreground">{formatRelativeTime(row.last_activity_at)}</p>
                      ) : null}
                    </td>
                    <td className="num px-3 text-caption text-muted-foreground">
                      {sortBy === "cadastro"
                        ? formatDate(row.created_at)
                        : row.last_sign_in_at
                          ? formatRelativeTime(row.last_sign_in_at)
                          : "nunca"}
                    </td>
                    <td className="px-3">
                      <div className="flex min-w-40 items-center gap-2.5">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${(docs / maxDocs) * 100}%` }} />
                        </div>
                        <span className="num w-16 text-right text-caption text-muted-foreground">{docs > 0 ? `${docs} docs` : "—"}</span>
                      </div>
                    </td>
                    <td className={cn("num px-3 text-right", row.storage_bytes === 0 && "text-subtle-foreground")}>
                      {row.storage_bytes > 0 ? formatBytes(row.storage_bytes) : "—"}
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
      </section>
    </div>
  )
}
