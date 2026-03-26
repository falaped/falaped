import { groq } from "@/modules/groq/groq-client"
import type { ReportTemplateSection } from "@/modules/report-templates/get-report-template-by-id"
import {
  getFallbackResult,
  parseJsonResponse,
  normalizeSections,
} from "@/modules/groq/lib/template-section-parsers"

const TEMPLATE_GENERATION_MODEL = "llama-3.1-8b-instant"

const PROMPT_MAX_LENGTH = 1000

export type GenerateReportTemplateSectionsResult = {
  suggestedName: string
  sections: ReportTemplateSection[]
}

const systemPrompt = `You are a pediatric medical report template assistant. Your task is to suggest a report template (name + list of sections) from a short description in Brazilian Portuguese.

Rules:
- Return ONLY valid JSON. No markdown, no code fence, no extra text.
- JSON must have exactly two keys: "suggestedName" (string) and "sections" (array of objects).
- Each section object: "name" (string, required), "description" (string, optional). Use these exact keys.
- suggestedName: short template name in PT-BR (e.g. "Consulta de rotina", "Atestado médico").
- sections: 3 to 12 sections for the **middle** of the report only (clinical content). Do NOT include: "Dados do paciente", "Dados clínicos do paciente", "Pediatra", "Dados do pediatra", or any section that duplicates patient identification or clinical demographics — those are added automatically by the app (doctor data stay in the PDF header/footer, not as a template section).
- Section names short and clear (e.g. "Queixa principal", "Exame físico", "Conduta"). Optional description can guide what to fill in that section.
- All text in Brazilian Portuguese. Sections should be ordered logically (e.g. history, exam, conduct).
- If the user description is vague, suggest a general pediatric consultation template.`

/**
 * Generates a suggested template name and sections from a free-text prompt.
 * Used for the "Gerar com IA" flow; does not persist to DB.
 */
export async function generateReportTemplateSections(
  prompt: string,
): Promise<GenerateReportTemplateSectionsResult> {
  const trimmed = prompt.trim().slice(0, PROMPT_MAX_LENGTH)
  if (!trimmed) {
    return getFallbackResult()
  }

  const userPrompt = `User description of the report they want:

\`\`\`
${trimmed}
\`\`\`

Return the JSON object with "suggestedName" and "sections" as described in the system message.`

  const completion = await groq.chat.completions.create({
    model: TEMPLATE_GENERATION_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 2048,
  })

  const raw = completion.choices[0]?.message?.content?.trim()
  if (!raw) return getFallbackResult()

  const parsed = parseJsonResponse(raw)
  if (parsed) {
    const sections = normalizeSections(parsed.sections ?? [])
    if (sections.length > 0) {
      return {
        suggestedName: typeof parsed.suggestedName === "string" && parsed.suggestedName.trim()
          ? parsed.suggestedName.trim().slice(0, 200)
          : "Template sugerido pela IA",
        sections,
      }
    }
  }
  return getFallbackResult()
}
