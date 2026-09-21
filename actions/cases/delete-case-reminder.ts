"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { deleteCaseReminder } from "@/modules/cases/delete-case-reminder"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type DeleteCaseReminderResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Apaga um lembrete do médico logado. Apagar É a forma de resolver a pendência:
 * o que continua na lista é o que continua em aberto.
 */
export async function deleteCaseReminderAction(
  id: string,
  caseId: string,
): Promise<DeleteCaseReminderResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  try {
    await deleteCaseReminder(supabase, profile.id, id)
    revalidatePath(`/dashboard/cases/${caseId}`)
    revalidatePath(`/dashboard/cases/new/${caseId}`)
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao apagar o lembrete. Tente novamente."
    return { ok: false, error: message }
  }
}
