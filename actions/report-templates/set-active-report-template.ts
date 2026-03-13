"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getReportTemplatesByProfileId } from "@/modules/report-templates/get-report-templates-by-profile-id"
import { updateProfile } from "@/modules/profiles/update-profile"

export type SetActiveReportTemplateResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Sets the profile's active report template (report_template_id).
 * Only allows templates that the user can use (own or project default).
 */
export async function setActiveReportTemplateAction(
  templateId: string,
): Promise<SetActiveReportTemplateResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }

  if (!templateId || typeof templateId !== "string")
    return { ok: false, error: "ID do template inválido." }

  const templates = await getReportTemplatesByProfileId(supabase, profile.id)
  const allowed = templates.some((t) => t.id === templateId)
  if (!allowed)
    return { ok: false, error: "Template não encontrado ou não disponível." }

  try {
    await updateProfile(supabase, profile.id, { report_template_id: templateId })
    revalidatePath("/dashboard/report-templates")
    revalidatePath("/dashboard/profile")
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao ativar template. Tente novamente."
    return { ok: false, error: message }
  }
}
