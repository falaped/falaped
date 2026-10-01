import Link from "next/link"
import { notFound } from "next/navigation"
import {
  AlarmClockIcon,
  ArrowLeftIcon,
  BadgeCheckIcon,
  Building2Icon,
  ContactIcon,
  ExternalLinkIcon,
  FlameIcon,
  GitCommitHorizontalIcon,
  GlobeIcon,
  HistoryIcon,
  MailCheckIcon,
  MailIcon,
  MailOpenIcon,
  MailXIcon,
  MapIcon,
  MapPinIcon,
  MessageCircleIcon,
  MousePointerClickIcon,
  PhoneIcon,
  RadarIcon,
  SendIcon,
  StarIcon,
  StickyNoteIcon,
  StethoscopeIcon,
  type LucideIcon,
} from "lucide-react"

import { requireAdmin } from "@/lib/admin-guard"
import { ADMIN_SENDER } from "@/lib/admin-sender"
import { formatDate, formatDateTime, formatRelativeTime } from "@/lib/formatters"
import { STAGE_LABEL, funnelStage, isFollowUpDue, temperature, type FunnelStage } from "@/lib/funnel"
import { recipientValues, type MessageMoment } from "@/lib/message-template"
import { cn } from "@/lib/utils"
import { getProspect, type ProspectEvent, type ProspectEventKind } from "@/modules/admin/get-prospect"
import { listMessageTemplates } from "@/modules/admin/list-message-templates"
import type { ProspectRow } from "@/modules/admin/list-prospects"
import { GradientCard, Initials, PanelCard, Pill } from "@/components/dashboard/admin/admin-ui"
import { StagePill, TemperaturePill } from "@/components/dashboard/admin/funnel-badges"
import { CallButton, ContactForm, NextContactButtons, NoteComposer, StageStepper } from "@/components/dashboard/admin/prospect-panels"
import { EmailComposerButton, WhatsappMenu, WhatsappQuickSend } from "@/components/dashboard/admin/whatsapp-menu"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Admin · Lead" }

const EVENT: Record<ProspectEventKind, { icon: LucideIcon; label: string; tone?: "blue" | "green" | "red" }> = {
  captado: { icon: RadarIcon, label: "Captado" },
  lead: { icon: GlobeIcon, label: "Preencheu o formulário da landing", tone: "green" },
  email: { icon: SendIcon, label: "E-mail enviado", tone: "blue" },
  whatsapp: { icon: MessageCircleIcon, label: "WhatsApp aberto", tone: "green" },
  telefone: { icon: PhoneIcon, label: "Ligação", tone: "blue" },
  nota: { icon: StickyNoteIcon, label: "Nota" },
  etapa: { icon: GitCommitHorizontalIcon, label: "Etapa" },
  entregue: { icon: MailCheckIcon, label: "E-mail entregue" },
  aberto: { icon: MailOpenIcon, label: "Abriu o e-mail", tone: "blue" },
  clicou: { icon: MousePointerClickIcon, label: "Clicou no link do e-mail", tone: "green" },
  bounce: { icon: MailXIcon, label: "E-mail voltou (endereço inválido)", tone: "red" },
  reclamou: { icon: MailXIcon, label: "Marcou o e-mail como spam", tone: "red" },
}

const LEAD_SOURCE: Record<string, string> = {
  final_cta: "botão final",
  demo_booking: "agendar demonstração",
  beta_signup: "lista do beta",
}

const TOOL_NAME: Record<string, string> = {
  "curva-de-crescimento-oms": "curva de crescimento",
  "percentil-imc-infantil": "percentil de IMC",
  "calculadora-dose-pediatrica": "calculadora de dose",
  "calendario-vacinal-2026": "calendário vacinal",
}

/** "ferramenta:<slug>" vem do "Receba em PDF" das ferramentas da landing. */
const leadSourceLabel = (s: string) =>
  s.startsWith("ferramenta:") ? `PDF da ${TOOL_NAME[s.slice(11)] ?? s.slice(11)}` : (LEAD_SOURCE[s] ?? s)

