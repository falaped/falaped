"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { updateDiscussionTitle } from "@/modules/discussions/update-discussion-title"

const TITLE_MAX_LENGTH = 200

export type UpdateDiscussionTitleResult =
  | { ok: true }
  | { ok: false; error: string }

export async function updateDiscussionTitleAction(
  discussionId: string,
  title: string | null,
): Promise<UpdateDiscussionTitleResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conecte o WhatsApp no perfil." }

  const trimmed = title?.trim() ?? null
  if (trimmed !== null && trimmed.length > TITLE_MAX_LENGTH) {
    return { ok: false, error: "O título deve ter no máximo 200 caracteres." }
  }

  try {
    await updateDiscussionTitle(supabase, discussionId, profile.id, trimmed || null)
    revalidatePath("/dashboard/discussions")
    revalidatePath(`/dashboard/discussions/${discussionId}`)
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao atualizar título. Tente novamente."
    return { ok: false, error: message }
  }
}
