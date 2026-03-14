import { groq } from "./groq-client"
import type { ReportTemplateSection } from "@/modules/report-templates/get-report-template-by-id"

const MODEL = "llama-3.1-8b-instant"

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
- sections: 3 to 12 sections typical of pediatric clinical reports. Section names short and clear (e.g. "Queixa principal", "Exame físico", "Conduta"). Optional description can guide what to fill in that section.
- All text in Brazilian Portuguese. Sections should be ordered logically (e.g. identification, history, exam, conduct).
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
    model: MODEL,
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

function getFallbackResult(): GenerateReportTemplateSectionsResult {
  return {
    suggestedName: "Template sugerido pela IA",
    sections: [
      { name: "Dados do paciente", description: "Identificação e dados cadastrais" },
      { name: "Queixa principal", description: "Motivo da consulta" },
      { name: "Conduta", description: "Conduta e orientações" },
    ],
  }
}

function parseJsonResponse(raw: string): { suggestedName?: string; sections?: unknown[] } | null {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim()
  try {
    const obj = JSON.parse(cleaned)
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      return obj as { suggestedName?: string; sections?: unknown[] }
    }
  } catch {
    // ignore
  }
  return null
}

function normalizeSections(sections: unknown[]): ReportTemplateSection[] {
  const result: ReportTemplateSection[] = []
  const seen = new Set<string>()
  for (const item of sections) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue
    const name = (item as { name?: unknown }).name
    const description = (item as { description?: unknown }).description
    const nameStr = typeof name === "string" ? name.trim().slice(0, 200) : ""
    if (!nameStr || seen.has(nameStr)) continue
    seen.add(nameStr)
    result.push({
      name: nameStr,
      description:
        typeof description === "string" && description.trim()
          ? description.trim().slice(0, 2000)
          : undefined,
    })
  }
  return result
}
