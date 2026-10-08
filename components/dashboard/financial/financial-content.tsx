import { redirect } from "next/navigation"
import { tz } from "@date-fns/tz"
import { addDays, addMonths, differenceInCalendarDays, format, isValid, parse, startOfMonth } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"

import { FinancialView } from "@/components/dashboard/financial/financial-view"
import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getEarningsSummary } from "@/modules/financial-entries/get-earnings-summary"
import { getMonthBilling } from "@/modules/financial-entries/get-month-billing"
import { monthRange, paymentSplit, periodRows, sumByMonth, type PeriodRow } from "@/lib/financial-view"
import { listClosedCaseEndings } from "@/modules/financial-entries/list-closed-case-endings"
import { listPaymentAmounts } from "@/modules/financial-entries/list-payment-amounts"
import type { SupabaseClient } from "@supabase/supabase-js"
import { listFinancialEntries } from "@/modules/financial-entries/list-financial-entries"

export type FinancialTab = "month" | "year" | "all"

/** Ano ou desde o início, já agregado no servidor (aba Ano / Desde o início). */
export type FinancialPeriod = {
  kind: "year" | "all"
  /** "2026" ou "novembro de 2025" (o primeiro mês). */
  label: string
  prev: string | null
  next: string | null
  totalCents: number
  consults: number
  /** Meses contados na média (do primeiro mês com recebimento, no máximo até hoje). */
  months: number
  best: PeriodRow | null
  split: ReturnType<typeof paymentSplit>
  /** Um ponto por mês, do mais antigo ao atual. */
  chart: PeriodRow[]
  /** Meses do ano ou anos desde o início, do mais recente ao mais antigo. */
  rows: PeriodRow[]
}

/**
 * Financeiro (protótipo e1–e4 + abas, 08/10): Mês, Ano ou Desde o início, por `?aba=`.
 * Todas as datas saem daqui no fuso da clínica; `mes`/`ano` forjados ou no futuro caem no atual.
 */
export async function FinancialContent({ searchParams }: { searchParams: Promise<{ mes?: string; ano?: string; aba?: string }> }) {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const { mes, ano, aba } = await searchParams
  const tab: FinancialTab = aba === "ano" ? "year" : aba === "inicio" ? "all" : "month"
  const inClinic = { in: tz(CLINIC_TIME_ZONE) }
  const now = new Date()
  const currentStart = startOfMonth(now, inClinic)
  const requested = mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? parse(mes, "yyyy-MM", now, inClinic) : null
  const monthStart =
    requested && isValid(requested) && requested.getTime() <= currentStart.getTime() ? startOfMonth(requested, inClinic) : currentStart
  const monthEnd = addMonths(monthStart, 1, inClinic)
  const prevStart = addMonths(monthStart, -1, inClinic)
  const isCurrent = monthStart.getTime() === currentStart.getTime()

  const ymd = (date: Date) => format(date, "yyyy-MM-dd", inClinic)
  const todayIso = ymd(now)

  const [summary, prevSummary, entries, billing] = await Promise.all([
    getEarningsSummary(supabase, profile.id, ymd(monthStart), ymd(monthEnd), todayIso),
    isCurrent ? null : getEarningsSummary(supabase, profile.id, ymd(prevStart), ymd(monthStart), todayIso).catch(() => null),
    listFinancialEntries(supabase, profile.id, { from: ymd(monthStart), to: ymd(monthEnd), includeVoided: true }),
    getMonthBilling(supabase, profile.id, monthStart.toISOString(), monthEnd.toISOString()),
  ])
  const currentYm = format(currentStart, "yyyy-MM", inClinic)
  const period = tab === "month" ? null : await getPeriod(supabase, profile.id, tab, ano, currentYm, ymd(addMonths(currentStart, 1, inClinic)), todayIso)

  const monthName = format(monthStart, "MMMM", { ...inClinic, locale: ptBR })
  const label = format(monthStart, "MMMM 'de' yyyy", { ...inClinic, locale: ptBR })

  return (
    <div className="flex w-full max-w-[1440px] flex-col gap-6">
      <FinancialView
        month={{
          ym: format(monthStart, "yyyy-MM", inClinic),
          label: label.charAt(0).toUpperCase() + label.slice(1),
          name: monthName,
          prevName: format(prevStart, "MMMM", { ...inClinic, locale: ptBR }),
          isCurrent,
          prev: format(prevStart, "yyyy-MM", inClinic),
          next: isCurrent ? null : format(monthEnd, "yyyy-MM", inClinic),
          lastDay: isCurrent
            ? Number(format(now, "d", inClinic))
            : differenceInCalendarDays(monthEnd, monthStart, inClinic),
        }}
        todayIso={todayIso}
        weekAgoIso={ymd(addDays(now, -6, inClinic))}
        todayLabel={format(now, "dd/MM/yyyy", inClinic)}
        summary={summary}
        prevPeriodCents={prevSummary?.period_cents ?? null}
        entries={entries.toReversed()}
        billing={billing}
        tab={tab}
        period={period}
      />
    </div>
  )
}

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]

