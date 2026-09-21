"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { getPhoneByProfileId } from "@/modules/authenticated-users/get-phone-by-profile-id"
import { findOwnedCaseId } from "@/modules/cases/find-owned-case-id"
import { updateCaseReminders } from "@/modules/cases/update-case-reminders"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type SaveCaseRemindersResult =
  | { ok: true }
  | { ok: false; error: string }

/** Teto do campo: é lembrete de consulta, não prontuário. */
const MAX_REMINDERS_CHARS = 4000

/**
 * Salva os lembretes/pendências do atendimento. A posse do caso é confirmada
 * antes da escrita — a RLS de `cases` aceita perfil OU telefone, e o id que vem
 * do browser não prova nem um nem outro.
 */
export async function saveCaseRemindersAction(
  caseId: string,
  reminders: string,
): Promise<SaveCaseRemindersResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  if (reminders.length > MAX_REMINDERS_CHARS)
    return {
      ok: false,
      error: "Lembretes muito longos. Use até 4000 caracteres.",
    }

  try {
    const ownedCaseId = await findOwnedCaseId(supabase, caseId, profile.id)
    if (!ownedCaseId) return { ok: false, error: "Atendimento não encontrado." }

    const phone = await getPhoneByProfileId(supabase, profile.id)
    if (!phone) return { ok: false, error: "Atendimento não encontrado." }

    await updateCaseReminders(supabase, caseId, phone, reminders)

    revalidatePath(`/dashboard/cases/${caseId}`)
    revalidatePath(`/dashboard/cases/new/${caseId}`)
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao salvar os lembretes. Tente novamente."
    return { ok: false, error: message }
  }
}
