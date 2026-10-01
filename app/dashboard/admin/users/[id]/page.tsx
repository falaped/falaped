import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeftIcon,
  BadgeCheckIcon,
  BabyIcon,
  ChartColumnIcon,
  CheckIcon,
  CreditCardIcon,
  FileCheckIcon,
  HistoryIcon,
  InfoIcon,
  KeyRoundIcon,
  LifeBuoyIcon,
  LogInIcon,
  MailIcon,
  MailOpenIcon,
  MessageCircleIcon,
  MessagesSquareIcon,
  PhoneIcon,
  RouteIcon,
  StethoscopeIcon,
  UserPlusIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react"

import { requireAdmin } from "@/lib/admin-guard"
import { ADMIN_SENDER } from "@/lib/admin-sender"
import { ACTIVITY_LABEL, PAYMENT_LABEL, accountDisplayName, activityState, paymentState } from "@/lib/account-health"
import { accountTask, type TaskKind } from "@/lib/admin-tasks"
import { documentsTotal } from "@/lib/documents-total"
import {
  formatBytes,
  formatCentsToBRL,
  formatDate,
  formatDateTime,
  formatLinkedPhone,
  formatRelativeTime,
} from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { getProspectByProfile } from "@/modules/admin/get-prospect-by-profile"
import { listProfileUsage, type ProfileUsageRow } from "@/modules/admin/list-profile-usage"
import { listSubscriptionPayments } from "@/modules/admin/list-subscription-payments"
import { EARLY_PRICE, recipientValues, type MessageMoment } from "@/lib/message-template"
import { listMessageTemplates } from "@/modules/admin/list-message-templates"
import { EmailComposerButton, WhatsappMenu } from "@/components/dashboard/admin/whatsapp-menu"
import { AccountAccessForm } from "@/components/dashboard/admin/account-access-form"
import { GradientCard, Initials, PanelCard, WHATSAPP_BUTTON } from "@/components/dashboard/admin/admin-ui"
import { ActivityPill, PaymentPill } from "@/components/dashboard/admin/health-badges"
import { PaymentDialog } from "@/components/dashboard/admin/payment-dialog"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Admin · Cliente" }

const DAY_MS = 24 * 60 * 60 * 1000

/** Tudo que a conta pode usar, na ordem do menu. Zero vira etiqueta de "ainda não usou". */
const METRICS: { key: keyof ProfileUsageRow; label: string }[] = [
  { key: "patients", label: "Pacientes" },
  { key: "cases", label: "Casos" },
  { key: "discussions", label: "Discussões" },
  { key: "appointments", label: "Agendamentos" },
  { key: "prescriptions", label: "Receitas" },
  { key: "certificates", label: "Atestados" },
  { key: "referrals", label: "Encaminhamentos" },
  { key: "reports", label: "Relatórios" },
  { key: "case_reports", label: "Relatórios de caso" },
  { key: "exam_requests", label: "Pedidos de exame" },
  { key: "guidance", label: "Orientações" },
  { key: "vaccine_doses", label: "Vacinas" },
  { key: "measurements", label: "Medições" },
  { key: "scales", label: "Escalas" },
  { key: "attachments", label: "Anexos" },
  { key: "financial_entries", label: "Financeiro" },
]

const SUGGESTION: Record<TaskKind, string> = {
  "pagou-sem-uso": "Vale uma mensagem oferecendo 15 minutos para configurar junto.",
  "teste-acabando": "Bom momento para perguntar como está sendo e apresentar a condição de fundador.",
  "teste-acabou": "Pergunte se quer continuar: a condição de fundador ainda vale.",
  "teste-sem-uso": "Ofereça uma demonstração curta para o teste valer de verdade.",
  renovacao: "Combine a renovação e mande o Pix.",
  parada: "Pergunte se algo atrapalhou o uso.",
  lead: "",
  quente: "",
}

const EMAIL_STATUS_TEXT: Record<string, string> = {
  entregue: "Convite entregue",
  aberto: "Abriu o convite",
  clicou: "Clicou no link do convite",
  bounce: "Convite voltou (e-mail inválido)",
  reclamou: "Marcou o convite como spam",
}

