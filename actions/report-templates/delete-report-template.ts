"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { deleteReportTemplate } from "@/modules/report-templates/delete-report-template"

export type DeleteReportTemplateResult =
  | { ok: true }
  | { ok: false; error: string }

export async function deleteReportTemplateAction(
  templateId: string,
): Promise<DeleteReportTemplateResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }

  if (!templateId || typeof templateId !== "string")
    return { ok: false, error: "ID do template inválido." }

  try {
    const deleted = await deleteReportTemplate(supabase, templateId, profile.id)
    if (!deleted)
      return { ok: false, error: "Template não encontrado, não pertence a você ou é o padrão do projeto." }
    revalidatePath("/dashboard/report-templates")
    revalidatePath("/dashboard/profile")
    return { ok: true }
  } catch (e) {
    const raw = e instanceof Error ? e.message : ""
    const isFkViolation =
      /foreign key constraint|report_template_id_fkey|case_reports_report_template_id_fkey/i.test(
        raw,
      )
    const message = isFkViolation
      ? "Não é possível excluir um template ativo ou que já foi usado em relatórios."
      : raw || "Erro ao excluir template. Tente novamente."
    return { ok: false, error: message }
  }
}
