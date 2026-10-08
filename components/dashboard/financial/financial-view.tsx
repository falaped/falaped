"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ChartColumnIcon,
  ChartLineIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  PlusIcon,
  ReceiptIcon,
  RotateCcwIcon,
  SearchIcon,
  StethoscopeIcon,
  WalletIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { toast } from "sonner"

import { restoreFinancialEntryAction } from "@/actions"
import { CourtesyButton } from "@/components/dashboard/cases/courtesy-button"
import { StandaloneEntryDialog } from "@/components/dashboard/earnings/standalone-entry-dialog"
import { VoidEntryButton } from "@/components/dashboard/earnings/void-entry-button"
import { SectionTab } from "@/components/dashboard/section-tab"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList } from "@/components/ui/tabs"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { dailySeries, paymentSplit } from "@/lib/financial-view"
import { formatPediatricAgeShort } from "@/lib/format-pediatric-age"
import { formatCentsToBRL } from "@/lib/formatters"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { getPatientInitials } from "@/lib/get-patient-initials"
import { matchPatientQuery } from "@/lib/match-patient-query"
import { PAYMENT_METHOD_LABEL } from "@/lib/schemas/financial-entry"
import { cn } from "@/lib/utils"
import type { EarningsSummary } from "@/modules/financial-entries/types"
import type { FinancialEntryListRow } from "@/modules/financial-entries/list-financial-entries"
import type { MonthBilling } from "@/modules/financial-entries/get-month-billing"

type Chart = "line" | "bar"
const CHART_KEY = "falaped:financeiro-grafico"
/** Quanto tempo o lançamento recém-salvo fica destacado. */
const FRESH_MS = 8000
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
/** Do mais forte ao mais claro, na ordem da barra de "Como recebeu". */
const SPLIT_COLORS = ["bg-primary", "bg-primary/60", "bg-primary/30", "bg-border-strong"]

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
/** `yyyy-MM-dd` → "Qua, 07/10". O dia da semana sai do calendário em UTC, sem fuso para deslocar. */
function dayLabel(ymd: string): string {
  const weekday = WEEKDAYS[new Date(`${ymd}T12:00:00Z`).getUTCDay()]
  return `${weekday}, ${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`
}

