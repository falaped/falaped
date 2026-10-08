"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { renameExamPanel } from "@/modules/exam-panels/rename-exam-panel"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type RenameExamPanelResult = { ok: true } | { ok: false; error: string }

const schema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Dê um nome ao painel.").max(120, "Use no máximo 120 caracteres."),
})

/** Renomeia um painel de exames do médico (tela Modelos). */
export async function renameExamPanelAction(id: string, name: string): Promise<RenameExamPanelResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid") return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  const parsed = schema.safeParse({ id, name })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nome inválido." }

  try {
    await renameExamPanel(supabase, parsed.data.id, profile.id, parsed.data.name)
    revalidatePath("/dashboard/templates")
    return { ok: true }
  } catch (e) {
    console.error("[EXAM_PANELS] rename failed", e)
    return { ok: false, error: "Erro ao renomear o painel. Tente novamente." }
  }
}
