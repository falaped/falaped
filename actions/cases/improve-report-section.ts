"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getCaseById } from "@/modules/cases/get-case-by-id"
import { improveReportSection as improveReportSectionWithGroq } from "@/modules/groq/improve-report-section"

export type ImproveReportSectionResult =
  | { ok: true; improvedText: string }
  | { ok: false; error: string }

/**
 * Returns improved text for a single report section (Groq). Only the section content is sent.
 * Validates ownership via getCaseById. Frontend should then call updateCaseReportAction with the updated sections.
 */
export async function improveReportSectionAction(
  caseId: string,
  sectionName: string,
  sectionDescription: string | undefined,
  currentContent: string,
): Promise<ImproveReportSectionResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conecte o WhatsApp no perfil." }

  try {
    const caseDetail = await getCaseById(supabase, caseId, profile.id)
    if (!caseDetail)
      return { ok: false, error: "Caso não encontrado ou você não tem acesso." }

    const improvedText = await improveReportSectionWithGroq({
      sectionName,
      sectionDescription: sectionDescription ?? undefined,
      currentContent,
    })

    return { ok: true, improvedText }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao melhorar texto. Tente novamente."
    return { ok: false, error: message }
  }
}