export function FinancialView({
  month,
  todayIso,
  weekAgoIso,
  todayLabel,
  summary,
  prevPeriodCents,
  entries,
  billing,
}: {
  month: {
    /** yyyy-MM do mês mostrado. */
    ym: string
    label: string
    name: string
    prevName: string
    isCurrent: boolean
    prev: string
    next: string | null
    lastDay: number
  }
  todayIso: string
  /** Seis dias atrás: início de "Esta semana" na lista. */
  weekAgoIso: string
  /** dd/MM/yyyy, para o diálogo de lançamento. */
  todayLabel: string
  summary: EarningsSummary
  prevPeriodCents: number | null
  /** Do mês, mais recente primeiro, anulados inclusive. */
  entries: FinancialEntryListRow[]
  billing: MonthBilling
}) {
  const router = useRouter()
  const [chart, setChart] = useState<Chart>("line")
  const [tab, setTab] = useState<"active" | "voided">("active")
  const [query, setQuery] = useState("")
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const [isRestoring, startRestoring] = useTransition()
  const before = useRef<Set<string> | null>(null)

  useEffect(() => {
    try {
      if (localStorage.getItem(CHART_KEY) === "bar") setChart("bar")
    } catch {}
  }, [])
  function pickChart(next: Chart) {
    setChart(next)
    try {
      localStorage.setItem(CHART_KEY, next)
    } catch {}
  }

  useEffect(() => {
    if (!before.current) return
    const seen = before.current
    const added = entries.filter((entry) => !seen.has(entry.id)).map((entry) => entry.id)
    if (!added.length) return
    before.current = null
    setFresh(new Set(added))
    setTab("active")
    setQuery("")
    const timer = setTimeout(() => setFresh(new Set()), FRESH_MS)
    return () => clearTimeout(timer)
  }, [entries])

  const split = useMemo(() => paymentSplit(entries), [entries])
  const series = useMemo(() => dailySeries(summary.by_day, month.lastDay), [summary.by_day, month.lastDay])
  const peak = series.reduce<{ day: number; cents: number } | null>((best, point) => (point.cents > (best?.cents ?? 0) ? point : best), null)

  const active = entries.filter((entry) => !entry.voided_at)
  const voided = entries.filter((entry) => entry.voided_at)
  const listed = (tab === "active" ? active : voided).filter(
    (entry) =>
      !query.trim() ||
      matchPatientQuery({ name: `${entry.description} ${entry.case_label ?? ""}`, responsible: null, contactPhone: null }, query),
  )
  const groups: Array<[string | null, FinancialEntryListRow[]]> =
    month.isCurrent && tab === "active"
      ? (
          [
            ["Hoje", listed.filter((entry) => entry.received_on >= todayIso)],
            ["Esta semana", listed.filter((entry) => entry.received_on < todayIso && entry.received_on >= weekAgoIso)],
            ["Antes", listed.filter((entry) => entry.received_on < weekAgoIso)],
          ] as Array<[string, FinancialEntryListRow[]]>
        ).filter(([, rows]) => rows.length)
      : [[null, listed]]

  const difference = prevPeriodCents === null ? null : summary.period_cents - prevPeriodCents
  const totalNote = month.isCurrent
    ? `${formatCentsToBRL(summary.today_cents)} hoje · ${formatCentsToBRL(summary.week_cents)} nesta semana`
    : difference === null
      ? "mês fechado"
      : difference === 0
        ? `igual a ${month.prevName}`
        : `${formatCentsToBRL(Math.abs(difference))} a ${difference > 0 ? "mais" : "menos"} que ${month.prevName}`

  function restore(entry: FinancialEntryListRow) {
    startRestoring(async () => {
      const result = await restoreFinancialEntryAction(entry.id, entry.case_id)
      if (!result.ok) {
        toast.error(getFriendlyToastMessage(result.error))
        return
      }
      toast.success("Lançamento restaurado.")
      router.refresh()
    })
  }

  return (
    <>
      <section className="flex items-center gap-6 rounded-xl border border-primary-soft-border bg-highlight px-8 py-7 shadow-sm">
        <div>
          <h1 className="font-display text-display font-semibold">Seu financeiro</h1>
          <p className="mt-1 text-read text-muted-foreground">O que você recebeu, mês a mês</p>
        </div>
        <div className="ml-auto">
          <StandaloneEntryDialog
            todayLabel={todayLabel}
            triggerVariant="outline"
            triggerSize="lg"
            triggerIcon={<PlusIcon data-icon="inline-start" />}
            onSaved={() => {
              before.current = new Set(entries.map((entry) => entry.id))
            }}
          />
        </div>
      </section>

      <Collapsible asChild>
        <section className="rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-3">
            <Button asChild variant="ghost" size="icon-sm" aria-label="Mês anterior">
              <Link href={`/dashboard/financial?mes=${month.prev}`} scroll={false}>
                <ChevronLeftIcon />
              </Link>
            </Button>
            <h2 className="w-48 text-center font-display text-section font-semibold">{month.label}</h2>
            {month.next ? (
              <Button asChild variant="ghost" size="icon-sm" aria-label="Próximo mês">
                <Link href={`/dashboard/financial?mes=${month.next}`} scroll={false}>
                  <ChevronRightIcon />
                </Link>
              </Button>
            ) : (
              <Button variant="ghost" size="icon-sm" aria-label="Próximo mês" disabled>
                <ChevronRightIcon />
              </Button>
            )}
            {month.isCurrent ? null : (
              <Button asChild variant="link" size="sm">
                <Link href="/dashboard/financial" scroll={false}>
                  Voltar para este mês
                </Link>
              </Button>
            )}
            {billing.unbilled.length ? (
              <CollapsibleTrigger className="group ml-auto inline-flex h-6 cursor-pointer items-center gap-1 rounded-md border border-warning-border bg-warning-soft px-2 text-caption font-medium text-warning-text hover:border-warning-text/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                <WalletIcon className="size-3.5" aria-hidden />
                {plural(billing.unbilled.length, "consulta sem valor", "consultas sem valor")}
                <ChevronDownIcon className="size-3.5 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
              </CollapsibleTrigger>
            ) : null}
          </div>
          <CollapsibleContent className="mx-6 mt-4 rounded-lg border border-warning-border bg-card">
            <div className="px-4 py-2 text-caption font-medium text-warning-text">Consultas de {month.name} sem valor lançado</div>
            {billing.unbilled.map((c) => (
              <div key={c.caseId} className="flex items-center gap-3 border-t border-border px-4 py-2.5">
                <Initials name={c.patientName} />
                <div className="min-w-0 flex-1">
                  <div className="truncate">
                    <span className="font-semibold">{c.patientName ?? "Sem paciente"}</span>
                    {c.birthDate ? (
                      <span className="text-subtle-foreground"> · {formatPediatricAgeShort(computePediatricAge(c.birthDate))}</span>
                    ) : null}
                  </div>
                  <div className="truncate text-caption text-muted-foreground">{c.reason ?? "Consulta"}</div>
                </div>
                <CourtesyButton caseId={c.caseId} size="xs" />
                <StandaloneEntryDialog todayLabel={todayLabel} caseId={c.caseId} triggerSize="xs" triggerLabel="Lançar valor" />
                <Button asChild variant="outline" size="xs">
                  <Link href={`/dashboard/cases/${c.caseId}`}>Abrir consulta</Link>
                </Button>
              </div>
            ))}
          </CollapsibleContent>

          <div className="grid grid-cols-[1.25fr_1fr_1fr_1.3fr] divide-x divide-border">
            <Money icon={WalletIcon} label={`Recebido em ${month.name}`} value={formatCentsToBRL(summary.period_cents)} note={totalNote} big />
            <Money
              icon={StethoscopeIcon}
              label="Consultas"
              value={String(billing.closedCount)}
              note={
                billing.closedCount && billing.billedCount === billing.closedCount
                  ? "todas com valor lançado"
                  : `${billing.billedCount} com valor lançado`
              }
            />
            <Money
              icon={ReceiptIcon}
              label="Média por atendimento"
              value={summary.attendances ? formatCentsToBRL(summary.average_cents) : "—"}
              note={summary.attendances ? plural(summary.attendances, "atendimento lançado", "atendimentos lançados") : "nada lançado ainda"}
            />
            <div className="flex flex-col gap-2 px-6 py-5">
              <div className="flex items-center gap-2 text-label text-muted-foreground">
                <CreditCardIcon className="size-3.5" aria-hidden />
                Como recebeu
              </div>
              {split.length ? (
                <>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                    {split.map((part, index) => (
                      <span key={part.method} className={SPLIT_COLORS[index]} style={{ width: `${part.percent}%` }} />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-caption">
                    {split.map((part, index) => (
                      <span key={part.method} className="flex items-center gap-1.5" title={formatCentsToBRL(part.cents)}>
                        <span className={cn("size-2 rounded-full", SPLIT_COLORS[index])} aria-hidden />
                        {PAYMENT_METHOD_LABEL[part.method]}
                        <span className="num ml-auto text-subtle-foreground">{part.percent}%</span>
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <span className="text-caption text-subtle-foreground">Nenhum lançamento no mês.</span>
              )}
            </div>
          </div>

          <div className="border-t border-border px-6 pt-4 pb-5">
            <div className="mb-3 flex items-center gap-3 text-label text-muted-foreground">
              Recebido por dia
              {peak ? (
                <span className="num text-caption text-subtle-foreground">
                  maior dia: {dayLabel(`${month.ym}-${String(peak.day).padStart(2, "0")}`).toLowerCase()} · {formatCentsToBRL(peak.cents)}
                </span>
              ) : null}
              <div className="ml-auto inline-flex rounded-lg bg-muted p-0.5" role="group" aria-label="Tipo de gráfico">
                {(
                  [
                    ["line", "Linhas", ChartLineIcon],
                    ["bar", "Barras", ChartColumnIcon],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={chart === value}
                    onClick={() => pickChart(value)}
                    className={cn(
                      "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-caption",
                      chart === value ? "bg-card font-semibold text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <DailyChart series={series} kind={chart} ym={month.ym} />
          </div>
        </section>
      </Collapsible>

      <section className="rounded-xl border border-border bg-card">
        <Tabs value={tab} onValueChange={(value) => setTab(value as "active" | "voided")} className="gap-0">
          <div className="flex items-end gap-6 border-b border-border px-5 pt-4">
            <TabsList className="h-auto w-auto gap-5 rounded-none bg-transparent p-0 lg:w-auto">
              <SectionTab value="active">
                Lançamentos
                <span className="num text-caption text-subtle-foreground">{active.length}</span>
              </SectionTab>
              <SectionTab value="voided">
                Anulados
                {voided.length ? <span className="num text-caption text-subtle-foreground">{voided.length}</span> : null}
              </SectionTab>
            </TabsList>
            <div className="relative mb-2.5 ml-auto w-80">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Criança ou descrição"
                aria-label="Buscar lançamento pela criança ou descrição"
                className="pr-8 pl-8"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Limpar busca"
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-subtle-foreground hover:text-foreground"
                >
                  <XIcon className="size-3.5" aria-hidden />
                </button>
              ) : null}
            </div>
          </div>
        </Tabs>

        {listed.length === 0 ? (
          <p className="px-5 py-6 text-muted-foreground">
            {query.trim()
              ? `Nenhum lançamento com "${query.trim()}".`
              : tab === "voided"
                ? `Nenhum lançamento anulado em ${month.name}.`
                : `Nada lançado em ${month.name}. Os valores entram aqui quando você encerra uma consulta ou registra um lançamento.`}
          </p>
        ) : (
          groups.map(([group, rows], index) => (
            <div key={group ?? "all"}>
              {group ? (
                <div className={cn("border-b border-border bg-muted px-5 py-2 text-label font-medium text-muted-foreground", index && "border-t")}>
                  {group}
                </div>
              ) : null}
              <div className="divide-y divide-border">
                {rows.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    isFresh={fresh.has(entry.id)}
                    restoring={isRestoring}
                    onRestore={() => restore(entry)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
        {tab === "voided" && voided.length ? (
          <p className="border-t border-border px-5 py-3 text-caption text-subtle-foreground">
            Anulado não entra nos totais. Restaurar devolve o lançamento como era.
          </p>
        ) : null}
      </section>
    </>
  )
}

function EntryRow({
  entry,
  isFresh,
  restoring,
  onRestore,
}: {
  entry: FinancialEntryListRow
  isFresh: boolean
  restoring: boolean
  onRestore: () => void
}) {
  const isVoided = entry.voided_at !== null
  return (
    <div
      className={cn(
        "group grid min-h-14 grid-cols-[110px_minmax(0,1.6fr)_minmax(0,1fr)_110px_120px_112px] items-center gap-4 px-5 py-2.5 transition-colors",
        isFresh ? "bg-highlight" : "hover:bg-accent",
        isVoided && "text-subtle-foreground",
      )}
    >
      <span className={cn("num text-caption", !isVoided && "text-muted-foreground")}>{dayLabel(entry.received_on)}</span>
      <div className="min-w-0">
        <div className={cn("flex items-center gap-2", isVoided ? "line-through" : "font-medium")}>
          <span className="truncate" title={entry.description}>
            {entry.description}
          </span>
          {isFresh ? <Badge variant="success">Agora</Badge> : null}
        </div>
        {isVoided ? <div className="num text-caption">Anulado em {dayLabel(entry.voided_at!.slice(0, 10)).slice(5)}</div> : null}
      </div>
      <div className="min-w-0">
        {entry.case_id ? (
          <Link href={`/dashboard/cases/${entry.case_id}`} className="flex min-w-0 items-center gap-2 hover:underline">
            <Initials name={entry.case_label} small />
            <span className="truncate">{entry.case_label ?? "Consulta"}</span>
          </Link>
        ) : (
          <span className="text-caption text-subtle-foreground">Sem consulta</span>
        )}
      </div>
      <span>
        <Badge variant="secondary">{PAYMENT_METHOD_LABEL[entry.payment_method]}</Badge>
      </span>
      <span className={cn("num text-right font-semibold", isVoided && "line-through")}>{formatCentsToBRL(entry.amount_cents)}</span>
      <div className="text-right">
        {isVoided ? (
          <Button variant="ghost" size="sm" disabled={restoring} onClick={onRestore}>
            <RotateCcwIcon data-icon="inline-start" />
            Restaurar
          </Button>
        ) : (
          <VoidEntryButton
            withLabel
            entryId={entry.id}
            caseId={entry.case_id}
            amountCents={entry.amount_cents}
            receivedOn={entry.received_on}
            className="text-subtle-foreground opacity-0 group-hover:opacity-100 hover:text-danger-text focus-visible:opacity-100"
          />
        )}
      </div>
    </div>
  )
}

/** Linhas (padrão, pedido do gestor) ou barras; a escolha fica no navegador. */
function DailyChart({ series, kind, ym }: { series: { day: number; cents: number }[]; kind: Chart; ym: string }) {
  const money = (value: unknown) => formatCentsToBRL(Number(value))
  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
      <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
      <YAxis tick={{ fontSize: 11 }} width={88} tickFormatter={money} tickLine={false} axisLine={false} />
      <Tooltip
        cursor={{ stroke: "var(--border-strong)", fill: "var(--accent)" }}
        content={({ active, payload, label }) =>
          active && payload?.length ? (
            <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
              <div className="text-caption text-muted-foreground">{dayLabel(`${ym}-${String(label).padStart(2, "0")}`)}</div>
              <div className="num font-semibold">{money(payload[0].value)}</div>
            </div>
          ) : null
        }
      />
    </>
  )
  return (
    <ResponsiveContainer width="100%" height={180}>
      {kind === "line" ? (
        <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          {axes}
          <Area
            type="monotone"
            dataKey="cents"
            stroke="var(--primary)"
            strokeWidth={2.5}
            fill="var(--primary)"
            fillOpacity={0.12}
            dot={{ r: 2.5, fill: "var(--primary)", strokeWidth: 0 }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </AreaChart>
      ) : (
        <BarChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          {axes}
          <Bar dataKey="cents" fill="var(--primary)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      )}
    </ResponsiveContainer>
  )
}

function Money({ icon: Icon, label, value, note, big }: { icon: LucideIcon; label: string; value: string; note: string; big?: boolean }) {
  return (
    <div className="flex flex-col gap-1 px-6 py-5">
      <div className="flex items-center gap-2 text-label text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </div>
      <div className={cn("num font-display font-semibold", big ? "text-display" : "text-page")}>{value}</div>
      <div className="text-caption text-subtle-foreground">{note}</div>
    </div>
  )
}

function Initials({ name, small }: { name: string | null; small?: boolean }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-muted font-semibold text-muted-foreground",
        small ? "size-7 text-caption" : "size-8 text-caption",
      )}
    >
      {getPatientInitials(name ?? "?")}
    </span>
  )
}
