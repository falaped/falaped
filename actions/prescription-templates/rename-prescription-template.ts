"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { getPrescriptionTemplateByIdForProfile } from "@/modules/prescription-templates/get-prescription-template-by-id-for-profile"
import { updatePrescriptionTemplate } from "@/modules/prescription-templates/update-prescription-template"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type RenamePrescriptionTemplateResult = { ok: true } | { ok: false; error: string }

const schema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Dê um nome ao modelo.").max(120, "Use no máximo 120 caracteres."),
})

/** Renomeia um modelo de receita do médico (tela Modelos). */
export async function renamePrescriptionTemplateAction(
  id: string,
  name: string,
): Promise<RenamePrescriptionTemplateResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid") return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  const parsed = schema.safeParse({ id, name })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nome inválido." }

  try {
    const template = await getPrescriptionTemplateByIdForProfile(supabase, parsed.data.id, profile.id)
    if (!template) return { ok: false, error: "Modelo não encontrado." }
    await updatePrescriptionTemplate(supabase, parsed.data.id, { name: parsed.data.name })
    revalidatePath("/dashboard/templates")
    return { ok: true }
  } catch (e) {
    console.error("[PRESCRIPTION_TEMPLATES] rename failed", e)
    return { ok: false, error: "Erro ao renomear o modelo. Tente novamente." }
  }
}
