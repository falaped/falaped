"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { updateExamPanel } from "@/modules/exam-panels/update-exam-panel"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { createExamPanelSchema } from "@/lib/schemas/exam-panel"

export type UpdateExamPanelResult = { ok: true } | { ok: false; error: string }

/** Salva o nome e os exames de um painel do médico (Editar em Modelos). */
export async function updateExamPanelAction(
  id: string,
  params: { name: string; panelItems: string[] },
): Promise<UpdateExamPanelResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid") return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }
  if (!id) return { ok: false, error: "Modelo inválido." }

  const parsed = createExamPanelSchema.safeParse(params)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira o nome e os exames." }

  try {
    await updateExamPanel(supabase, id, profile.id, parsed.data)
    revalidatePath("/dashboard/templates")
    return { ok: true }
  } catch (e) {
    console.error("[EXAM_PANELS] update failed", e)
    return { ok: false, error: "Erro ao salvar o modelo. Tente novamente." }
  }
}
