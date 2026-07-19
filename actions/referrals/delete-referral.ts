"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { deleteReferral } from "@/modules/referrals/delete-referral"

export type DeleteReferralResult = { ok: true } | { ok: false; error: string }

export async function deleteReferralAction(
  referralId: string,
  pdfStoragePath: string | null,
): Promise<DeleteReferralResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  if (!referralId || typeof referralId !== "string")
    return { ok: false, error: "ID do encaminhamento inválido." }

  try {
    await deleteReferral(supabase, referralId, profile.id, pdfStoragePath)
    revalidatePath("/dashboard/referrals")
    return { ok: true }
  } catch (e) {
    console.error("[REFERRALS] delete failed", e)
    return {
      ok: false,
      error: "Erro ao excluir encaminhamento. Tente novamente.",
    }
  }
}
