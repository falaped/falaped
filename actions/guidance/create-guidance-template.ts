"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { createGuidanceTemplate } from "@/modules/guidance/create-guidance-template"
import { guidanceTemplateSchema } from "@/lib/schemas/guidance"

export type CreateGuidanceTemplateResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

export async function createGuidanceTemplateAction(params: {
  milestone: string
  body: string
  sortOrder?: number
}): Promise<CreateGuidanceTemplateResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsed = guidanceTemplateSchema.safeParse(params)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dados inválidos."
    return { ok: false, error: msg }
  }

  try {
    const id = await createGuidanceTemplate(supabase, {
      profileId: profile.id,
      milestone: parsed.data.milestone,
      body: parsed.data.body,
      sortOrder: parsed.data.sortOrder,
    })
    revalidatePath("/dashboard/guidance")
    return { ok: true, id }
  } catch (e) {
    console.error("[GUIDANCE] create template failed", e)
    return { ok: false, error: "Erro ao salvar marco. Tente novamente." }
  }
}
