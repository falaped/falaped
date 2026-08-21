import { redirect } from "next/navigation"
import { tz } from "@date-fns/tz"
import { addDays, addMonths, format, startOfMonth, startOfWeek } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getEarningsSummary } from "@/modules/financial-entries/get-earnings-summary"
import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"
import { EarningsCards } from "@/components/dashboard/earnings/earnings-cards"
import { StandaloneEntryDialog } from "@/components/dashboard/earnings/standalone-entry-dialog"
import { Separator } from "@/components/ui/separator"

/**
 * Painel de Ganhos (RSC, EARN-03/EARN-04, Fase 10).
 *
 * Gate auth + paid (T-10-09/T-10-11: a RLS `to authenticated` NÃO impõe a assinatura, e
 * `p_profile_id` vem do gate, nunca de search param). Todas as datas são derivadas AQUI no
 * fuso da clínica via `{ in: tz(CLINIC_TIME_ZONE) }` e descem como string pronta — nunca
 * por serialização ISO cortada, que num host em UTC já é amanhã depois das 21h de Brasília.
 *
 * A navegação de período (`?mes`), o gráfico e a tabela de lançamentos chegam em 10-05.
 */
export default async function EarningsPage() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const context = { in: tz(CLINIC_TIME_ZONE) }
  const now = new Date()
  const monthStart = startOfMonth(now, context)
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
  // Faixa A é relativa a HOJE; Faixa B ao período navegado. Hoje coincidem, mas os
  // dois rótulos nascem separados para que 10-05 mexa só no do período.
  const currentMonthLabel = format(now, "MMMM 'de' yyyy", { ...context, locale: ptBR })
  const periodLabel = format(monthStart, "MMMM 'de' yyyy", {
    ...context,
    locale: ptBR,
  })
  const isCurrentPeriod =
    format(monthStart, "yyyy-MM", context) === format(now, "yyyy-MM", context)

  const summary = await getEarningsSummary(
    supabase,
    profile.id,
    format(monthStart, "yyyy-MM-dd", context),
    format(monthEnd, "yyyy-MM-dd", context),
    todayIso,
  )

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
      />
    </div>
  )
}