/** Mensagem sugerida no WhatsApp/e-mail da ficha, pela pendência da conta. */
const TASK_MOMENT: Record<TaskKind, MessageMoment> = {
  "pagou-sem-uso": "ajuda",
  "teste-acabando": "teste-acabando",
  "teste-acabou": "teste-acabando",
  "teste-sem-uso": "ajuda",
  renovacao: "pagamento",
  parada: "reativacao",
  lead: "boas-vindas",
  quente: "follow-up",
}

type Event = { at: string; icon: LucideIcon; tone: "blue" | "green" | "gray"; text: string }

export default async function AdminClientPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  const { id } = await params

  // ponytail: lê todas as contas e pega uma; view por id quando a base passar de centenas.
  const [rows, payments, prospect, templates] = await Promise.all([
    listProfileUsage(admin),
    listSubscriptionPayments(admin, id),
    getProspectByProfile(admin, id),
    listMessageTemplates(admin),
  ])
  const row = rows.find((r) => r.profile_id === id)
  if (!row) notFound()

  const now = new Date()
  const name = accountDisplayName(row)
  const payment = paymentState(row, now)
  const activity = activityState(row.last_activity_at, now)
  const task = accountTask(row, ADMIN_SENDER, now)
  const docs = documentsTotal(row)
  const send = {
    recipient: { profileId: row.profile_id },
    name,
    email: row.email,
    phone: row.phone,
    templates,
    values: recipientValues(
      { title: null, name: row.first_name ?? name, city: prospect?.city ?? null, trialDaysLeft: payment.state === "trial" ? payment.daysLeft : null },
      ADMIN_SENDER,
    ),
    context: [
      `Trate por "${row.first_name ?? name}".`,
      `${name}, cliente do Falaped desde ${formatDate(row.created_at)}.`,
      `Assinatura: ${PAYMENT_LABEL[payment.state]}${payment.daysLeft != null ? ` (${payment.daysLeft} dias)` : ""}. Atividade: ${ACTIVITY_LABEL[activity]}.`,
      `${row.patients} pacientes, ${row.cases} atendimentos, ${docs} documentos.`,
      task ? `Pendência: ${task.why.map((p) => (typeof p === "string" ? p : p.b)).join("")}` : "",
    ].join("\n"),
    defaultMoment: task ? TASK_MOMENT[task.kind] : ("ajuda" as MessageMoment),
  }

  const steps = [
    { label: "Criou a conta", icon: UserPlusIcon, done: true, detail: formatDate(row.created_at).slice(0, 5) },
    { label: "Cadastrar paciente", icon: BabyIcon, done: row.patients > 0, detail: `${row.patients} pacientes` },
    { label: "Abrir um caso", icon: MessagesSquareIcon, done: row.cases > 0, detail: `${row.cases} casos` },
    { label: "Emitir documento", icon: FileCheckIcon, done: docs > 0, detail: `${docs} documentos` },
  ]
  const nextStep = steps.findIndex((s) => !s.done)

  const used = METRICS.filter((m) => (row[m.key] as number) > 0)
  const unused = METRICS.filter((m) => (row[m.key] as number) === 0)

  const events: Event[] = [
    { at: row.created_at, icon: UserPlusIcon, tone: "blue" as const, text: prospect ? "Criou a conta depois do convite de prospecção" : "Criou a conta" },
    ...(row.last_sign_in_at ? [{ at: row.last_sign_in_at, icon: LogInIcon, tone: "blue" as const, text: "Último login" }] : []),
    ...(row.last_activity_at ? [{ at: row.last_activity_at, icon: ZapIcon, tone: "green" as const, text: "Último registro no app" }] : []),
    ...payments.map((p) => ({
      at: `${p.paid_at}T12:00:00`,
      icon: BadgeCheckIcon,
      tone: "green" as const,
      text: `Pagamento de ${formatCentsToBRL(p.amount_cents)} lançado, vale até ${formatDate(p.valid_until)}${p.note ? ` (${p.note})` : ""}`,
    })),
    ...(prospect?.invited_at
      ? [
          {
            at: prospect.invited_at,
            icon: MailOpenIcon,
            tone: "gray" as const,
            text: `Recebeu o convite por e-mail${prospect.email_status && EMAIL_STATUS_TEXT[prospect.email_status] ? `. ${EMAIL_STATUS_TEXT[prospect.email_status]}.` : ""}`,
          },
        ]
      : []),
  ].sort((a, b) => b.at.localeCompare(a.at))

  const lastPayment = payments[0]
  const periodDays = lastPayment
    ? Math.max(1, Math.round((new Date(lastPayment.valid_until).getTime() - new Date(lastPayment.paid_at).getTime()) / DAY_MS))
    : 30

  const facts = [
    { label: "Conta criada", value: formatDate(row.created_at) },
    { label: "Último login", value: row.last_sign_in_at ? formatDateTime(row.last_sign_in_at) : "nunca" },
    { label: "Último registro", value: row.last_activity_at ? formatRelativeTime(row.last_activity_at) : "nenhum" },
    { label: "Storage", value: formatBytes(row.storage_bytes) },
    { label: "Origem", value: prospect ? "Prospecção, convite por e-mail" : "Cadastro direto" },
    ...(prospect?.city ? [{ label: "Cidade", value: prospect.city }] : []),
  ]

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/dashboard/admin/users"
        className="inline-flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden />
        Clientes
      </Link>

      <GradientCard className="flex flex-wrap items-end justify-between gap-5 px-7 py-6">
        <div className="flex items-end gap-4">
          <Initials name={name} className="size-21 rounded-[20px] border-4 border-card bg-card text-[26px] shadow-sm" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
            <p className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
              {row.email ? (
                <span className="inline-flex items-center gap-1.5">
                  <MailIcon className="size-3.5" aria-hidden />
                  {row.email}
                </span>
              ) : null}
              {row.phone ? (
                <span className="inline-flex items-center gap-1.5">
                  <PhoneIcon className="size-3.5" aria-hidden />
                  {formatLinkedPhone(row.phone)}
                </span>
              ) : null}
              {row.crm ? (
                <span className="inline-flex items-center gap-1.5">
                  <StethoscopeIcon className="size-3.5" aria-hidden />
                  CRM {row.crm}
                </span>
              ) : null}
            </p>
            <div className="mt-2.5 flex gap-1.5">
              <PaymentPill payment={payment} />
              <ActivityPill state={activity} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <WhatsappMenu {...send} />
          <EmailComposerButton {...send} className="bg-card" />
        </div>
      </GradientCard>

      {task ? (
        <GradientCard tone="amber" className="grid grid-cols-[40px_1fr_auto] items-center gap-3.5 px-5 py-4">
          <span className="flex size-10 items-center justify-center rounded-[11px] bg-card text-amber-700 ring-1 ring-amber-300/70 dark:text-amber-400">
            <LifeBuoyIcon className="size-5" aria-hidden />
          </span>
          <div>
            <p className="font-semibold">{task.why.map((p) => (typeof p === "string" ? p : p.b)).join("")}</p>
            <p className="mt-0.5 text-[13px] text-amber-900/80 dark:text-amber-200/80">{SUGGESTION[task.kind]}</p>
          </div>
          {task.action ? (
            <Button asChild className={task.action.kind === "whatsapp" ? WHATSAPP_BUTTON : undefined}>
              <a href={task.action.href} target="_blank" rel="noreferrer">
                {task.action.kind === "whatsapp" ? <MessageCircleIcon aria-hidden /> : <MailIcon aria-hidden />}
                {task.action.label}
              </a>
            </Button>
          ) : null}
        </GradientCard>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-5">
          <PanelCard icon={RouteIcon} title="Primeiros passos" description="Onde a conta está na adoção do Falaped">
            <ol className="grid grid-cols-4">
              {steps.map((step, i) => {
                const Icon = step.done ? CheckIcon : step.icon
                const isNext = i === nextStep
                return (
                  <li key={step.label} className="relative flex flex-col items-center gap-2 px-1.5 text-center">
                    {i > 0 ? (
                      <span
                        className={cn("absolute top-[15px] right-1/2 h-0.5 w-full", step.done ? "bg-primary" : "bg-border")}
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={cn(
                        "relative flex size-8 items-center justify-center rounded-full bg-card ring-2",
                        step.done && "bg-primary text-white ring-4 ring-primary/20",
                        isNext && "text-amber-700 ring-amber-500 dark:text-amber-400",
                        !step.done && !isNext && "text-muted-foreground/60 ring-border",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="text-[13px] font-medium">{step.label}</span>
                    <span className="text-xs text-muted-foreground">{step.done ? step.detail : isNext ? "parou aqui" : "—"}</span>
                  </li>
                )
              })}
            </ol>
          </PanelCard>

          <PanelCard
            icon={ChartColumnIcon}
            title="Uso"
            description={used.length ? "O que a conta já registrou no Falaped" : "Nenhum registro ainda"}
          >
            {used.length ? (
              <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {used.map((m) => (
                  <div key={m.key} className="rounded-[10px] bg-muted/40 px-3.5 py-3 ring-1 ring-border">
                    <dd className="text-[22px] font-semibold tabular-nums">{row[m.key] as number}</dd>
                    <dt className="text-xs text-muted-foreground">{m.label}</dt>
                  </div>
                ))}
              </dl>
            ) : null}
            {used.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                Ainda não cadastrou paciente, abriu caso nem emitiu documento.
              </p>
            ) : unused.length ? (
              <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
                Ainda não usou:
                {unused.map((m) => (
                  <span key={m.key} className="rounded-md bg-muted px-2 py-0.5 text-xs">
                    {m.label}
                  </span>
                ))}
              </div>
            ) : null}
          </PanelCard>

          <PanelCard icon={HistoryIcon} title="Histórico" description="O que já aconteceu com esta conta">
            <ol>
              {events.map((e, i) => {
                const Icon = e.icon
                return (
                  <li key={`${e.text}-${i}`} className="relative grid grid-cols-[28px_1fr_auto] gap-3 py-2.5">
                    {i < events.length - 1 ? (
                      <span className="absolute top-[38px] -bottom-2.5 left-[13px] w-0.5 bg-border" aria-hidden />
                    ) : null}
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded-lg",
                        e.tone === "blue" && "bg-primary/12 text-primary-ink",
                        e.tone === "green" && "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
                        e.tone === "gray" && "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="size-3.5" aria-hidden />
                    </span>
                    <span className="self-center text-[13px]">{e.text}</span>
                    <span className="self-center text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                      {formatDateTime(e.at)}
                    </span>
                  </li>
                )
              })}
            </ol>
          </PanelCard>
        </div>

        <div className="flex flex-col gap-5">
          <PanelCard
            icon={CreditCardIcon}
            title="Assinatura"
            description={lastPayment?.note ?? (payment.state === "trial" ? "Teste grátis" : "Pagamento manual")}
            action={<PaymentDialog profileId={row.profile_id} name={name} defaultAmount={EARLY_PRICE.toFixed(2).replace(".", ",")} />}
          >
            {payment.daysLeft !== null && payment.daysLeft >= 0 ? (
              <>
                <p className="flex items-baseline gap-2">
                  <span className="text-[26px] font-semibold tracking-tight tabular-nums">
                    {payment.daysLeft} {payment.daysLeft === 1 ? "dia" : "dias"}
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    {payment.state === "trial" ? "de teste restantes" : `até vencer em ${formatDate(row.paid_until).slice(0, 5)}`}
                  </span>
                </p>
                <div className="mt-2.5 mb-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
                    style={{ width: `${Math.min(100, (payment.daysLeft / (payment.state === "trial" ? 15 : periodDays)) * 100)}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-[15px] font-medium">
                {payment.state === "em-dia"
                  ? "Paga, sem vencimento lançado"
                  : payment.state === "vencido"
                    ? `Venceu há ${-(payment.daysLeft ?? 0)} dias`
                    : payment.state === "trial-acabou"
                      ? `Teste acabou há ${-(payment.daysLeft ?? 0)} dias`
                      : "Sem assinatura"}
              </p>
            )}
            <p className="text-[13px] text-muted-foreground">
              {lastPayment
                ? `${formatCentsToBRL(lastPayment.amount_cents)}, pago em ${formatDate(lastPayment.paid_at)}`
                : "Nenhum pagamento lançado ainda."}
            </p>
          </PanelCard>

          <PanelCard icon={KeyRoundIcon} title="Acesso" description="Status que libera o app">
            {/* key: o form reinicia com os valores da conta (e após o refresh). */}
            <AccountAccessForm key={`${row.status}:${row.trial_ends_at}`} row={row} />
          </PanelCard>

          <PanelCard icon={InfoIcon} title="Dados">
            <dl className="flex flex-col divide-y text-[13px]">
              {facts.map((f) => (
                <div key={f.label} className="flex justify-between gap-4 py-2.5 first:pt-0">
                  <dt className="text-muted-foreground">{f.label}</dt>
                  <dd className="text-right font-medium tabular-nums">{f.value}</dd>
                </div>
              ))}
            </dl>
          </PanelCard>
        </div>
      </div>
    </div>
  )
}