/** Uma linha da linha do tempo: o que aconteceu e o detalhe (modelo, motivo, texto da nota). */
function eventText(e: ProspectEvent): { title: string; sub: string | null } {
  const base = EVENT[e.kind]
  if (e.kind === "nota") return { title: e.detail ?? "Nota", sub: null }
  if (e.kind === "etapa") return { title: `Etapa: ${e.detail ?? ""}`, sub: null }
  if (e.kind === "lead") return { title: base.label, sub: e.detail ? leadSourceLabel(e.detail) : null }
  if (e.kind === "captado") return { title: e.detail ? `Captado em ${e.detail}` : base.label, sub: null }
  return { title: base.label, sub: e.detail }
}

type Alert = { icon: LucideIcon; title: string; detail: string; moment: MessageMoment; action: string } | null

/** O que pede atenção nesta pessoa agora, em ordem de urgência, e a mensagem certa para isso. */
function alertFor(p: ProspectRow, stage: FunnelStage, now: Date): Alert {
  if (stage === "cliente" || stage === "perdido" || stage === "em-teste") return null
  const t = temperature(p, now)
  if (stage === "novo" && p.lead_at && t?.temp === "quente")
    return {
      icon: GlobeIcon,
      title: `Chegou pela landing ${formatRelativeTime(p.lead_at)} e ainda não recebeu contato`,
      detail: "Lead da landing esfria rápido. Uma mensagem de boas-vindas hoje faz diferença.",
      moment: "boas-vindas",
      action: "Dar boas-vindas",
    }
  if (p.clicked_at && !p.replied_at && t?.temp === "quente")
    return {
      icon: FlameIcon,
      title: `Clicou no link do e-mail ${formatRelativeTime(p.clicked_at)} e ainda não respondeu`,
      detail: "Quem clica e não volta costuma ter uma dúvida. É a hora de chamar no WhatsApp.",
      moment: "follow-up",
      action: "Mandar follow-up",
    }
  if (isFollowUpDue(p, now))
    return {
      icon: AlarmClockIcon,
      title: `Follow-up venceu ${formatRelativeTime(p.next_contact_at!)}`,
      detail: p.opened_at ? "Abriu o e-mail e não respondeu: vale um toque curto." : "Sem sinal desde o último contato: tente outro canal.",
      moment: "follow-up",
      action: "Mandar follow-up",
    }
  return null
}

const TONE_ICON = {
  blue: "bg-primary/12 text-primary-ink",
  green: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  red: "bg-orange-600/12 text-orange-700 dark:text-orange-400",
} as const

