"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getReferralTemplateByIdForProfile } from "@/modules/referral-templates/get-referral-template-by-id-for-profile"
import { deleteReferralTemplate } from "@/modules/referral-templates/delete-referral-template"

export type DeleteReferralTemplateResult =
  | { ok: true }
  | { ok: false; error: string }

export async function deleteReferralTemplateAction(
  templateId: string,
): Promise<DeleteReferralTemplateResult> {
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
    const template = await getReferralTemplateByIdForProfile(
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
    await deleteReferralTemplate(supabase, templateId, profile.id)
    revalidatePath("/dashboard/referrals")
    return { ok: true }
  } catch (e) {
    console.error("[REFERRAL_TEMPLATES] delete failed", e)
    return {
      ok: false,
      error: "Erro ao excluir template. Tente novamente.",
    }
  }
}
