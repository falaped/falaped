"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { resetConsultation } from "@/modules/cases/reset-consultation"

export type ResetConsultationResult =
  | { ok: true }
  | { ok: false; error: string }

export async function resetConsultationAction(
  caseId: string,
): Promise<ResetConsultationResult> {
  if (typeof caseId !== "string" || caseId.trim().length === 0) {
    return { ok: false, error: "Caso inválido." }
  }

  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  try {
    await resetConsultation(supabase, caseId, profile.id)
    revalidatePath("/dashboard/cases")
    revalidatePath(`/dashboard/cases/${caseId}`)
    revalidatePath(`/dashboard/cases/new/${caseId}`)
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao resetar a consulta. Tente novamente."
    return { ok: false, error: message }
  }
}
