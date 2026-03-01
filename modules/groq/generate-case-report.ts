import { groq } from "./groq-client"

const MODEL = "openai/gpt-oss-120b"

export type ConversationMessage = {
  role: "user" | "assistant"
  content: string
}

export type TemplateSectionInput = {
  name: string
  description?: string
}

/**
 * Generates report content per section from a case conversation using the LLM.
 * Returns a record mapping each section name to its generated text.
 * Empty or missing sections get "Sem informação registrada.".
 */
export async function generateCaseReport(
  messages: ConversationMessage[],
  sections: TemplateSectionInput[],
): Promise<Record<string, string>> {
  if (sections.length === 0) return {}

  const sectionList = sections
    .map(
      (s) =>
        `- "${s.name}"${s.description ? `: ${s.description}` : ""}`,
    )
    .join("\n")

  const conversationText = messages
    .map((m) => `[${m.role}]: ${m.content}`)
    .join("\n\n")

  const systemPrompt = `You are a pediatric medical report assistant. Your task is to extract and structure information from a conversation between the pediatrician (user) and the Falaped assistant (assistant) into a clinical report. The patient is the child under care; the report is for the pediatrician's use.

Rules:
- Output ONLY valid JSON. No markdown, no code fence, no extra text.
- JSON must have exactly one key per section name below; each value is the report text for that section in Brazilian Portuguese.
- Use correct medical Portuguese, grammar, and pediatric terminology. Fix dosages and drug names if mentioned.
- If the conversation has no information for a section, use the value "Sem informação registrada."
- Keep each section concise but complete. Structure with short paragraphs or bullets when appropriate.

Sections to fill (use these exact keys):
${sectionList}

Example shape: {"Tipo de Consulta": "Consulta de rotina.", "Queixa Principal": "Febre há 3 dias.", ...}`

  const userPrompt = `Conversation:

\`\`\`
${conversationText}
\`\`\`

Return the JSON object with one key per section listed in the system message. Use the exact section names as keys.`

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 4096,
  })

  const raw = completion.choices[0]?.message?.content?.trim()
  if (!raw) {
    return Object.fromEntries(
      sections.map((s) => [s.name, "Sem informação registrada."]),
    )
  }

  const parsed = parseJsonSectionContent(raw)
  const result: Record<string, string> = {}
  for (const s of sections) {
    const value = parsed[s.name]
    result[s.name] =
      typeof value === "string" && value.trim()
        ? value.trim()
        : "Sem informação registrada."
  }
  return result
}

function parseJsonSectionContent(raw: string): Record<string, string> {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```\s*$/i, "").trim()
  try {
    const obj = JSON.parse(cleaned)
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      return obj as Record<string, string>
    }
  } catch {
    // fallback: try to extract key-value pairs from first-level keys
  }
  return {}
}
