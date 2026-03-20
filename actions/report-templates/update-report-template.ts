"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { updateReportTemplate } from "@/modules/report-templates/update-report-template"
import { updateReportTemplateSchema } from "@/lib/schemas/report-template"
import type { ReportTemplateSection } from "@/modules/report-templates/get-report-template-by-id"

export type UpdateReportTemplateResult =
  | { ok: true }
  | { ok: false; error: string }

export async function updateReportTemplateAction(
  templateId: string,
  data: z.infer<typeof updateReportTemplateSchema>,
): Promise<UpdateReportTemplateResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }

  const parsed = updateReportTemplateSchema.safeParse(data)
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error)
    const msg = Object.values(fieldErrors).flat().find(Boolean)
    return { ok: false, error: msg ?? "Dados inválidos." }
  }

  const payload: { name?: string; sections?: ReportTemplateSection[] } = {}
  if (parsed.data.name !== undefined) payload.name = parsed.data.name
  if (parsed.data.sections !== undefined) payload.sections = parsed.data.sections

  try {
    const updated = await updateReportTemplate(supabase, templateId, profile.id, payload)
    if (!updated) return { ok: false, error: "Template não encontrado ou você não tem permissão para editá-lo." }
    revalidatePath("/dashboard/report-templates")
    revalidatePath("/dashboard/profile")
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao atualizar template. Tente novamente."
    return { ok: false, error: message }
  }
}
