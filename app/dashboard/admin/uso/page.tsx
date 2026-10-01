import {
  BabyIcon,
  BookOpenIcon,
  CalculatorIcon,
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
  RouteIcon,
  RulerIcon,
  ScanTextIcon,
  SparklesIcon,
  StethoscopeIcon,
  SyringeIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react"

import { requireAdmin } from "@/lib/admin-guard"
import { cn } from "@/lib/utils"
import { getProductUsage, type ProductFeatureKey } from "@/modules/admin/get-product-usage"
import { IconChip, PageHero, PanelCard, Pill } from "@/components/dashboard/admin/admin-ui"

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
const plural = (n: number, one: string, many: string) => `${int(n)} ${n === 1 ? one : many}`

/** Variação percentual; null quando não há base de comparação. */
const delta = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null)

/** Pílula de tendência. `lowerIsBetter` inverte a cor (custo caindo é bom). */
function Trend({ cur, prev, lowerIsBetter, suffix = "" }: { cur: number; prev: number; lowerIsBetter?: boolean; suffix?: string }) {
  const d = delta(cur, prev)
  if (d === null) return cur > 0 ? <Pill tone="gray">novo</Pill> : null
  const good = lowerIsBetter ? d <= 0 : d >= 0
  const Icon = d >= 0 ? TrendingUpIcon : TrendingDownIcon
  return (
    <Pill tone={d === 0 ? "gray" : good ? "green" : "red"} dot={false}>
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
          className={cn("w-1.5 rounded-sm", n === 0 ? "bg-muted" : i === weeks.length - 1 ? "bg-primary" : "bg-primary/45")}
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
    <div className="flex flex-col gap-5">
      <PageHero context={`${month[0].toUpperCase()}${month.slice(1)}, até hoje`} title="Uso do produto">
        {plural(u.activeThisMonth, "conta ativa", "contas ativas")} no mês e {plural(u.documents30, "documento emitido", "documentos emitidos")} nos
        últimos 30 dias.{" "}
        {u.ai.calls > 0
          ? `A IA custou ${usd(u.ai.cost)} no mês${u.activeThisMonth > 0 ? `, ${usd(perActive)} por conta ativa` : ""}.`
          : "Nenhuma chamada de IA registrada neste mês ainda."}
      </PageHero>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr_1fr]">
        <PanelCard icon={SparklesIcon} title="Consumo de IA" description="Groq, estimado pelo preço de cada modelo">
          <div className="flex items-baseline gap-2.5">
            <span className="text-[32px] font-semibold tracking-tight tabular-nums">{usd(u.ai.cost)}</span>
            {u.ai.prevCost > 0 ? <Trend cur={u.ai.cost} prev={u.ai.prevCost} lowerIsBetter suffix=" vs mês passado" /> : null}
          </div>
          {u.ai.byFeature.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              O registro começou em 01/10. Assim que alguém usar transcrição, chat ou relatórios, o custo aparece aqui por
              funcionalidade.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2.5">
              {u.ai.byFeature.slice(0, 6).map((f) => (
                <li key={f.feature} className="grid grid-cols-[9rem_1fr_auto] items-center gap-3 text-[13px]">
                  <span className="truncate text-muted-foreground">{f.label}</span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${maxFeatureCost > 0 ? (f.cost / maxFeatureCost) * 100 : (f.calls / maxFeatureCalls) * 100}%` }}
                    />
                  </div>
                  <span className="text-right font-medium tabular-nums">{usd(f.cost)}</span>
                </li>
              ))}
            </ul>
          )}
          {u.ai.unpricedModels.length > 0 ? (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
              Sem preço na tabela: {u.ai.unpricedModels.join(", ")}. O custo desses modelos ficou de fora.
            </p>
          ) : null}
        </PanelCard>

        <PanelCard icon={CalculatorIcon} title="Custo por conta ativa" description="IA do mês por conta que usou">
          <span className="text-[32px] font-semibold tracking-tight tabular-nums">{usd(perActive)}</span>
          <dl className="mt-3 divide-y text-[13px]">
            {[
              ["Contas ativas no mês", `${int(u.activeThisMonth)} de ${int(u.accounts)}`],
              ["Chamadas de IA", int(u.ai.calls)],
              ["Minutos transcritos", `${int(u.ai.audioMinutes)} min`],
              ["Tokens de texto", u.ai.tokens >= 1_000_000 ? `${(u.ai.tokens / 1_000_000).toFixed(1).replace(".", ",")} mi` : int(u.ai.tokens)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </PanelCard>

        <PanelCard icon={RouteIcon} title="Adoção" description="Até onde cada conta chegou">
          <ol className="flex flex-col gap-2">
            {u.adoption.map((step, i) => {
              const stopped = i > 0 ? u.adoption[i - 1].count - step.count : 0
              return (
                <li key={step.label}>
                  <div className="relative h-7 overflow-hidden rounded-lg bg-muted/60">
                    <div
                      className="absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r from-primary to-primary/55"
                      style={{ width: `${created > 0 ? (step.count / created) * 100 : 0}%` }}
                    />
                    <span className="absolute inset-y-0 left-2.5 flex items-center text-[12.5px] font-medium">
                      {step.label} · {int(step.count)}
                      {stopped > 0 ? <span className="ml-1.5 font-normal text-orange-700 dark:text-orange-400">{stopped} pararam antes</span> : null}
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>
        </PanelCard>
      </div>

      <section className="overflow-hidden rounded-2xl bg-card shadow-xs ring-1 ring-foreground/10">
        <header className="border-b px-5 py-4">
          <h2 className="text-[15px] font-semibold leading-tight">Por funcionalidade</h2>
          <p className="text-[13px] text-muted-foreground">Últimos 30 dias, comparado com os 30 anteriores</p>
        </header>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
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
                <tr key={f.key} className="border-b last:border-0">
                  <td className="py-2.5 pr-3 pl-5">
                    <div className={cn("flex items-center gap-3 font-medium", unused && "text-muted-foreground")}>
                      <IconChip icon={Icon} />
                      {f.label}
                    </div>
                  </td>
                  <td className="px-3">
                    <div className="flex min-w-44 items-center gap-2.5">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${u.accounts > 0 ? (f.accounts / u.accounts) * 100 : 0}%` }} />
                      </div>
                      <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
                        {f.accounts} de {u.accounts}
                      </span>
                    </div>
                  </td>
                  <td className={cn("px-3 text-right font-semibold tabular-nums", f.volume === 0 && "font-normal text-muted-foreground/60")}>
                    {int(f.volume)}
                  </td>
                  <td className="px-3">
                    {unused ? <span className="text-xs text-muted-foreground">ninguém usou</span> : <Trend cur={f.volume} prev={f.prevVolume} />}
                  </td>
                  <td className="pr-5 pl-3">
                    <Sparkline weeks={f.weeks} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
