import Link from "next/link"

import { isAdminEmail } from "@/lib/admin"
import { requireAdmin } from "@/lib/admin-guard"
import { accountDisplayName, activityState, attentionReasons, paymentState } from "@/lib/account-health"
import { documentsTotal } from "@/lib/documents-total"
import { formatBytes, formatRelativeTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { listProfileUsage, type ProfileUsageRow } from "@/modules/admin/list-profile-usage"
import { ActivityStatus, PaymentStatus } from "@/components/dashboard/admin/health-badges"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata = { title: "Admin · Clientes" }

const FILTERS = {
  todos: { label: "Todos", match: () => true },
  atencao: { label: "Pedem atenção", match: (r: ProfileUsageRow) => attentionReasons(r).length > 0 },
  teste: { label: "Em teste", match: (r: ProfileUsageRow) => paymentState(r).state === "trial" },
  pagos: {
    label: "Pagos",
    match: (r: ProfileUsageRow) => ["em-dia", "vencendo", "vencido"].includes(paymentState(r).state),
  },
} as const

type FilterKey = keyof typeof FILTERS

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>
}) {
  const admin = await requireAdmin()
  const { ver } = await searchParams
  const filter: FilterKey = ver && ver in FILTERS ? (ver as FilterKey) : "todos"

  // As contas do time saem da lista e dos totais: são teste, não cliente.
  const rows = (await listProfileUsage(admin)).filter((row) => !isAdminEmail(row.email))
  const visible = rows.filter(FILTERS[filter].match)

  const count = (pick: (r: ProfileUsageRow) => boolean) => rows.filter(pick).length
  const totals = [
    { label: "Contas", value: rows.length },
    { label: "Ativas na semana", value: count((r) => activityState(r.last_activity_at) === "ativo") },
    { label: "Pagas", value: count(FILTERS.pagos.match) },
    { label: "Em teste", value: count(FILTERS.teste.match) },
    { label: "Nunca usaram", value: count((r) => activityState(r.last_activity_at) === "nunca-usou") },
  ]

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Clientes</h1>
        <p className="max-w-2xl text-muted-foreground">
          Quem tem conta, se está em dia e se está usando. Clique numa conta para ver tudo e agir.
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-5">
        {totals.map((t) => (
          <div key={t.label} className="border-t pt-3">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t.label}</dt>
            <dd className={cn("mt-1 text-4xl font-semibold tabular-nums tracking-tight", t.value === 0 && "text-muted-foreground/40")}>
              {t.value}
            </dd>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(FILTERS) as FilterKey[]).map((key) => (
            <Link
              key={key}
              href={key === "todos" ? "/dashboard/admin/users" : `/dashboard/admin/users?ver=${key}`}
              className={cn(
                "rounded-full px-3 py-1 text-sm transition-colors",
                filter === key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {FILTERS[key].label}
              <span className="ml-1.5 tabular-nums opacity-60">{count(FILTERS[key].match)}</span>
            </Link>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="border-t py-10 text-center text-sm text-muted-foreground">Nenhuma conta neste filtro.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Conta</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Atividade</TableHead>
                <TableHead>Último login</TableHead>
                <TableHead className="text-right">Pacientes</TableHead>
                <TableHead className="text-right">Casos</TableHead>
                <TableHead className="text-right">Documentos</TableHead>
                <TableHead className="text-right">Storage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => {
                const reasons = attentionReasons(row)
                return (
                  <TableRow key={row.profile_id} className="relative">
                    <TableCell className="py-3">
                      {/* O link cobre a linha inteira (after:inset-0): a tabela continua sendo tabela. */}
                      <Link
                        href={`/dashboard/admin/users/${row.profile_id}`}
                        className="font-medium after:absolute after:inset-0 hover:underline"
                      >
                        {accountDisplayName(row)}
                      </Link>
                      <p className="text-xs text-muted-foreground">{row.email ?? "sem e-mail"}</p>
                      {reasons.length > 0 ? (
                        <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">{reasons.join(" · ")}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <PaymentStatus payment={paymentState(row)} />
                    </TableCell>
                    <TableCell>
                      <ActivityStatus
                        state={activityState(row.last_activity_at)}
                        detail={row.last_activity_at ? formatRelativeTime(row.last_activity_at) : null}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.last_sign_in_at ? formatRelativeTime(row.last_sign_in_at) : "nunca"}
                    </TableCell>
                    <NumberCell value={row.patients} />
                    <NumberCell value={row.cases} />
                    <NumberCell value={documentsTotal(row)} />
                    <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                      {row.storage_bytes > 0 ? formatBytes(row.storage_bytes) : "—"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}

function NumberCell({ value }: { value: number }) {
  return (
    <TableCell className={cn("text-right tabular-nums", value === 0 && "text-muted-foreground/40")}>{value}</TableCell>
  )
}
