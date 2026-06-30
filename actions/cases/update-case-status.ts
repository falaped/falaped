"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { updateCaseStatus } from "@/modules/cases/update-case-status"

export type UpdateCaseStatusResult =
  | { ok: true }
  | { ok: false; error: string }

export async function updateCaseStatusAction(
  caseId: string,
  status: "active" | "closed",
): Promise<UpdateCaseStatusResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  try {
    await updateCaseStatus(supabase, caseId, profile.id, status)
    revalidatePath("/dashboard/cases")
    revalidatePath(`/dashboard/cases/${caseId}`)
    // Workspace route is cached (cacheComponents); without this, reopening a case
    // and entering the workspace shows a stale/frozen timer from the prior session.
    revalidatePath(`/dashboard/cases/new/${caseId}`)
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao atualizar status do caso. Tente novamente."
    return { ok: false, error: message }
  }
}
