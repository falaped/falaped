import { redirect } from "next/navigation"
import { tz } from "@date-fns/tz"
import { addMonths, format, startOfMonth, subDays } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"

import { FirstAccessHome } from "@/components/dashboard/home/first-access-home"
import { HomeOverview } from "@/components/dashboard/home/home-overview"
import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"
import { createClient } from "@/lib/supabase/server"
import { getDashboardHomeData } from "@/modules/dashboard/get-dashboard-home-data"
import { getHomeAttention } from "@/modules/dashboard/get-home-attention"
import { getEarningsSummary } from "@/modules/financial-entries/get-earnings-summary"
import { applySignupMetadata } from "@/modules/profiles/apply-signup-metadata"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

/** Janela das pendências: crianças atendidas nos últimos 90 dias; medida com mais de 180 dias conta como antiga. */
const RECENT_DAYS = 90
const STALE_MEASURE_DAYS = 180

export async function DashboardHomeContent() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")

  // 1º acesso: CRM e nome separado vêm do cadastro. Se falhar, o Início abre igual
  // e tenta de novo na próxima visita.
  try {
    Object.assign(profile, await applySignupMetadata(supabase, profile.id))
  } catch (error: unknown) {
    console.error(error)
  }

  const home = await getDashboardHomeData(supabase, profile)

  if (home.totalCasesCount === 0) {
    return (
      <FirstAccessHome
        firstName={profile.first_name}
        fullName={[profile.first_name, profile.surname].filter(Boolean).join(" ") || "Seu nome"}
        crm={profile.crm}
        logoUrl={profile.logo_url_full}
        place={[profile.default_location_city, profile.default_location_state].filter(Boolean).join(" · ") || null}
        trialEndsAt={profile.trial_ends_at}
      />
    )
  }

  // Datas no fuso da clínica: num host em UTC a virada do dia e do mês erraria.
  const context = { in: tz(CLINIC_TIME_ZONE) }
  const now = new Date()
  const monthStart = startOfMonth(now, context)
  const hour = Number(format(now, "H", context))
  const firstName = profile.first_name ?? ""
  const greeting = `${hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"}${firstName ? `, ${firstName}` : ""}`
  const dateLabel = format(now, "EEEE, d 'de' MMMM", { ...context, locale: ptBR })

  const [attention, earnings] = await Promise.all([
    getHomeAttention(supabase, profile.id, {
      monthStartIso: monthStart.toISOString(),
      recentSinceIso: subDays(now, RECENT_DAYS, context).toISOString(),
      measuredSinceIso: format(subDays(now, STALE_MEASURE_DAYS, context), "yyyy-MM-dd", context),
    }),
    getEarningsSummary(
      supabase,
      profile.id,
      format(monthStart, "yyyy-MM-dd", context),
      format(addMonths(monthStart, 1, context), "yyyy-MM-dd", context),
      format(now, "yyyy-MM-dd", context),
    ),
  ])

  return (
    <HomeOverview
      greeting={greeting}
      dateLabel={dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
      monthLabel={format(now, "MMMM", { ...context, locale: ptBR })}
      monthReceivedCents={earnings.month_cents}
      now={now}
      home={home}
      attention={attention}
    />
  )
}
