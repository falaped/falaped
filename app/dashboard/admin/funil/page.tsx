import { Suspense } from "react"
import Link from "next/link"
import {
  AlarmClockIcon,
  CircleDashedIcon,
  BadgeCheckIcon,
  ChevronRightIcon,
  FlameIcon,
  GlobeIcon,
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
import { Initials, PageHero } from "@/components/dashboard/admin/admin-ui"
import { STAGE_DOT, StagePill, TemperaturePill } from "@/components/dashboard/admin/funnel-badges"
import { FunnelToolbar } from "@/components/dashboard/admin/funnel-toolbar"
import { ImportProspectsDialog } from "@/components/dashboard/admin/import-prospects-dialog"

export const metadata = { title: "Admin · Funil" }

const PAGE_SIZE = 60

const CHIPS: Record<string, { label: string; icon: LucideIcon; match: (p: ProspectRow, now: Date) => boolean }> = {
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
  clicou: { label: "Clicou", icon: MousePointerClickIcon, className: "text-emerald-600" },
  bounce: { label: "Voltou", icon: MailXIcon, className: "text-orange-600" },
  reclamou: { label: "Spam", icon: MailXIcon, className: "text-orange-600" },
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
        (!query || `${p.full_name} ${p.clinic ?? ""} ${p.email ?? ""}`.toLowerCase().includes(query)),
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

  const hot = chipCount("quentes")
  const due = chipCount("vencido")
  const fresh = stageCount("novo")

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <PageHero context={`${all.length} pessoas no funil`} title="Funil">
          {hot > 0 ? `${hot} ${hot === 1 ? "está quente" : "estão quentes"} para chamar hoje` : "Ninguém quente agora"}
          {due > 0 ? `, ${due} ${due === 1 ? "tem" : "têm"} follow-up vencido` : ""} e {fresh}{" "}
          {fresh === 1 ? "ainda não foi contatada" : "ainda não foram contatadas"}.
        </PageHero>
        <div className="absolute right-7 bottom-6">
          <ImportProspectsDialog />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 xl:grid-cols-6">
        {FUNNEL_STAGES.map((s) => {
          const n = stageCount(s)
          const on = stage === s
          return (
            <Link
              key={s}
              href={href({ etapa: on ? null : s, todos: null })}
              aria-current={on ? "page" : undefined}
              className={cn(
                "rounded-2xl bg-card px-4 py-3.5 shadow-xs ring-1 ring-foreground/10 transition-shadow hover:ring-primary/60 hover:shadow-md",
                on &&
                  "bg-[radial-gradient(130%_150%_at_0%_0%,color-mix(in_oklab,var(--primary)_26%,transparent),color-mix(in_oklab,var(--primary)_8%,transparent)_45%,var(--card)_75%)] ring-2 ring-primary",
              )}
            >
              <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <span className={cn("size-2 rounded-full", STAGE_DOT[s])} aria-hidden />
                {STAGE_LABEL[s]}
              </span>
              <span className="mt-1.5 block text-[28px] leading-none font-semibold tracking-tight tabular-nums">{n}</span>
              <span className="mt-2.5 block h-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full min-w-px rounded-full bg-primary"
                  style={{ width: `${all.length ? (n / all.length) * 100 : 0}%` }}
                />
              </span>
            </Link>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={href({ ver: null })}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] ring-1 ring-border transition-colors",
            !chip ? "bg-foreground text-background ring-foreground" : "bg-card hover:ring-primary/60",
          )}
        >
          Todos <span className="opacity-60 tabular-nums">{all.length}</span>
        </Link>
        {Object.entries(CHIPS).map(([key, c]) => {
          const on = chip === key
          const Icon = c.icon
          return (
            <Link
              key={key}
              href={href({ ver: on ? null : key })}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] ring-1 ring-border transition-colors",
                on ? "bg-foreground text-background ring-foreground" : "bg-card hover:ring-primary/60",
              )}
            >
              <Icon className={cn("size-3.5", key === "quentes" && !on && "text-orange-600")} aria-hidden />
              {c.label} <span className="opacity-60 tabular-nums">{chipCount(key)}</span>
            </Link>
          )
        })}
      </div>

      <section className="overflow-hidden rounded-2xl bg-card shadow-xs ring-1 ring-foreground/10">
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
          <Suspense>
            <FunnelToolbar cities={cities} />
          </Suspense>
          <span className="ml-auto text-[13px] text-muted-foreground">Quentes primeiro, depois follow-up vencido</span>
        </div>

        {shown.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">
            {query ? `Ninguém encontrado para "${q}".` : "Ninguém neste filtro."}
          </p>
        ) : (
          <table className="w-full text-sm [&_td]:whitespace-nowrap">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
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
                const sub = [p.clinic, p.city].filter(Boolean).join(" · ")
                return (
                  <tr key={p.id} className="relative border-b transition-colors last:border-0 hover:bg-primary/5">
                    <td className="py-3 pr-3 pl-5 whitespace-normal!">
                      <div className="flex items-center gap-3">
                        <Initials name={p.full_name} dim={!p.profile_id} />
                        <div className="min-w-0 max-w-80">
                          <Link
                            href={`/dashboard/admin/funil/${p.id}`}
                            className="font-medium after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:ring-2 after:focus-visible:ring-primary"
                          >
                            {p.full_name}
                          </Link>
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="truncate">{sub || p.email || "sem dados"}</span>
                            {p.lead_at ? <span className="shrink-0 rounded bg-muted px-1.5 text-[11px] font-medium">Landing</span> : null}
                            {p.profile_id ? (
                              <span className="flex shrink-0 items-center gap-0.5 rounded bg-primary/12 px-1.5 text-[11px] font-medium text-primary-ink">
                                <BadgeCheckIcon className="size-3" aria-hidden />
                                Já tem conta
                              </span>
                            ) : null}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3">
                      <StagePill stage={s} />
                      {s === "perdido" && p.lost_reason ? <p className="mt-1 max-w-36 truncate text-xs text-muted-foreground">{p.lost_reason}</p> : null}
                    </td>
                    <td className="px-3">
                      {t ? <TemperaturePill temp={t.temp} /> : <span className="text-muted-foreground/50">—</span>}
                      {t?.reason ? <p className="mt-1 text-xs text-muted-foreground">{t.reason}</p> : null}
                    </td>
                    <td className="px-3">
                      <span className={cn("flex items-center gap-1.5 text-[13px]", invite?.className ?? "text-muted-foreground")}>
                        <InviteIcon className="size-3.5" aria-hidden />
                        {invite?.label ?? "Não enviado"}
                      </span>
                    </td>
                    <td className="px-3 text-xs text-muted-foreground">
                      {p.last_contact_at ? `${CHANNEL[p.last_channel ?? "email"]} ${formatRelativeTime(p.last_contact_at)}` : "—"}
                    </td>
                    <td className={cn("px-3 text-xs", isDue ? "font-semibold text-orange-700 dark:text-orange-400" : "text-muted-foreground")}>
                      {p.next_contact_at && s !== "perdido" && s !== "cliente"
                        ? isDue
                          ? `venceu ${formatRelativeTime(p.next_contact_at)}`
                          : formatRelativeTime(p.next_contact_at)
                        : "—"}
                    </td>
                    <td className="px-3">
                      <span className="flex gap-1.5">
                        <MailIcon className={cn("size-4", p.email ? "text-emerald-600" : "text-muted-foreground/30")} aria-label={p.email ? "Tem e-mail" : "Sem e-mail"} />
                        <MessageCircleIcon
                          className={cn("size-4", whatsappDigits(p.phone) ? "text-emerald-600" : "text-muted-foreground/30")}
                          aria-label={whatsappDigits(p.phone) ? "Tem celular" : "Sem celular"}
                        />
                      </span>
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
        {!todos && visible.length > PAGE_SIZE ? (
          <div className="flex justify-center border-t py-3">
            <Link href={href({ todos: "1" })} className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Mostrar mais {visible.length - PAGE_SIZE}
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  )
}
