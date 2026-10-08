"use server"

import { revalidatePath } from "next/cache"

import { createPrescriptionTemplateSchema, type CreatePrescriptionTemplateInput } from "@/lib/schemas/prescription-template"
import { createClient } from "@/lib/supabase/server"
import { getPrescriptionTemplateByIdForProfile } from "@/modules/prescription-templates/get-prescription-template-by-id-for-profile"
import { updatePrescriptionTemplate } from "@/modules/prescription-templates/update-prescription-template"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type UpdatePrescriptionTemplateResult = { ok: true } | { ok: false; error: string }

/** Salva o nome e o conteúdo de um modelo de receita do médico (Editar em Modelos). */
export async function updatePrescriptionTemplateAction(
  id: string,
  params: CreatePrescriptionTemplateInput,
): Promise<UpdatePrescriptionTemplateResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid") return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  const parsed = createPrescriptionTemplateSchema.safeParse(params)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira o nome e os medicamentos." }

  try {
    const template = await getPrescriptionTemplateByIdForProfile(supabase, id, profile.id)
    if (!template) return { ok: false, error: "Modelo não encontrado." }
    await updatePrescriptionTemplate(supabase, id, parsed.data)
    revalidatePath("/dashboard/templates")
    return { ok: true }
  } catch (e) {
    console.error("[PRESCRIPTION_TEMPLATES] update failed", e)
    return { ok: false, error: "Erro ao salvar o modelo. Tente novamente." }
  }
}
