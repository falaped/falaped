"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getExamRequestTemplateByIdForProfile } from "@/modules/exam-request-templates/get-exam-request-template-by-id-for-profile"
import { deleteExamRequestTemplate } from "@/modules/exam-request-templates/delete-exam-request-template"

export type DeleteExamRequestTemplateResult =
  | { ok: true }
  | { ok: false; error: string }

export async function deleteExamRequestTemplateAction(
  templateId: string,
): Promise<DeleteExamRequestTemplateResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  if (!templateId || typeof templateId !== "string")
    return { ok: false, error: "ID do template inválido." }

  try {
    const template = await getExamRequestTemplateByIdForProfile(
      supabase,
      templateId,
      profile.id,
    )
    if (!template) {
      return {
        ok: false,
        error: "Template não encontrado ou não pertence a você.",
      }
    }
    await deleteExamRequestTemplate(supabase, templateId, profile.id)
    revalidatePath("/dashboard/exam-requests")
    return { ok: true }
  } catch (e) {
    console.error("[EXAM_REQUEST_TEMPLATES] delete failed", e)
    return { ok: false, error: "Erro ao excluir template. Tente novamente." }
  }
}
