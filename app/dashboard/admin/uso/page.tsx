import {
  BabyIcon,
  BookOpenIcon,
  CalendarIcon,
  ClipboardListIcon,
  FileHeartIcon,
  FileTextIcon,
  FlaskConicalIcon,
  ForwardIcon,
  ListChecksIcon,
  type LucideIcon,
  MessagesSquareIcon,
  PaperclipIcon,
  PillIcon,
  RulerIcon,
  ScanTextIcon,
  StethoscopeIcon,
  SyringeIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react"

import { requireAdmin } from "@/lib/admin-guard"
import { cn } from "@/lib/utils"
import { getProductUsage, type ProductFeatureKey } from "@/modules/admin/get-product-usage"
import { PageHero, PanelCard, Pill, StatCard } from "@/components/dashboard/admin/admin-ui"

export const metadata = { title: "Admin · Uso do produto" }

const FEATURE_ICON: Record<ProductFeatureKey, LucideIcon> = {
  cases: StethoscopeIcon,
  patients: BabyIcon,
  prescriptions: PillIcon,
  certificates: FileHeartIcon,
  reports: FileTextIcon,
  case_reports: ClipboardListIcon,
  exam_requests: FlaskConicalIcon,
  referrals: ForwardIcon,
  guidance: BookOpenIcon,
  exam_readings: ScanTextIcon,
  vaccines: SyringeIcon,
  measurements: RulerIcon,
  scales: ListChecksIcon,
  attachments: PaperclipIcon,
  appointments: CalendarIcon,
  discussions: MessagesSquareIcon,
  financial: WalletIcon,
}

const usd = (v: number) => (v > 0 && v < 0.01 ? "< US$ 0,01" : `US$ ${v.toFixed(2).replace(".", ",")}`)
const int = (v: number) => Math.round(v).toLocaleString("pt-BR")

/** Variação percentual; null quando não há base de comparação. */
const delta = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null)

/** Pílula de tendência. `lowerIsBetter` inverte a cor (custo caindo é bom). */
function Trend({ cur, prev, lowerIsBetter, suffix = "" }: { cur: number; prev: number; lowerIsBetter?: boolean; suffix?: string }) {
  const d = delta(cur, prev)
  if (d === null) return cur > 0 ? <Pill tone="gray">novo</Pill> : null
  const good = lowerIsBetter ? d <= 0 : d >= 0
  const Icon = d >= 0 ? TrendingUpIcon : TrendingDownIcon
  return (
    <Pill tone={d === 0 ? "gray" : good ? "green" : "red"}>
      {d !== 0 ? <Icon className="size-3.5" aria-hidden /> : null}
      {d > 0 ? "+" : ""}
      {d}%{suffix}
    </Pill>
  )
}

function Sparkline({ weeks }: { weeks: number[] }) {
  const max = Math.max(...weeks)
  if (max === 0) return null
  return (
    <div className="flex h-6 items-end gap-[3px]" aria-label={`Por semana: ${weeks.join(", ")}`}>
      {weeks.map((n, i) => (
        <span
          key={i}
          className={cn("w-1.5 rounded-sm", n === 0 ? "bg-muted" : i === weeks.length - 1 ? "bg-primary" : "bg-primary-soft-border")}
          style={{ height: `${Math.max(12, (n / max) * 100)}%` }}
        />
      ))}
    </div>
  )
}

