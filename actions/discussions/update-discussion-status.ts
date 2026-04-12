"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { updateDiscussionStatus } from "@/modules/discussions/update-discussion-status"

export type UpdateDiscussionStatusResult =
  | { ok: true }
  | { ok: false; error: string }

export async function updateDiscussionStatusAction(
  discussionId: string,
  status: "active" | "closed",
): Promise<UpdateDiscussionStatusResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  try {
    await updateDiscussionStatus(supabase, discussionId, profile.id, status)
    revalidatePath("/dashboard/discussions")
    revalidatePath(`/dashboard/discussions/${discussionId}`)
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao atualizar status da discussão. Tente novamente."
    return { ok: false, error: message }
  }
}
