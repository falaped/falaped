"use server"

import { createClient } from "@/lib/supabase/server"
import { env } from "@/lib/env"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { generateReportTemplateSections as generateWithGroq } from "@/modules/groq/generate-report-template-sections"
import type { ReportTemplateSection } from "@/modules/report-templates/get-report-template-by-id"

const PROMPT_MAX_LENGTH = 1000

export type GenerateReportTemplateSectionsActionResult =
  | { ok: true; suggestedName: string; sections: ReportTemplateSection[] }
  | { ok: false; error: string }

export async function generateReportTemplateSectionsAction(
  prompt: string,
): Promise<GenerateReportTemplateSectionsActionResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }

  if (!env.GROQ_API_KEY?.trim()) {
    return { ok: false, error: "Geração por IA não está configurada." }
  }

  const trimmed = prompt?.trim() ?? ""
  if (!trimmed) {
    return { ok: false, error: "Descreva o tipo de relatório que deseja." }
  }
  if (trimmed.length > PROMPT_MAX_LENGTH) {
    return {
      ok: false,
      error: `Use no máximo ${PROMPT_MAX_LENGTH} caracteres na descrição.`,
    }
  }

  try {
    const result = await generateWithGroq(trimmed)
    if (!result.sections.length) {
      return {
        ok: false,
        error: "Não foi possível gerar seções. Tente outra descrição.",
      }
    }
    return {
      ok: true,
      suggestedName: result.suggestedName,
      sections: result.sections,
    }
  } catch (e) {
    console.error("[REPORT_TEMPLATES] generateReportTemplateSections failed", e)
    return {
      ok: false,
      error: "Erro ao gerar sugestão. Tente novamente.",
    }
  }
}
