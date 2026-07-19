"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { createExamPanel } from "@/modules/exam-panels/create-exam-panel"

const createExamPanelSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do painel."),
  panelItems: z
    .array(z.string().trim().min(1))
    .min(1, "Adicione pelo menos um exame ao painel."),
})

export type CreateExamPanelResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

export async function createExamPanelAction(params: {
  name: string
  panelItems: string[]
}): Promise<CreateExamPanelResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const parsed = createExamPanelSchema.safeParse(params)
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors?.name?.[0] ??
      parsed.error.flatten().fieldErrors?.panelItems?.[0] ??
      parsed.error.message
    return { ok: false, error: msg }
  }

  try {
    const id = await createExamPanel(supabase, {
      profileId: profile.id,
      name: parsed.data.name,
      panelItems: parsed.data.panelItems,
    })
    revalidatePath("/dashboard/exam-requests")
    return { ok: true, id }
  } catch (e) {
    console.error("[EXAM_PANELS] create failed", e)
    return { ok: false, error: "Erro ao salvar painel. Tente novamente." }
  }
}
