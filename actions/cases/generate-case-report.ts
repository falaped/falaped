"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getCaseById } from "@/modules/cases/get-case-by-id"
import { getReportTemplateById } from "@/modules/report-templates/get-report-template-by-id"
import { getDefaultReportTemplate } from "@/modules/report-templates/get-default-report-template"
import { createCaseReport } from "@/modules/cases/create-case-report"
import { generateCaseReport as generateCaseReportWithGroq } from "@/modules/groq/generate-case-report"
import type { CaseReportSection } from "@/modules/cases/get-case-report"

export type GenerateCaseReportResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Generates the case report from the conversation using the effective template (profile's or default).
 * Validates ownership via getCaseById; requires messages to exist.
 */
export async function generateCaseReportAction(
  caseId: string,
): Promise<GenerateCaseReportResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conecte o WhatsApp no perfil." }

  try {
    const caseDetail = await getCaseById(supabase, caseId, profile.id)
    if (!caseDetail)
      return { ok: false, error: "Caso não encontrado ou você não tem acesso." }
    if (caseDetail.messages.length === 0)
      return { ok: false, error: "Necessário ter conversa para gerar o relatório." }

    const template = profile.report_template_id
      ? await getReportTemplateById(supabase, profile.report_template_id)
      : await getDefaultReportTemplate(supabase)
    if (!template || !template.sections.length)
      return { ok: false, error: "Nenhum template de relatório configurado." }

    const messages = caseDetail.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))
    const templateSections = template.sections.map((s) => ({
      name: s.name,
      description: s.description,
    }))

    const contentBySection = await generateCaseReportWithGroq(
      messages,
      templateSections,
    )

    const sections: CaseReportSection[] = template.sections.map((s, order) => ({
      name: s.name,
      description: s.description,
      content: contentBySection[s.name]?.trim() || "Sem informação registrada.",
      order,
    }))

    await createCaseReport(supabase, {
      case_id: caseId,
      profile_id: profile.id,
      report_template_id: template.id,
      sections,
    })

    revalidatePath("/dashboard/cases")
    revalidatePath(`/dashboard/cases/${caseId}`)
    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao gerar relatório. Tente novamente."
    return { ok: false, error: message }
  }
}
