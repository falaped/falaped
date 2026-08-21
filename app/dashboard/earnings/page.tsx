import { redirect } from "next/navigation"
import { tz } from "@date-fns/tz"
import {
  addDays,
  addMonths,
  format,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getEarningsSummary } from "@/modules/financial-entries/get-earnings-summary"
import { listFinancialEntries } from "@/modules/financial-entries/list-financial-entries"
import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"
import { EarningsCards } from "@/components/dashboard/earnings/earnings-cards"
import { EarningsDailyChart } from "@/components/dashboard/earnings/earnings-daily-chart"
import { EarningsPeriodHeader } from "@/components/dashboard/earnings/earnings-period-header"
import { EarningsTable } from "@/components/dashboard/earnings/earnings-table"
import { StandaloneEntryDialog } from "@/components/dashboard/earnings/standalone-entry-dialog"
import { Separator } from "@/components/ui/separator"

type PageProps = {
  searchParams: Promise<{
    mes?: string
    anulados?: string
  }>
}

/**
 * Painel de Ganhos (RSC, EARN-03/EARN-04/EARN-05, Fase 10).
 *
 * Gate auth + paid (T-10-09/T-10-11: a RLS `to authenticated` NÃO impõe a assinatura, e
 * `p_profile_id` vem do gate, nunca de search param). Todas as datas são derivadas AQUI no
 * fuso da clínica via `{ in: tz(CLINIC_TIME_ZONE) }` e descem como string pronta — nunca
 * por serialização ISO cortada, que num host em UTC já é amanhã depois das 21h de Brasília.
 *
 * A navegação de período é só search param: o RSC re-renderiza com a nova janela e o
 * cliente não faz fetch nenhum. O painel abre no mês corrente, sem parâmetro na URL (D-16).
 * Um parâmetro forjado ou inparseável cai no mês corrente, e a função SQL recebe
 * parâmetros TIPADOS como data — não há caminho de string do search param para o SQL
 * (T-10-32).
 *
 * A Faixa A é relativa a HOJE e não se move ao navegar: os três cards saem de escalares
 * que a função SQL calcula sobre `p_today`, independentes da janela do período.
 */
export default async function EarningsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const { mes, anulados } = await searchParams
  const showVoided = anulados === "1"

  const context = { in: tz(CLINIC_TIME_ZONE) }
  const now = new Date()

  // Mês navegado: só um `yyyy-MM` bem-formado E parseável é aceito; qualquer outra coisa
  // cai no mês corrente, sem erro na tela.
  const requestedMonth =
    mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes)
      ? parse(mes, "yyyy-MM", now, context)
      : null
  const monthStart = startOfMonth(
    requestedMonth && isValid(requestedMonth) ? requestedMonth : now,
    context,
  )
  // Janela MEIO-ABERTA [from, to): `received_on = to` fica fora.
  const monthEnd = addMonths(monthStart, 1, context)
  const weekStart = startOfWeek(now, { ...context, weekStartsOn: 1 })
  const weekEnd = addDays(weekStart, 6, context)

  const todayIso = format(now, "yyyy-MM-dd", context)
  const todayLabel = format(now, "dd/MM/yyyy", context)
  const weekLabel =
    format(weekStart, "MM", context) === format(weekEnd, "MM", context)
      ? `${format(weekStart, "d", context)}–${format(weekEnd, "d/MM", context)}`
      : `${format(weekStart, "d/MM", context)}–${format(weekEnd, "d/MM", context)}`
  // Faixa A é relativa a HOJE; Faixa B ao período navegado. Só o segundo se move.
  const currentMonthLabel = format(now, "MMMM 'de' yyyy", { ...context, locale: ptBR })
  const periodLabel = format(monthStart, "MMMM 'de' yyyy", {
    ...context,
    locale: ptBR,
  })
  const isCurrentPeriod =
    format(monthStart, "yyyy-MM", context) === format(now, "yyyy-MM", context)
  // Os meses vizinhos são resolvidos aqui e descem prontos: o navegador é um componente
  // cliente e não pode construir data (num host em UTC erraria a virada do mês).
  const prevMonth = format(addMonths(monthStart, -1, context), "yyyy-MM", context)
  const nextMonth = format(monthEnd, "yyyy-MM", context)

  const from = format(monthStart, "yyyy-MM-dd", context)
  const to = format(monthEnd, "yyyy-MM-dd", context)

  const [summary, entries] = await Promise.all([
    getEarningsSummary(supabase, profile.id, from, to, todayIso),
    listFinancialEntries(supabase, profile.id, {
      from,
      to,
      includeVoided: showVoided,
    }),
  ])

  const hasVoidedRow = entries.some((entry) => entry.voided_at !== null)

  const emptyState =
    entries.length === 0 ? (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        {showVoided ? (
          <>
            <p className="text-sm font-medium">
              Nenhum lançamento anulado neste período.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Os lançamentos anulados ficam guardados para auditoria e aparecem aqui.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium">Nenhum lançamento neste período.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Os lançamentos aparecem aqui quando você encerra um caso ou registra um
              valor avulso.
            </p>
            <div className="mt-4 flex justify-center">
              <StandaloneEntryDialog todayLabel={todayLabel} />
            </div>
          </>
        )}
      </div>
    ) : null

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ganhos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe o que você recebeu por atendimento.
          </p>
        </div>
        <StandaloneEntryDialog todayLabel={todayLabel} />
      </div>

      <Separator />

      <EarningsCards
        summary={summary}
        todayLabel={todayLabel}
        weekLabel={weekLabel}
        monthLabel={currentMonthLabel}
        periodLabel={periodLabel}
        isCurrentPeriod={isCurrentPeriod}
        emptyState={emptyState}
        periodHeader={
          <EarningsPeriodHeader
            periodLabel={periodLabel}
            isCurrentPeriod={isCurrentPeriod}
            prevMonth={prevMonth}
            nextMonth={nextMonth}
            showVoided={showVoided}
          />
        }
      >
        {/* Série diária vazia (nada faturado, ou só linhas anuladas com o filtro ligado):
            nenhum gráfico. Um eixo sem barras lê como quebrado. */}
        {summary.by_day.length > 0 ? (
          <EarningsDailyChart byDay={summary.by_day} />
        ) : null}
        <EarningsTable entries={entries} />
        {showVoided && !hasVoidedRow ? (
          <div className="mx-4 mt-2 rounded-xl border border-dashed border-border p-4 text-center">
            <p className="text-sm font-medium">
              Nenhum lançamento anulado neste período.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Os lançamentos anulados ficam guardados para auditoria e aparecem aqui.
            </p>
          </div>
        ) : null}
      </EarningsCards>
    </div>
  )
}
