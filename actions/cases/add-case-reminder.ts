"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { createCaseReminder } from "@/modules/cases/create-case-reminder"
import { findOwnedCaseId } from "@/modules/cases/find-owned-case-id"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import type { CaseReminder } from "@/modules/cases/types"

export type AddCaseReminderResult =
  | { ok: true; reminder: CaseReminder }
  | { ok: false; error: string }

/** Teto por lembrete: é uma pendência, não um prontuário. */
const MAX_REMINDER_CHARS = 500

/**
 * Registra um lembrete do atendimento. A posse do caso é confirmada antes da
 * escrita — a RLS de `case_reminders` ancora só em `profile_id` e nunca olha
 * para `cases`, então o `caseId` que vem do browser é superfície de IDOR que só
 * a action fecha.
 */
export async function addCaseReminderAction(
  caseId: string,
  text: string,
): Promise<AddCaseReminderResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const clean = text.trim()
  if (!clean) return { ok: false, error: "Escreva o lembrete." }
  if (clean.length > MAX_REMINDER_CHARS)
    return { ok: false, error: "Lembrete muito longo. Use até 500 caracteres." }

  try {
    const ownedCaseId = await findOwnedCaseId(supabase, caseId, profile.id)
    if (!ownedCaseId) return { ok: false, error: "Atendimento não encontrado." }

    const reminder = await createCaseReminder(
      supabase,
      profile.id,
      caseId,
      clean,
    )

    revalidatePath(`/dashboard/cases/${caseId}`)
    revalidatePath(`/dashboard/cases/new/${caseId}`)
    return { ok: true, reminder }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao salvar o lembrete. Tente novamente."
    return { ok: false, error: message }
  }
}
