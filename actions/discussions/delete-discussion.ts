"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { deleteDiscussion } from "@/modules/discussions/delete-discussion"

export type DeleteDiscussionResult =
  | { ok: true }
  | { ok: false; error: string }

export async function deleteDiscussionAction(
  discussionId: string,
): Promise<DeleteDiscussionResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  try {
    await deleteDiscussion(supabase, discussionId, profile.id)
    revalidatePath("/dashboard/discussions")
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao excluir discussão. Tente novamente."
    return { ok: false, error: message }
  }
}