export default async function AdminUsagePage() {
  const admin = await requireAdmin()
  const now = new Date()
  const u = await getProductUsage(admin, now)

  const month = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" })
  const perActive = u.activeThisMonth > 0 ? u.ai.cost / u.activeThisMonth : 0
  const maxFeatureCost = Math.max(...u.ai.byFeature.map((f) => f.cost), 0)
  const maxFeatureCalls = Math.max(...u.ai.byFeature.map((f) => f.calls), 0)
  const created = u.adoption[0]?.count ?? 0

  return (
    <div className="flex flex-col gap-6">
      <PageHero title="Uso do produto" subtitle={`${month[0].toUpperCase()}${month.slice(1)}, até hoje`} />

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr_1fr]">
        <StatCard title="Consumo de IA" description="Groq, estimado pelo preço de cada modelo">
          <div className="flex items-baseline gap-2.5">
            <span className="num font-display text-page font-semibold">{usd(u.ai.cost)}</span>
            {u.ai.prevCost > 0 ? <Trend cur={u.ai.cost} prev={u.ai.prevCost} lowerIsBetter suffix=" vs mês passado" /> : null}
          </div>
          {u.ai.byFeature.length === 0 ? (
            <p className="mt-3 text-label text-muted-foreground">
              O registro começou em 01/10. Assim que alguém usar transcrição, chat ou relatórios, o custo aparece aqui por
              funcionalidade.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2.5">
              {u.ai.byFeature.slice(0, 6).map((f) => (
                <li key={f.feature} className="grid grid-cols-[9rem_1fr_auto] items-center gap-3 text-label">
                  <span className="truncate text-muted-foreground">{f.label}</span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${maxFeatureCost > 0 ? (f.cost / maxFeatureCost) * 100 : (f.calls / maxFeatureCalls) * 100}%` }}
                    />
                  </div>
                  <span className="num text-right font-medium">{usd(f.cost)}</span>
                </li>
              ))}
            </ul>
          )}
          {u.ai.unpricedModels.length > 0 ? (
            <p className="mt-3 text-caption text-warning-text">
              Sem preço na tabela: {u.ai.unpricedModels.join(", ")}. O custo desses modelos ficou de fora.
            </p>
          ) : null}
        </StatCard>

        <StatCard title="Custo por conta ativa" description="IA do mês por conta que usou">
          <span className="num font-display text-page font-semibold">{usd(perActive)}</span>
          <dl className="mt-3 divide-y divide-border text-label">
            {[
              ["Contas ativas no mês", `${int(u.activeThisMonth)} de ${int(u.accounts)}`],
              ["Chamadas de IA", int(u.ai.calls)],
              ["Minutos transcritos", `${int(u.ai.audioMinutes)} min`],
              ["Tokens de texto", u.ai.tokens >= 1_000_000 ? `${(u.ai.tokens / 1_000_000).toFixed(1).replace(".", ",")} mi` : int(u.ai.tokens)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="num font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </StatCard>

        <StatCard title="Adoção" description="Até onde cada conta chegou">
          <ol className="flex flex-col gap-2">
            {u.adoption.map((step, i) => {
              const stopped = i > 0 ? u.adoption[i - 1].count - step.count : 0
              return (
                <li key={step.label}>
                  <div className="relative h-7 overflow-hidden rounded-lg bg-muted">
                    <div
                      className="absolute inset-y-0 left-0 rounded-lg bg-primary-soft-border"
                      style={{ width: `${created > 0 ? (step.count / created) * 100 : 0}%` }}
                    />
                    <span className="absolute inset-y-0 left-2.5 flex items-center text-label font-medium">
                      {step.label} · {int(step.count)}
                      {stopped > 0 ? <span className="ml-1.5 font-normal text-danger-text">{stopped} pararam antes</span> : null}
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>
        </StatCard>
      </div>

      <PanelCard title="Por funcionalidade" description="Últimos 30 dias, comparado com os 30 anteriores" bodyClassName="p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted text-left text-label text-muted-foreground">
              <th className="py-2.5 pr-3 pl-5 font-medium">Funcionalidade</th>
              <th className="px-3 font-medium">Contas que usaram</th>
              <th className="px-3 text-right font-medium">Volume</th>
              <th className="px-3 font-medium">Tendência</th>
              <th className="pr-5 pl-3 font-medium">6 semanas</th>
            </tr>
          </thead>
          <tbody>
            {u.features.map((f) => {
              const Icon = FEATURE_ICON[f.key]
              const unused = f.volume === 0 && f.prevVolume === 0
              return (
                <tr key={f.key} className="border-b border-border last:border-0">
                  <td className="py-2.5 pr-3 pl-5">
                    <div className={cn("flex items-center gap-3 font-medium", unused && "text-muted-foreground")}>
                      <Icon className="size-4 text-subtle-foreground" aria-hidden />
                      {f.label}
                    </div>
                  </td>
                  <td className="px-3">
                    <div className="flex min-w-44 items-center gap-2.5">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${u.accounts > 0 ? (f.accounts / u.accounts) * 100 : 0}%` }} />
                      </div>
                      <span className="num w-14 text-right text-caption text-muted-foreground">
                        {f.accounts} de {u.accounts}
                      </span>
                    </div>
                  </td>
                  <td className={cn("num px-3 text-right font-semibold", f.volume === 0 && "font-normal text-subtle-foreground")}>
                    {int(f.volume)}
                  </td>
                  <td className="px-3">
                    {unused ? <span className="text-caption text-subtle-foreground">ninguém usou</span> : <Trend cur={f.volume} prev={f.prevVolume} />}
                  </td>
                  <td className="pr-5 pl-3">
                    <Sparkline weeks={f.weeks} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </PanelCard>
    </div>
  )
}
