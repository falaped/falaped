import { groq } from "@/modules/groq/groq-client"

const REPORT_IMPROVEMENT_MODEL = "llama-3.1-8b-instant"

export type ImproveSectionInput = {
  sectionName: string
  sectionDescription?: string
  currentContent: string
}

/**
 * Returns an improved version of the given section text: more professional,
 * clear Brazilian Portuguese, and consistent with pediatric context.
 * Only the section being edited or improved is sent; no conversation context.
 */
export async function improveReportSection(
  input: ImproveSectionInput,
): Promise<string> {
  const { sectionName, sectionDescription, currentContent } = input

  const systemPrompt = `You are a pediatric medical report editor. Your task is to improve a single section of a clinical report.

Rules:
- Return ONLY the improved section text. No preamble, no "Here is the improved text:", no JSON, no markdown.
- Write in Brazilian Portuguese, professional and clear. Use correct medical and pediatric terminology.
- Preserve all factual content (dosages, dates, symptoms). Fix grammar and style.
- If the current content is empty or "Sem informação registrada.", return "Sem informação registrada."
- Keep the response concise (one or a few short paragraphs).`

  const userPrompt = `Section: "${sectionName}"${sectionDescription ? `\nDescription: ${sectionDescription}` : ""}

Current section content:
\`\`\`
${currentContent || "(empty)"}
\`\`\`

Return only the improved section text, nothing else.`

  const completion = await groq.chat.completions.create({
    model: REPORT_IMPROVEMENT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 1024,
  })

  const text = completion.choices[0]?.message?.content?.trim()
  return text ?? currentContent
}
