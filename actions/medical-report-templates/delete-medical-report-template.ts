"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getMedicalReportTemplateByIdForProfile } from "@/modules/medical-report-templates/get-medical-report-template-by-id-for-profile"
import { deleteMedicalReportTemplate } from "@/modules/medical-report-templates/delete-medical-report-template"

export type DeleteMedicalReportTemplateResult =
  | { ok: true }
  | { ok: false; error: string }

export async function deleteMedicalReportTemplateAction(
  templateId: string,
): Promise<DeleteMedicalReportTemplateResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  if (!templateId || typeof templateId !== "string")
    return { ok: false, error: "ID do template inválido." }

  try {
    const template = await getMedicalReportTemplateByIdForProfile(
      supabase,
      templateId,
      profile.id,
    )
    if (!template) {
      return {
        ok: false,
        error: "Template não encontrado ou não pertence a você.",
      }
    }
    await deleteMedicalReportTemplate(supabase, templateId, profile.id)
    revalidatePath("/dashboard/medical-reports")
    return { ok: true }
  } catch (e) {
    console.error("[MEDICAL_REPORT_TEMPLATES] delete failed", e)
    return {
      ok: false,
      error: "Erro ao excluir template. Tente novamente.",
    }
  }
}