export default async function AdminLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  const { id } = await params
  const [p, templates] = await Promise.all([getProspect(admin, decodeURIComponent(id)), listMessageTemplates(admin)])
  if (!p) notFound()

  const now = new Date()
  const stage = funnelStage(p)
  const temp = temperature(p, now)
  const alert = alertFor(p, stage, now)
  const values = recipientValues({ title: p.title, name: p.name, city: p.city }, ADMIN_SENDER)
  const defaultMoment: MessageMoment = alert?.moment ?? (p.invited_at ? "follow-up" : p.lead_at ? "boas-vindas" : "convite")
  const context = [
    `Trate por "${values.tratamento}".`,
    `${p.full_name}${p.city ? `, ${p.city}` : ""}${p.clinic ? `, ${p.clinic}` : ""}.`,
    `Etapa: ${STAGE_LABEL[stage]}${temp?.reason ? `; ${temp.reason}` : ""}.`,
    p.lead_at ? "Deixou contato no site do Falaped." : "Captado em lista de pediatras (Doctoralia/Google Maps), nunca pediu contato.",
    ...p.events.slice(0, 8).map((e) => `${formatDate(e.created_at)}: ${eventText(e).title}${eventText(e).sub ? ` (${eventText(e).sub})` : ""}`),
  ].join("\n")
  const send = {
    recipient: { prospectId: p.id },
    name: p.full_name,
    email: p.email,
    phone: p.phone,
    templates,
    values,
    context,
    defaultMoment,
  }
  const due = isFollowUpDue(p, now)
  const facts = ([
    p.rating ? { k: "Avaliação", v: <span className="flex items-center gap-1"><StarIcon className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />{p.rating}{p.reviews ? <span className="font-normal text-muted-foreground">({p.reviews})</span> : null}</span> } : null,
    p.price ? { k: "Consulta", v: p.price } : null,
    p.address ? { k: "Endereço", v: p.address } : null,
    p.sources.length ? { k: "Fontes", v: p.sources.join(", ") } : null,
    p.rqe ? { k: "RQE", v: p.rqe } : null,
    p.site_emails.length ? { k: "E-mails do site", v: p.site_emails.join(", ") } : null,
    p.lead_at ? { k: "Landing", v: `${formatDate(p.lead_at)}${p.lead_source ? `, ${leadSourceLabel(p.lead_source)}` : ""}` } : null,
  ] as ({ k: string; v: React.ReactNode } | null)[]).filter((f) => f !== null)
  const links = [
    p.profile_url ? { href: p.profile_url, label: p.profile_url.includes("doctoralia") ? "Doctoralia" : "Perfil", icon: ExternalLinkIcon } : null,
    p.map_url ? { href: p.map_url, label: "Maps", icon: MapIcon } : null,
    p.website ? { href: p.website, label: "Site", icon: GlobeIcon } : null,
  ].filter((l): l is { href: string; label: string; icon: LucideIcon } => l !== null)

  return (
    <div className="flex flex-col gap-5">
      <Link href="/dashboard/admin/funil" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" aria-hidden />
        Funil
      </Link>

      <GradientCard className="flex flex-wrap items-center justify-between gap-5 px-7 py-6">
        <div className="flex items-center gap-5">
          <Initials name={p.full_name} dim={!p.profile_id} className="size-[72px] rounded-2xl bg-card text-2xl shadow-xs ring-1 ring-foreground/10" />
          <div>
            <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{p.full_name}</h1>
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {p.clinic ? <span className="flex items-center gap-1.5"><Building2Icon className="size-4" aria-hidden />{p.clinic}</span> : null}
              {p.city ? <span className="flex items-center gap-1.5"><MapPinIcon className="size-4" aria-hidden />{p.city}</span> : null}
              {p.crm ? <span className="flex items-center gap-1.5"><StethoscopeIcon className="size-4" aria-hidden />CRM {p.crm}</span> : null}
              {!p.clinic && !p.city && p.email ? <span className="flex items-center gap-1.5"><MailIcon className="size-4" aria-hidden />{p.email}</span> : null}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <StagePill stage={stage} />
              {temp ? <TemperaturePill temp={temp.temp} /> : null}
              <Pill tone="gray" dot={false}>{p.lead_at ? "Veio pela landing" : p.origin === "manual" ? "Cadastro manual" : "Captação"}</Pill>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <WhatsappMenu {...send} />
          <EmailComposerButton {...send} />
          <CallButton id={p.id} />
        </div>
      </GradientCard>

      {p.profile ? (
        <GradientCard className="flex flex-wrap items-center gap-4 px-5 py-4">
          <span className="flex size-9 items-center justify-center rounded-[10px] bg-primary/15 text-primary-ink">
            <BadgeCheckIcon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">
              {stage === "cliente" ? "Já é assinante" : "Já criou conta"} {formatRelativeTime(p.profile.created_at)}
            </p>
            <p className="text-[13px] text-muted-foreground">
              {p.profile.cases > 0 ? `${p.profile.cases} ${p.profile.cases === 1 ? "atendimento" : "atendimentos"} registrados.` : "Ainda sem atendimentos."} Pagamento e uso ficam em Clientes.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/dashboard/admin/users/${p.profile.id}`}>Abrir em Clientes</Link>
          </Button>
        </GradientCard>
      ) : null}

      {alert ? (
        <GradientCard tone="amber" className="flex flex-wrap items-center gap-4 px-5 py-4">
          <span className="flex size-9 items-center justify-center rounded-[10px] bg-card text-amber-700 shadow-xs ring-1 ring-amber-300/70 dark:text-amber-400">
            <alert.icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">{alert.title}</p>
            <p className="text-[13px] text-amber-800/80 dark:text-amber-300/80">{alert.detail}</p>
          </div>
          <WhatsappQuickSend {...send} defaultMoment={alert.moment} label={alert.action} />
        </GradientCard>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-5">
          <PanelCard
            icon={GitCommitHorizontalIcon}
            title="Etapa"
            description="Em teste e Cliente mudam sozinhas quando a pessoa cria conta ou paga"
          >
            <StageStepper id={p.id} stage={stage} />
            {stage === "perdido" && p.lost_reason ? (
              <p className="mt-3 text-[13px] text-muted-foreground">Motivo: {p.lost_reason}</p>
            ) : null}
          </PanelCard>

          <PanelCard icon={HistoryIcon} title="Linha do tempo" description="Contatos, e-mails e notas, do mais novo para o mais antigo">
            <NoteComposer id={p.id} />
            {p.events.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Nada registrado ainda.</p>
            ) : (
              <ol className="relative flex flex-col">
                {p.events.map((e, i) => {
                  const meta = EVENT[e.kind]
                  const { title, sub } = eventText(e)
                  return (
                    <li key={e.id} className="relative grid grid-cols-[28px_minmax(0,1fr)_auto] gap-3 pb-4">
                      {i < p.events.length - 1 ? <span className="absolute top-7 bottom-0 left-[13.5px] w-px bg-border" aria-hidden /> : null}
                      <span className={cn("flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground", meta.tone && TONE_ICON[meta.tone])}>
                        <meta.icon className="size-3.5" aria-hidden />
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className={cn("text-sm", e.kind === "nota" && "whitespace-pre-line")}>{title}</p>
                        {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
                      </div>
                      <time className="pt-0.5 text-xs whitespace-nowrap text-muted-foreground" dateTime={e.created_at} title={formatDateTime(e.created_at)}>
                        {formatDateTime(e.created_at)}
                      </time>
                    </li>
                  )
                })}
              </ol>
            )}
          </PanelCard>
        </div>

        <div className="flex flex-col gap-5">
          <PanelCard icon={AlarmClockIcon} iconTone="amber" title="Próximo contato" description="Entra na fila do Painel quando vencer">
            {p.next_contact_at ? (
              <p className="flex items-baseline gap-2">
                <span className={cn("text-2xl font-semibold tracking-tight", due && "text-orange-700 dark:text-orange-400")}>
                  {due ? "Venceu" : formatDate(p.next_contact_at).slice(0, 5)}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  {due ? `${formatRelativeTime(p.next_contact_at)}, em ${formatDate(p.next_contact_at).slice(0, 5)}` : formatRelativeTime(p.next_contact_at)}
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Sem data marcada.</p>
            )}
            <NextContactButtons id={p.id} value={p.next_contact_at} />
          </PanelCard>

          <PanelCard icon={ContactIcon} title="Contato">
            <ContactForm
              id={p.id}
              initial={{
                full_name: p.full_name,
                email: p.email ?? "",
                phone: p.phone ?? "",
                crm: p.crm ?? "",
                clinic: p.clinic ?? "",
                city: p.city ?? "",
              }}
            />
          </PanelCard>

          {facts.length > 0 || links.length > 0 ? (
            <PanelCard icon={RadarIcon} title={p.lead_at && !p.sources.length ? "Origem" : "Dados da captação"}>
              <dl className="divide-y text-[13px]">
                {facts.map((f) => (
                  <div key={f.k} className="flex justify-between gap-4 py-2">
                    <dt className="text-muted-foreground">{f.k}</dt>
                    <dd className="text-right font-medium">{f.v}</dd>
                  </div>
                ))}
              </dl>
              {links.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {links.map((l) => (
                    <Button key={l.href} asChild variant="outline" size="sm">
                      <a href={l.href} target="_blank" rel="noopener noreferrer">
                        <l.icon aria-hidden />
                        {l.label}
                      </a>
                    </Button>
                  ))}
                </div>
              ) : null}
            </PanelCard>
          ) : null}
        </div>
      </div>
    </div>
  )
}
