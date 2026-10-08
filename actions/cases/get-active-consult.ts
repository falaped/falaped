"use server"

import { createClient } from "@/lib/supabase/server"
import { getConsultIndexByPatient, type ConsultIndexByPatient } from "@/modules/cases/get-consult-index-by-patient"
import { listCaseActivityTimes } from "@/modules/cases/list-case-activity-times"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type ActiveConsult = NonNullable<ConsultIndexByPatient["activeCase"]> & { activityAts: string[] }

export type GetActiveConsultResult = { ok: true; activeCase: ActiveConsult | null } | { ok: false; error: string }

/**
 * Só a consulta aberta, com as datas de atividade: o menu chama a cada coisa salva na
 * consulta e ao voltar para a aba, para o status (andamento, pausada, parada) ficar em dia.
 */
export async function getActiveConsultAction(): Promise<GetActiveConsultResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  try {
    const { activeCase } = await getConsultIndexByPatient(supabase, profile.id)
    if (!activeCase) return { ok: true, activeCase: null }
    const activityAts = await listCaseActivityTimes(supabase, activeCase.id, activeCase.patientId, activeCase.startedAt)
    return { ok: true, activeCase: { ...activeCase, activityAts } }
  } catch {
    return { ok: false, error: "Não foi possível carregar a consulta aberta." }
  }
}
