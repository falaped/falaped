import { redirect } from "next/navigation"
import { CalendarIcon } from "lucide-react"
import { tz } from "@date-fns/tz"
import { addDays, startOfWeek } from "date-fns"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { listAvailabilityRules } from "@/modules/availability/list-availability-rules"
import { listAvailabilityExceptions } from "@/modules/availability/list-availability-exceptions"
import {
  expandAvailability,
  type AvailabilityBand,
  type AvailabilityOverride,
} from "@/lib/expand-availability"
import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"
import { AgendaView } from "@/components/dashboard/agenda/agenda-view"
import { Separator } from "@/components/ui/separator"

/**
 * Rota da agenda do médico (RSC, AGENDA-01..04, Fase 6).
 *
 * Gate auth + paid (redirect no RSC, espelhando o gate dos actions — T-06-05).
 * Lê rules + exceptions escopadas por profile_id (T-06-07/D-13) e expande os
 * slots SERVER-SIDE (D-12: nada de slot persistido) para a janela default de
 * SEMANA (D-06), sempre no fuso da clínica via `{ in: tz(CLINIC_TIME_ZONE) }`
 * com `weekStartsOn: 1` (segunda, D-11). A view client recebe os slots + o
 * resumo por dia + as rows cruas para editar a grade e as folgas.
 */
export default async function AgendaPage() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")
  // Paid gate (T-06-05): a RLS `to authenticated` não impõe a assinatura — o
  // gate paid é regra de app e DEVE ficar aqui, igual aos actions.
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const [ruleRows, exceptionRows] = await Promise.all([
    listAvailabilityRules(supabase, profile.id),
    listAvailabilityExceptions(supabase, profile.id),
  ])

  // Janela default = SEMANA (D-06), fuso da clínica, segunda→domingo (D-11).
  // Meio-aberta [weekStart, weekStart + 7d): a expansão compara com `< to`.
  const context = { in: tz(CLINIC_TIME_ZONE) }
  const weekStart = startOfWeek(new Date(), { ...context, weekStartsOn: 1 })
  const weekEnd = addDays(weekStart, 7, context)

  // Mapear snake_case (DB) → camelCase (fn pura). A fn é agnóstica de storage.
  const bands: AvailabilityBand[] = ruleRows.map((row) => ({
    weekday: row.weekday,
    startMinute: row.start_minute,
    endMinute: row.end_minute,
    slotMinutes: row.slot_minutes,
  }))
  // Mapear as folgas v1 (subtrativas) para o modelo de override híbrido (D-20).
  // O Plano 03 reescreve este RSC para carregar override_type/slot_minutes reais
  // (aditivos incluídos); aqui só adaptamos o contrato subtrativo existente.
  const overrides: AvailabilityOverride[] = exceptionRows.map((row) => ({
    date: row.exception_date,
    type: "subtract" as const,
    startMinute: row.start_minute,
    endMinute: row.end_minute,
    slotMinutes: null,
  }))

  const { slots, byDay } = expandAvailability({
    rules: bands,
    overrides,
    window: { from: weekStart, to: weekEnd },
    timeZone: CLINIC_TIME_ZONE,
  })

  // Slots carregam `Date` (instantes UTC); serializar como ISO para o client.
  const serializedSlots = slots.map((slot) => ({
    start: slot.start.toISOString(),
    end: slot.end.toISOString(),
    localDate: slot.localDate,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure sua disponibilidade e veja seus horários por dia, semana
            ou mês.
          </p>
        </div>
      </div>

      <Separator />

      <AgendaView
        slots={serializedSlots}
        byDay={byDay}
        rules={ruleRows}
        exceptions={exceptionRows}
        timeZone={CLINIC_TIME_ZONE}
      />
    </div>
  )
}