/** Ano (`ano`, entre o primeiro e o atual) ou desde o início, agregado por mês. */
async function getPeriod(
  supabase: SupabaseClient,
  profileId: string,
  kind: "year" | "all",
  requestedYear: string | undefined,
  currentYm: string,
  /** 1º dia do mês que vem (yyyy-MM-dd): fim exclusivo de tudo. */
  endIso: string,
  todayIso: string,
): Promise<FinancialPeriod> {
  const inClinic = { in: tz(CLINIC_TIME_ZONE) }
  const [allTime, endings] = await Promise.all([
    getEarningsSummary(supabase, profileId, "2000-01-01", endIso, todayIso),
    listClosedCaseEndings(supabase, profileId),
  ])
  const centsByMonth = sumByMonth(allTime.by_day)
  const consultsByMonth: Record<string, number> = {}
  for (const endedAt of endings) {
    const ym = format(new Date(endedAt), "yyyy-MM", inClinic)
    consultsByMonth[ym] = (consultsByMonth[ym] ?? 0) + 1
  }
  const firstYm = [...Object.keys(centsByMonth), ...Object.keys(consultsByMonth)].sort()[0] ?? currentYm
  const currentYear = currentYm.slice(0, 4)
  const firstYear = firstYm.slice(0, 4)

  if (kind === "all") {
    const chart = periodRows(monthRange(firstYm, currentYm), centsByMonth, consultsByMonth)
    const years = periodRows(monthRange(`${firstYear}-01`, `${currentYear}-01`).filter((ym) => ym.endsWith("-01")).map((ym) => ym.slice(0, 4)), centsByMonth, consultsByMonth)
    return summarize("all", `${MONTHS[Number(firstYm.slice(5, 7)) - 1]} de ${firstYear}`, null, null, chart, years.toReversed(),
      await listPaymentAmounts(supabase, profileId, { to: endIso }))
  }

  const year = requestedYear && /^\d{4}$/.test(requestedYear) && requestedYear >= firstYear && requestedYear <= currentYear ? requestedYear : currentYear
  const from = year === firstYear ? firstYm : `${year}-01`
  const months = periodRows(monthRange(from, year === currentYear ? currentYm : `${year}-12`), centsByMonth, consultsByMonth)
  const nextYear = String(Number(year) + 1)
  return summarize("year", year, year > firstYear ? String(Number(year) - 1) : null, year < currentYear ? nextYear : null, months, months.toReversed(),
    await listPaymentAmounts(supabase, profileId, { from: `${year}-01-01`, to: year < currentYear ? `${nextYear}-01-01` : endIso }))
}

function summarize(
  kind: "year" | "all",
  label: string,
  prev: string | null,
  next: string | null,
  chart: PeriodRow[],
  rows: PeriodRow[],
  payments: Parameters<typeof paymentSplit>[0],
): FinancialPeriod {
  const totalCents = chart.reduce((sum, row) => sum + row.cents, 0)
  const best = chart.reduce<PeriodRow | null>((top, row) => (row.cents > (top?.cents ?? 0) ? row : top), null)
  return {
    kind,
    label,
    prev,
    next,
    totalCents,
    consults: chart.reduce((sum, row) => sum + row.consults, 0),
    months: chart.length,
    best,
    split: paymentSplit(payments),
    chart,
    rows,
  }
}
