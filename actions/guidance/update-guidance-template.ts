"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { updateGuidanceTemplate } from "@/modules/guidance/update-guidance-template"
import { guidanceTemplateSchema } from "@/lib/schemas/guidance"

export type UpdateGuidanceTemplateResult =
  | { ok: true }
  | { ok: false; error: string }

export async function updateGuidanceTemplateAction(params: {
  id: string
  milestone: string
  body: string
  sortOrder?: number
}): Promise<UpdateGuidanceTemplateResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  if (!params.id || typeof params.id !== "string")
    return { ok: false, error: "ID do marco inválido." }

  const parsed = guidanceTemplateSchema.safeParse({
    milestone: params.milestone,
    body: params.body,
    sortOrder: params.sortOrder,
  })
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dados inválidos."
    return { ok: false, error: msg }
  }

  try {
    await updateGuidanceTemplate(supabase, params.id, profile.id, {
      milestone: parsed.data.milestone,
      body: parsed.data.body,
      sortOrder: parsed.data.sortOrder,
    })
    revalidatePath("/dashboard/guidance")
    return { ok: true }
  } catch (e) {
    console.error("[GUIDANCE] update template failed", e)
    return { ok: false, error: "Erro ao atualizar marco. Tente novamente." }
  }
}
