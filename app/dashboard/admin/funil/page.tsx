import { Suspense } from "react"
import Link from "next/link"
import {
  AlarmClockIcon,
  CircleDashedIcon,
  BadgeCheckIcon,
  ChevronRightIcon,
  FlameIcon,
  GlobeIcon,
  HandshakeIcon,
  MailCheckIcon,
  MailIcon,
  MailOpenIcon,
  MailXIcon,
  MessageCircleIcon,
  MinusIcon,
  MousePointerClickIcon,
  SendIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react"

import { requireAdmin } from "@/lib/admin-guard"
import { whatsappDigits } from "@/lib/admin-tasks"
import { formatRelativeTime } from "@/lib/formatters"
import {
  FUNNEL_STAGES,
  STAGE_LABEL,
  funnelRank,
  funnelStage,
  isClinicEmail,
  isFollowUpDue,
  temperature,
  type FunnelStage,
} from "@/lib/funnel"
import { cn } from "@/lib/utils"
import { listProspects, type EmailStatus, type ProspectRow } from "@/modules/admin/list-prospects"
import { FilterChip, Initials, LinkTab, PageHero } from "@/components/dashboard/admin/admin-ui"
import { Badge } from "@/components/ui/badge"
import { STAGE_DOT, StagePill, TemperaturePill } from "@/components/dashboard/admin/funnel-badges"
import { FunnelToolbar } from "@/components/dashboard/admin/funnel-toolbar"
import { ImportProspectsDialog } from "@/components/dashboard/admin/import-prospects-dialog"

export const metadata = { title: "Admin · Funil" }

const PAGE_SIZE = 60

const CHIPS: Record<string, { label: string; icon: LucideIcon; match: (p: ProspectRow, now: Date) => boolean }> = {
  indicacoes: { label: "Indicações", icon: HandshakeIcon, match: (p) => !!p.referred_by },
  novos: { label: "Não contatados", icon: CircleDashedIcon, match: (p) => funnelStage(p) === "novo" },
  recentes: {
    label: "Entraram nos últimos 7 dias",
    icon: SparklesIcon,
    match: (p, now) => now.getTime() - new Date(p.created_at).getTime() <= 7 * 86_400_000,
  },
  quentes: { label: "Quentes", icon: FlameIcon, match: (p, now) => temperature(p, now)?.temp === "quente" },
  abriu: {
    label: "Abriu e não respondeu",
    icon: MailOpenIcon,
    match: (p) => !!p.opened_at && !p.replied_at && funnelStage(p) === "contatado",
  },
  vencido: { label: "Follow-up vencido", icon: AlarmClockIcon, match: (p, now) => isFollowUpDue(p, now) },
  landing: { label: "Vieram pela landing", icon: GlobeIcon, match: (p) => !!p.lead_at },
}

const INVITE: Record<EmailStatus, { label: string; icon: LucideIcon; className: string }> = {
  enviado: { label: "Enviado", icon: SendIcon, className: "text-muted-foreground" },
  entregue: { label: "Entregue", icon: MailCheckIcon, className: "text-muted-foreground" },
  aberto: { label: "Abriu", icon: MailOpenIcon, className: "text-primary-ink" },
  clicou: { label: "Clicou", icon: MousePointerClickIcon, className: "text-success-text" },
  bounce: { label: "Voltou", icon: MailXIcon, className: "text-danger-text" },
  reclamou: { label: "Spam", icon: MailXIcon, className: "text-danger-text" },
}

const CHANNEL: Record<string, string> = { email: "E-mail", whatsapp: "WhatsApp", telefone: "Ligação" }

export default async function AdminFunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ etapa?: string; ver?: string; cidade?: string; canal?: string; q?: string; todos?: string }>
}) {
  const admin = await requireAdmin()
  const { etapa, ver, cidade, canal, q, todos } = await searchParams
  const now = new Date()
  const stage = FUNNEL_STAGES.includes(etapa as FunnelStage) ? (etapa as FunnelStage) : null
  const chip = ver && ver in CHIPS ? ver : null
  const query = (q ?? "").trim().toLowerCase()

  const all = await listProspects(admin)
  const stageCount = (s: FunnelStage) => all.filter((p) => funnelStage(p) === s).length
  const chipCount = (key: string) => all.filter((p) => CHIPS[key].match(p, now)).length
  const emails = all.map((p) => p.email?.trim().toLowerCase()).filter((e): e is string => !!e)
  const shared = new Set(emails.filter((e, i) => emails.indexOf(e) !== i))
  const cities = [...new Set(all.map((p) => p.city).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, "pt-BR"))

  const visible = all
    .filter(
      (p) =>
        (!stage || funnelStage(p) === stage) &&
        (!chip || CHIPS[chip].match(p, now)) &&
        (!cidade || p.city === cidade) &&
        (canal !== "whatsapp" || !!whatsappDigits(p.phone)) &&
        (canal !== "email" || !!p.email) &&
        (canal !== "email-pessoal" || (!!p.email && !isClinicEmail(p.email, shared))) &&
        (canal !== "email-clinica" || isClinicEmail(p.email, shared)) &&
        (!query || `${p.full_name} ${p.clinic ?? ""} ${p.referral_group ?? ""} ${p.email ?? ""}`.toLowerCase().includes(query)),
    )
    .sort((a, b) => funnelRank(a, now) - funnelRank(b, now) || a.full_name.localeCompare(b.full_name, "pt-BR"))
  const shown = todos ? visible : visible.slice(0, PAGE_SIZE)

  const href = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams()
    const current = { etapa: stage, ver: chip, cidade: cidade ?? null, canal: canal ?? null, q: q ?? null, ...patch }
    for (const [k, v] of Object.entries(current)) if (v) params.set(k, v)
    const s = params.toString()
    return s ? `/dashboard/admin/funil?${s}` : "/dashboard/admin/funil"
  }

  const referrals = all.filter((p) => p.referred_by)
  const referrers = [...new Set(referrals.map((p) => p.referred_by!))]
  const referralGroups = [...new Set(referrals.map((p) => p.referral_group).filter((g): g is string => !!g))].map((g) => ({
    name: g,
    total: referrals.filter((p) => p.referral_group === g).length,
    fresh: referrals.filter((p) => p.referral_group === g && funnelStage(p) === "novo").length,
  }))
  const referralFresh = referrals.filter((p) => funnelStage(p) === "novo").length


  return (
    <div className="flex flex-col gap-6">
      <PageHero title="Funil" subtitle="Quem pode virar cliente, da captação à conta paga" action={<ImportProspectsDialog />} />

      {referrals.length > 0 ? (
        <section className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card px-5 py-4">
          <HandshakeIcon className="size-5 shrink-0 text-primary-ink" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Indicações diretas</h2>
            <p className="text-caption text-muted-foreground">
              {referrals.length} {referrals.length === 1 ? "pediatra indicado" : "pediatras indicados"} por {referrers.join(", ")}
              {referralFresh > 0 ? `, ${referralFresh} ainda sem contato` : ", todos já contatados"}. Toda mensagem diz quem indicou.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {referralGroups.map((g) => (
              <FilterChip key={g.name} href={href({ ver: "indicacoes", q: chip === "indicacoes" && q === g.name ? null : g.name, todos: null })} active={chip === "indicacoes" && q === g.name}>
                {g.name}
                <span className="num opacity-60">{g.fresh > 0 ? `${g.fresh}/${g.total}` : g.total}</span>
              </FilterChip>
            ))}
            <FilterChip href={href({ ver: chip === "indicacoes" ? null : "indicacoes", q: null, todos: null })} active={chip === "indicacoes" && !q}>
              {chip === "indicacoes" ? "Ver todo o funil" : "Ver indicações"}
            </FilterChip>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-end gap-x-5 gap-y-3 border-b border-border px-5 pt-4">
          <LinkTab href={href({ etapa: null, todos: null })} active={!stage} count={all.length}>
            Todos
          </LinkTab>
          {FUNNEL_STAGES.map((st) => (
            <LinkTab key={st} href={href({ etapa: stage === st ? null : st, todos: null })} active={stage === st} count={stageCount(st)}>
              <span className={cn("size-2 rounded-full", STAGE_DOT[st])} aria-hidden />
              {STAGE_LABEL[st]}
            </LinkTab>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
          {Object.entries(CHIPS)
            .filter(([key]) => key !== "indicacoes")
            .map(([key, c]) => {
              const Icon = c.icon
              return (
                <FilterChip key={key} href={href({ ver: chip === key ? null : key, todos: null })} active={chip === key}>
                  <Icon className={cn("size-3.5", key === "quentes" && chip !== key && "text-danger-text")} aria-hidden />
                  {c.label}
                  <span className="num opacity-60">{chipCount(key).toLocaleString("pt-BR")}</span>
                </FilterChip>
              )
            })}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <Suspense>
            <FunnelToolbar cities={cities} />
          </Suspense>
          <span className="ml-auto text-caption text-subtle-foreground">Quentes primeiro, depois follow-up vencido</span>
        </div>

        {shown.length === 0 ? (
          <p className="px-5 py-12 text-center text-muted-foreground">
            {query ? `Ninguém encontrado para "${q}".` : "Ninguém neste filtro."}
          </p>
        ) : (
          <table className="w-full [&_td]:whitespace-nowrap">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-label text-muted-foreground">
                <th className="py-2.5 pr-3 pl-5 font-medium">Pessoa</th>
                <th className="px-3 font-medium">Etapa</th>
                <th className="px-3 font-medium">Temperatura</th>
                <th className="px-3 font-medium">Convite</th>
                <th className="px-3 font-medium">Último contato</th>
                <th className="px-3 font-medium">Próximo contato</th>
                <th className="px-3 font-medium">Canais</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => {
                const s = funnelStage(p)
                const t = temperature(p, now)
                const invite = p.email_status ? INVITE[p.email_status] : null
                const InviteIcon = invite?.icon ?? MinusIcon
                const isDue = isFollowUpDue(p, now)
                const sub = [p.referral_group ?? p.clinic, p.city].filter(Boolean).join(" · ")
                return (
                  <tr key={p.id} className="relative border-b border-border last:border-0 hover:bg-accent">
                    <td className="py-3 pr-3 pl-5 whitespace-normal!">
                      <div className="flex items-center gap-3">
                        <Initials name={p.full_name} dim={!p.profile_id} />
                        <div className="min-w-0 max-w-80">
                          <Link
                            href={`/dashboard/admin/funil/${p.id}`}
                            className="font-semibold after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:ring-2 after:focus-visible:ring-ring"
                          >
                            {p.full_name}
                          </Link>
                          <p className="flex items-center gap-1.5 text-caption text-subtle-foreground">
                            <span className="truncate">{sub || p.email || "sem dados"}</span>
                            {p.referred_by ? (
                              <Badge variant="warning" className="h-5">
                                <HandshakeIcon aria-hidden />
                                Indicação
                              </Badge>
                            ) : null}
                            {p.lead_at ? <Badge variant="secondary" className="h-5">Landing</Badge> : null}
                            {p.profile_id ? (
                              <Badge className="h-5">
                                <BadgeCheckIcon aria-hidden />
                                Já tem conta
                              </Badge>
                            ) : null}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3">
                      <StagePill stage={s} />
                      {s === "perdido" && p.lost_reason ? <p className="mt-1 max-w-36 truncate text-caption text-subtle-foreground">{p.lost_reason}</p> : null}
                    </td>
                    <td className="px-3">
                      {t ? <TemperaturePill temp={t.temp} /> : <span className="text-subtle-foreground">—</span>}
                      {t?.reason ? <p className="mt-1 text-caption text-subtle-foreground">{t.reason}</p> : null}
                    </td>
                    <td className="px-3">
                      <span className={cn("flex items-center gap-1.5 text-label", invite?.className ?? "text-muted-foreground")}>
                        <InviteIcon className="size-3.5" aria-hidden />
                        {invite?.label ?? "Não enviado"}
                      </span>
                    </td>
                    <td className="px-3 text-caption text-muted-foreground">
                      {p.last_contact_at ? `${CHANNEL[p.last_channel ?? "email"]} ${formatRelativeTime(p.last_contact_at)}` : "—"}
                    </td>
                    <td className={cn("px-3 text-caption", isDue ? "font-semibold text-danger-text" : "text-muted-foreground")}>
                      {p.next_contact_at && s !== "perdido" && s !== "cliente"
                        ? isDue
                          ? `venceu ${formatRelativeTime(p.next_contact_at)}`
                          : formatRelativeTime(p.next_contact_at)
                        : "—"}
                    </td>
                    <td className="px-3">
                      <span className="flex gap-1.5">
                        <MailIcon className={cn("size-4", p.email ? "text-success-text" : "text-border-strong")} aria-label={p.email ? "Tem e-mail" : "Sem e-mail"} />
                        <MessageCircleIcon
                          className={cn("size-4", whatsappDigits(p.phone) ? "text-success-text" : "text-border-strong")}
                          aria-label={whatsappDigits(p.phone) ? "Tem celular" : "Sem celular"}
                        />
                      </span>
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
        {!todos && visible.length > PAGE_SIZE ? (
          <div className="flex justify-center border-t border-border py-3">
            <Link href={href({ todos: "1" })} className="font-medium text-muted-foreground hover:text-foreground">
              Mostrar mais {visible.length - PAGE_SIZE}
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  )
}
