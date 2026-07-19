"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { deleteExamPanel } from "@/modules/exam-panels/delete-exam-panel"

export type DeleteExamPanelResult = { ok: true } | { ok: false; error: string }

export async function deleteExamPanelAction(
  panelId: string,
): Promise<DeleteExamPanelResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  if (!panelId || typeof panelId !== "string")
    return { ok: false, error: "ID do painel inválido." }

  try {
    await deleteExamPanel(supabase, panelId, profile.id)
    revalidatePath("/dashboard/exam-requests")
    return { ok: true }
  } catch (e) {
    console.error("[EXAM_PANELS] delete failed", e)
    return { ok: false, error: "Erro ao excluir painel. Tente novamente." }
  }
}
