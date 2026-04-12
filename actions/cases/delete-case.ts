"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { deleteCase } from "@/modules/cases/delete-case"

export type DeleteCaseResult =
  | { ok: true }
  | { ok: false; error: string }

export async function deleteCaseAction(caseId: string): Promise<DeleteCaseResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  try {
    await deleteCase(supabase, caseId, profile.id)
    revalidatePath("/dashboard/cases")
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao excluir caso. Tente novamente."
    return { ok: false, error: message }
  }
}
