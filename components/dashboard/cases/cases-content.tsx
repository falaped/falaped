import { redirect } from "next/navigation"
import { tz } from "@date-fns/tz"
import { startOfDay, startOfMonth, startOfWeek } from "date-fns"

import { ActiveConsultBanner } from "@/components/dashboard/cases/active-consult-banner"
import { ConsultationsList } from "@/components/dashboard/cases/consultations-list"
import { StartConsultButton } from "@/components/dashboard/cases/start-consult-button"
import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"
import { createClient } from "@/lib/supabase/server"
import { getConsultations } from "@/modules/cases/get-consultations"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

/**
 * Consultas (protótipo b1), no padrão do Início: topo em destaque, a consulta em
 * andamento e a lista com abas.
 */
export async function CasesContent() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")

  const { active, rows } = await getConsultations(supabase, profile.id)

  // Datas no fuso da clínica: num host em UTC a virada do dia e do mês erraria.
  const context = { in: tz(CLINIC_TIME_ZONE) }
  const now = new Date()
  const monthStartIso = startOfMonth(now, context).toISOString()

  return (
    <div className="flex w-full max-w-[1440px] flex-col gap-6">
      <section className="flex items-center gap-6 rounded-xl border border-primary-soft-border bg-highlight px-8 py-7 shadow-sm">
        <div>
          <h1 className="font-display text-display font-semibold">Suas consultas</h1>
          <p className="mt-1 text-read text-muted-foreground">Histórico de atendimentos, do mais recente ao mais antigo</p>
        </div>
        <StartConsultButton />
      </section>

      {active ? <ActiveConsultBanner active={active} now={now} /> : null}

      <ConsultationsList
        rows={rows}
        nowIso={now.toISOString()}
        todayStartIso={startOfDay(now, context).toISOString()}
        weekStartIso={startOfWeek(now, { ...context, weekStartsOn: 1 }).toISOString()}
        monthStartIso={monthStartIso}
      />
    </div>
  )
}
