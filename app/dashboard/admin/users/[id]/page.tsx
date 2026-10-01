import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon, MailIcon, MessageCircleIcon } from "lucide-react"

import { requireAdmin } from "@/lib/admin-guard"
import { accountDisplayName, activityState, attentionReasons, paymentState } from "@/lib/account-health"
import { env } from "@/lib/env"
import {
  formatBytes,
  formatCentsToBRL,
  formatDate,
  formatDateTime,
  formatLinkedPhone,
  formatRelativeTime,
} from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { listProfileUsage, type ProfileUsageRow } from "@/modules/admin/list-profile-usage"
import { listSubscriptionPayments } from "@/modules/admin/list-subscription-payments"
import { INVITE_EARLY_PRICE } from "@/modules/admin/emails/invite-email"
import { AccountAccessForm } from "@/components/dashboard/admin/account-access-form"
import { ActivityStatus, PaymentStatus } from "@/components/dashboard/admin/health-badges"
import { PaymentForm } from "@/components/dashboard/admin/payment-form"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Admin · Cliente" }

/** Grupos do uso, na ordem em que o médico encontra as coisas no menu. */
const USAGE_GROUPS: { title: string; metrics: { key: keyof ProfileUsageRow; label: string }[] }[] = [
  {
    title: "Atendimentos",
    metrics: [
      { key: "patients", label: "Pacientes" },
      { key: "cases", label: "Casos" },
      { key: "discussions", label: "Discussões" },
      { key: "appointments", label: "Agendamentos" },
    ],
  },
  {
    title: "Documentos emitidos",
    metrics: [
      { key: "prescriptions", label: "Receitas" },
      { key: "certificates", label: "Atestados" },
      { key: "referrals", label: "Encaminhamentos" },
      { key: "reports", label: "Relatórios" },
      { key: "case_reports", label: "Relatórios de caso" },
      { key: "exam_requests", label: "Pedidos de exame" },
      { key: "guidance", label: "Orientações" },
    ],
  },
  {
    title: "Ficha clínica",
    metrics: [
      { key: "vaccine_doses", label: "Doses vacinais" },
      { key: "measurements", label: "Medições" },
      { key: "scales", label: "Escalas" },
      { key: "attachments", label: "Anexos" },
    ],
  },
  { title: "Financeiro", metrics: [{ key: "financial_entries", label: "Lançamentos" }] },
]

const senderFirstName = env.INVITE_EMAIL_FROM.split("<")[0].trim().split(/[\s,]+/)[0] || "Falaped"

export default async function AdminClientPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  const { id } = await params

  // ponytail: lê todas as contas e pega uma; view por id quando a base passar de centenas.
  const [rows, payments] = await Promise.all([listProfileUsage(admin), listSubscriptionPayments(admin, id)])
  const row = rows.find((r) => r.profile_id === id)
  if (!row) notFound()

  const name = accountDisplayName(row)
  const payment = paymentState(row)
  const activity = activityState(row.last_activity_at)
  const reasons = attentionReasons(row)
  const greeting = `Oi, ${row.first_name ?? name}! Aqui é o ${senderFirstName}, do Falaped. Tudo bem?`

  const facts = [
    { label: "Conta criada", value: formatDate(row.created_at) },
    { label: "Último login", value: row.last_sign_in_at ? formatDateTime(row.last_sign_in_at) : "nunca" },
    {
      label: "Último registro",
      value: row.last_activity_at ? `${formatDate(row.last_activity_at)} (${formatRelativeTime(row.last_activity_at)})` : "nenhum",
    },
    { label: "Storage", value: formatBytes(row.storage_bytes) },
    { label: "Telefone", value: row.phone ? formatLinkedPhone(row.phone) : "—" },
    { label: "CRM", value: row.crm ?? "—" },
  ]

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <Link
          href="/dashboard/admin/users"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" aria-hidden />
          Clientes
        </Link>
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
            <p className="text-muted-foreground">{row.email ?? "sem e-mail"}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              <PaymentStatus payment={payment} />
              <ActivityStatus state={activity} />
            </div>
          </div>
          <div className="flex gap-2">
            {row.phone ? (
              <Button asChild>
                <a href={`https://wa.me/${row.phone.replace(/\D/g, "")}?text=${encodeURIComponent(greeting)}`} target="_blank" rel="noreferrer">
                  <MessageCircleIcon aria-hidden />
                  WhatsApp
                </a>
              </Button>
            ) : null}
            {row.email ? (
              <Button asChild variant="outline">
                <a href={`mailto:${row.email}`}>
                  <MailIcon aria-hidden />
                  E-mail
                </a>
              </Button>
            ) : null}
          </div>
        </header>
        {reasons.length > 0 ? (
          <ul className="flex flex-col gap-1 border-l-2 border-amber-500 pl-4 text-sm">
            {reasons.map((r) => (
              <li key={r} className="font-medium">
                {r}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="grid gap-12 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-10">
          <Section title="Uso">
            <div className="flex flex-col gap-6">
              {USAGE_GROUPS.map((group) => (
                <div key={group.title}>
                  <h3 className="text-sm text-muted-foreground">{group.title}</h3>
                  <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                    {group.metrics.map((m) => {
                      const value = row[m.key] as number
                      return (
                        <div key={m.key}>
                          <dd className={cn("text-2xl font-semibold tabular-nums", value === 0 && "text-muted-foreground/40")}>
                            {value}
                          </dd>
                          <dt className="text-xs text-muted-foreground">{m.label}</dt>
                        </div>
                      )
                    })}
                  </dl>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Pagamentos">
            <PaymentForm profileId={row.profile_id} defaultAmount={INVITE_EARLY_PRICE.toFixed(2).replace(".", ",")} />
            {payments.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">Nenhum pagamento lançado.</p>
            ) : (
              <ul className="mt-6 divide-y border-y">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-baseline justify-between gap-4 py-3 text-sm">
                    <div>
                      <p className="font-medium tabular-nums">{formatCentsToBRL(p.amount_cents)}</p>
                      {p.note ? <p className="text-muted-foreground">{p.note}</p> : null}
                    </div>
                    <p className="text-right text-muted-foreground tabular-nums">
                      pago em {formatDate(p.paid_at)} · vale até {formatDate(p.valid_until)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <aside className="flex flex-col gap-10">
          <Section title="Dados">
            <dl className="flex flex-col divide-y border-y">
              {facts.map((f) => (
                <div key={f.label} className="flex justify-between gap-4 py-2.5 text-sm">
                  <dt className="text-muted-foreground">{f.label}</dt>
                  <dd className="text-right tabular-nums">{f.value}</dd>
                </div>
              ))}
            </dl>
          </Section>
          <Section title="Acesso">
            {/* key: o form reinicia com os valores da conta (e após o refresh). */}
            <AccountAccessForm key={`${row.status}:${row.trial_ends_at}`} row={row} />
          </Section>
        </aside>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h2>
      {children}
    </section>
  )
}
