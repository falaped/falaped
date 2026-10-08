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
import { listFinancialEntries } from "@/modules/financial-entries/list-financial-entries"

/**
 * Financeiro (protótipo e1–e4): o mês navegado é o escopo de tudo. Todas as datas saem
 * daqui no fuso da clínica e descem prontas; um `mes` forjado ou no futuro cai no mês atual.
 */
export async function FinancialContent({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const { mes } = await searchParams
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
      />
    </div>
  )
}
