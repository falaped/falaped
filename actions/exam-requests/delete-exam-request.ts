"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { deleteExamRequest } from "@/modules/exam-requests/delete-exam-request"

export type DeleteExamRequestResult = { ok: true } | { ok: false; error: string }

export async function deleteExamRequestAction(
  examRequestId: string,
  pdfStoragePath: string | null,
): Promise<DeleteExamRequestResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  if (!examRequestId || typeof examRequestId !== "string")
    return { ok: false, error: "ID do pedido de exames inválido." }

  try {
    await deleteExamRequest(supabase, examRequestId, profile.id, pdfStoragePath)
    revalidatePath("/dashboard/exam-requests")
    return { ok: true }
  } catch (e) {
    console.error("[EXAM_REQUESTS] delete failed", e)
    return {
      ok: false,
      error: "Erro ao excluir pedido de exames. Tente novamente.",
    }
  }
}
