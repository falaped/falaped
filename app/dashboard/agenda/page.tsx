import { redirect } from "next/navigation"
import { CalendarIcon } from "lucide-react"
import { tz } from "@date-fns/tz"
import { addDays, startOfWeek } from "date-fns"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { listAvailabilityRules } from "@/modules/availability/list-availability-rules"
import { listAvailabilityOverrides } from "@/modules/availability/list-availability-overrides"
import {
  expandAvailability,
  type AvailabilityBand,
  type AvailabilityOverride,
} from "@/lib/expand-availability"
import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"
import { CalendarEditor } from "@/components/dashboard/agenda/calendar-editor"
import { Separator } from "@/components/ui/separator"

/**
 * Rota da agenda do médico (RSC, AGENDA-01..05, Fase 6 v2).
 *
 * Gate auth + paid (redirect no RSC, espelhando o gate dos actions — T-06-05:
 * a RLS `to authenticated` NÃO impõe a assinatura). Lê rules + overrides
 * escopados por profile_id (T-06-01/D-13) e expande os slots SERVER-SIDE
 * (D-12: nada de slot persistido) para a janela default de SEMANA, sempre no
 * fuso da clínica via `{ in: tz(CLINIC_TIME_ZONE) }` com `weekStartsOn: 1`
 * (segunda, D-11). Passa ao CalendarEditor (client) as rows CRUAS de rules +
 * overrides para a re-expansão client-side na navegação (D-14) além do resumo.
 */
export default async function AgendaPage() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")
  // Paid gate (T-06-05): a RLS `to authenticated` não impõe a assinatura — o
  // gate paid é regra de app e DEVE ficar aqui, igual aos actions.
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const [ruleRows, overrideRows] = await Promise.all([
    listAvailabilityRules(supabase, profile.id),
    listAvailabilityOverrides(supabase, profile.id),
  ])

  // Janela default = SEMANA, fuso da clínica, segunda→domingo (D-11).
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
  // Overrides híbridos reais (D-20): carrega override_type + slot_minutes
  // (aditivos E subtrativos), substituindo a ponte só-subtrativa do Plano 01.
  const overrides: AvailabilityOverride[] = overrideRows.map((row) => ({
    date: row.exception_date,
    type: row.override_type,
    startMinute: row.start_minute,
    endMinute: row.end_minute,
    slotMinutes: row.slot_minutes,
  }))

  // Expansão SERVER-SIDE da semana default (D-12); o CalendarEditor re-expande
  // client-side ao navegar sobre as rows cruas (D-14).
  expandAvailability({
    rules: bands,
    overrides,
    window: { from: weekStart, to: weekEnd },
    timeZone: CLINIC_TIME_ZONE,
  })

  // Rows CRUAS ao client (re-expansão client-side na navegação, D-14).
  const editorRules = ruleRows.map((row) => ({
    id: row.id,
    weekday: row.weekday,
    start_minute: row.start_minute,
    end_minute: row.end_minute,
    slot_minutes: row.slot_minutes,
  }))
  const editorOverrides = overrideRows.map((row) => ({
    id: row.id,
    exception_date: row.exception_date,
    start_minute: row.start_minute,
    end_minute: row.end_minute,
    override_type: row.override_type,
    slot_minutes: row.slot_minutes,
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
            Pinte sua disponibilidade e folgas direto no calendário e salve em
            lote.
          </p>
        </div>
      </div>

      <Separator />

      <CalendarEditor
        rules={editorRules}
        overrides={editorOverrides}
        timeZone={CLINIC_TIME_ZONE}
      />
    </div>
  )
}
