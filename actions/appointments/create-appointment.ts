"use server"

import { revalidatePath } from "next/cache"
import { tz } from "@date-fns/tz"
import { addDays, startOfDay } from "date-fns"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import {
  createAppointmentSchema,
  type CreateAppointmentInput,
} from "@/lib/schemas/appointment"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { createAppointment } from "@/modules/appointments/create-appointment"
import { listAvailabilityRules } from "@/modules/availability/list-availability-rules"
import { listAvailabilityOverrides } from "@/modules/availability/list-availability-overrides"
import {
  expandAvailability,
  type AvailabilityBand,
  type AvailabilityOverride,
} from "@/lib/expand-availability"
import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"

export type CreateAppointmentResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

/** SQLSTATE 23P01 = exclusion_violation (Postgres). */
const EXCLUSION_VIOLATION = "23P01"

/**
 * Cria uma consulta (APPT-01, D-01/D-02/D-05): médico cria já CONFIRMADA (D-05),
 * num slot livre validado server-side (D-02).
 *
 * Gate auth + paid (T-07-05: a RLS `to authenticated` NÃO impõe a assinatura —
 * regra de app). Zod safeParse no boundary (T-07-06). Delega ao módulo, que
 * estampa profile_id server-side (T-07-04 / IDOR). revalidatePath re-carrega a
 * agenda + re-expande os slots.
 *
 * DEFESA EM CAMADAS contra double-booking:
 *  1. (UX/TOCTOU) slot-free check — confirma que o instante pedido é de fato um
 *     FreeSlot expandido (dentro da disponibilidade, não bloqueado por folga),
 *     reusando expandAvailability (Fase 6). WARNING 1: os módulos retornam
 *     snake_case; expandAvailability exige camelCase (AvailabilityBand /
 *     AvailabilityOverride). Passar as rows CRUAS faz a fn ver `undefined` nos
 *     minutos → zero slots → o check falha SEMPRE (nenhuma consulta poderia ser
 *     criada). Por isso mapeamos snake→camel VERBATIM como app/dashboard/agenda/page.tsx.
 *  2. (AUTORITATIVA) exclusion constraint no banco — a corrida entre duas
 *     inserções concorrentes só é resolvida corretamente pelo Postgres (23P01).
 *     O TOCTOU entre o check e o INSERT é ACEITÁVEL: a corrida perde no banco e
 *     vira a copy "horário já ocupado" (D-08 / Pattern 5).
 */
export async function createAppointmentAction(
  input: CreateAppointmentInput,
): Promise<CreateAppointmentResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsed = createAppointmentSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: zodErrorToUserMessage(parsed.error) }
  }

  const { patient_id, starts_at, ends_at } = parsed.data
  const startsAt = new Date(starts_at)
  const endsAt = new Date(ends_at)

  // (1) SLOT-FREE CHECK (D-02, Pattern 5): confirmar que starts_at é um FreeSlot
  // expandido antes do INSERT.
  const [ruleRows, overrideRows] = await Promise.all([
    listAvailabilityRules(supabase, profile.id),
    listAvailabilityOverrides(supabase, profile.id),
  ])

  // WARNING 1 — mapear snake_case (DB) → camelCase (fn pura), VERBATIM como
  // app/dashboard/agenda/page.tsx (~linhas 49-64). Sem isso os minutos chegam
  // `undefined` e expandAvailability retorna zero slots.
  const bands: AvailabilityBand[] = ruleRows.map((row) => ({
    weekday: row.weekday,
    startMinute: row.start_minute,
    endMinute: row.end_minute,
    slotMinutes: row.slot_minutes,
  }))
  const overrides: AvailabilityOverride[] = overrideRows.map((row) => ({
    date: row.exception_date,
    type: row.override_type,
    startMinute: row.start_minute,
    endMinute: row.end_minute,
    slotMinutes: row.slot_minutes,
  }))

  // Janela do DIA LOCAL da consulta no fuso da clínica (meio-aberta [dayStart, dayEnd)).
  const context = { in: tz(CLINIC_TIME_ZONE) }
  const dayStart = startOfDay(startsAt, context)
  const dayEnd = addDays(dayStart, 1, context)

  const { slots } = expandAvailability({
    rules: bands,
    overrides,
    window: { from: dayStart, to: dayEnd },
    timeZone: CLINIC_TIME_ZONE,
  })

  // Issue C: a consulta pode DURAR mais que um slot (o médico escolhe a duração).
  // O intervalo pedido [startsAt, endsAt) precisa ser COBERTO por slots livres
  // CONTÍGUOS: o primeiro slot começa exatamente em startsAt e, encadeando por
  // start===prevEnd, a cobertura alcança (ou passa) endsAt sem buracos. A exclusion
  // constraint no banco continua sendo a defesa final contra corrida (23P01).
  const sorted = [...slots].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  )
  const startIndex = sorted.findIndex(
    (s) => s.start.getTime() === startsAt.getTime(),
  )
  let covered = false
  if (startIndex !== -1) {
    let cursor = sorted[startIndex].end.getTime()
    covered = cursor >= endsAt.getTime()
    for (
      let i = startIndex + 1;
      !covered && i < sorted.length;
      i += 1
    ) {
      // Buraco entre slots (folga/indisponibilidade no meio) → cobertura quebra.
      if (sorted[i].start.getTime() !== cursor) break
      cursor = sorted[i].end.getTime()
      covered = cursor >= endsAt.getTime()
    }
  }
  if (!covered) {
    return {
      ok: false,
      error: "Este horário não está mais disponível. Atualize a agenda e escolha outro.",
    }
  }

  // (2) INSERT — médico cria já CONFIRMADA (D-05). A exclusion constraint é a
  // defesa final; capturamos 23P01 abaixo.
  try {
    const created = await createAppointment(supabase, profile.id, {
      patient_id,
      status: "confirmed",
      starts_at,
      ends_at,
    })
    revalidatePath("/dashboard/agenda")
    return { ok: true, id: created.id }
  } catch (error: unknown) {
    if (isExclusionViolation(error)) {
      return {
        ok: false,
        error: "Este horário já foi ocupado por outra consulta. Escolha outro horário livre.",
      }
    }
    return {
      ok: false,
      error: "Não foi possível agendar a consulta. Verifique sua conexão e tente novamente.",
    }
  }
}

/** Narrowing: o PostgrestError propagado carrega .code === "23P01". */
function isExclusionViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === EXCLUSION_VIOLATION
  )
}
