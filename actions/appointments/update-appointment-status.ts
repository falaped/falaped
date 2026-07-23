"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import {
  updateAppointmentStatusSchema,
  type UpdateAppointmentStatusInput,
} from "@/lib/schemas/appointment"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { isLegalTransition } from "@/modules/appointments/appointment-transitions"
import { updateAppointmentStatus } from "@/modules/appointments/update-appointment-status"

export type TransitionAppointmentStatusResult =
  | { ok: true }
  | { ok: false; error: string }

/** SQLSTATE 23P01 = exclusion_violation (Postgres). */
const EXCLUSION_VIOLATION = "23P01"

/**
 * Transiciona o status de uma consulta (APPT-02/APPT-03, D-06): confirmar/recusar
 * um pedido, marcar realizada/falta/cancelar. Recusar = pending -> canceled;
 * cancelar = confirmed -> canceled (D-06). Estados finais (done/no_show/canceled)
 * não têm transição de saída.
 *
 * Gate auth + paid (T-07-05). Zod safeParse no boundary. LEGALIDADE imposta na
 * app via isLegalTransition (T-07-07): Postgres não impõe máquina de estado — o
 * enum só restringe os valores. O módulo faz compare-and-set (.eq("status", from))
 * como CONCURRENCY GUARD: 0-rows-afetadas (matched:false) = transição concorrente
 * / estado já mudado → result union amigável. Confirmar um pending pode disparar
 * 23P01 no UPDATE (Pitfall 4) se o horário foi tomado no meio → copy "já ocupado".
 * revalidatePath re-carrega a agenda.
 */
export async function transitionAppointmentStatusAction(
  input: UpdateAppointmentStatusInput,
): Promise<TransitionAppointmentStatusResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsed = updateAppointmentStatusSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: zodErrorToUserMessage(parsed.error) }
  }

  const { id, from, to } = parsed.data

  // Legalidade da transição (T-07-07): rejeita reabrir estados finais, etc.
  if (!isLegalTransition(from, to)) {
    return {
      ok: false,
      error: "Não foi possível atualizar a consulta. Tente novamente.",
    }
  }

  try {
    const result = await updateAppointmentStatus(supabase, profile.id, id, from, to)
    // Compare-and-set miss: nenhuma consulta ainda em `from` (transição concorrente).
    if (!result.matched) {
      return {
        ok: false,
        error: "Não foi possível atualizar o pedido. Tente novamente.",
      }
    }
    revalidatePath("/dashboard/agenda")
    return { ok: true }
  } catch (error: unknown) {
    // Confirmar um pending pode colidir com um confirmed vizinho (Pitfall 4).
    if (isExclusionViolation(error)) {
      return {
        ok: false,
        error: "Este horário já foi ocupado por outra consulta. Escolha outro horário livre.",
      }
    }
    return {
      ok: false,
      error: "Não foi possível atualizar a consulta. Tente novamente.",
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
