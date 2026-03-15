"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPrescriptionTemplateByIdForProfile } from "@/modules/prescription-templates/get-prescription-template-by-id-for-profile"
import { deletePrescriptionTemplate } from "@/modules/prescription-templates/delete-prescription-template"

export type DeletePrescriptionTemplateResult =
  | { ok: true }
  | { ok: false; error: string }

export async function deletePrescriptionTemplateAction(
  templateId: string,
): Promise<DeletePrescriptionTemplateResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }

  if (!templateId || typeof templateId !== "string")
    return { ok: false, error: "ID do template inválido." }

  try {
    const template = await getPrescriptionTemplateByIdForProfile(
      supabase,
      templateId,
      profile.id,
    )
    if (!template) {
      return { ok: false, error: "Template não encontrado ou não pertence a você." }
    }
    await deletePrescriptionTemplate(supabase, templateId)
    revalidatePath("/dashboard/prescription-templates")
    return { ok: true }
  } catch (e) {
    console.error("[PRESCRIPTION_TEMPLATES] delete failed", e)
    return {
      ok: false,
      error: "Erro ao excluir template. Tente novamente.",
    }
  }
}
