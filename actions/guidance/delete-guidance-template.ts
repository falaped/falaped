"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { deleteGuidanceTemplate } from "@/modules/guidance/delete-guidance-template"

export type DeleteGuidanceTemplateResult =
  | { ok: true }
  | { ok: false; error: string }

export async function deleteGuidanceTemplateAction(
  id: string,
): Promise<DeleteGuidanceTemplateResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  if (!id || typeof id !== "string")
    return { ok: false, error: "ID do marco inválido." }

  try {
    await deleteGuidanceTemplate(supabase, id, profile.id)
    revalidatePath("/dashboard/guidance")
    return { ok: true }
  } catch (e) {
    console.error("[GUIDANCE] delete template failed", e)
    return { ok: false, error: "Erro ao excluir marco. Tente novamente." }
  }
}
