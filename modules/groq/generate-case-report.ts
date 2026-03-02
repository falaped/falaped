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

/** Patient data sent to the LLM for report sections (identity, demographics, clinical). Prefer over conversation; use "Não informado" only when not provided and not in conversation. */
export type PatientReportContext = {
  name?: string | null
  birth_date?: string | null
  responsible?: string | null
  contact_phone?: string | null
  sex?: string | null
  legal_guardian?: string | null
  blood_type?: string | null
  weight?: string | null
  height?: string | null
  head_circumference?: string | null
  allergies?: string | null
  current_medications?: string | null
  medical_history?: string | null
}

function buildPatientDataBlock(ctx: PatientReportContext): string {
  const lines: string[] = []
  if (ctx.name?.trim()) lines.push(`Nome: ${ctx.name.trim()}`)
  if (ctx.birth_date?.trim()) lines.push(`Data de nascimento: ${ctx.birth_date.trim()}`)
  if (ctx.responsible?.trim()) lines.push(`Responsável: ${ctx.responsible.trim()}`)
  if (ctx.contact_phone?.trim()) lines.push(`Telefone de contato: ${ctx.contact_phone.trim()}`)
  if (ctx.sex?.trim()) lines.push(`Sexo: ${ctx.sex.trim()}`)
  if (ctx.legal_guardian?.trim()) lines.push(`Responsável legal: ${ctx.legal_guardian.trim()}`)
  if (ctx.blood_type?.trim()) lines.push(`Tipo sanguíneo: ${ctx.blood_type.trim()}`)
  if (ctx.weight?.trim()) lines.push(`Peso: ${ctx.weight.trim()}`)
  if (ctx.height?.trim()) lines.push(`Altura: ${ctx.height.trim()}`)
  if (ctx.head_circumference?.trim()) lines.push(`Perímetro cefálico: ${ctx.head_circumference.trim()}`)
  if (ctx.allergies?.trim()) lines.push(`Alergias: ${ctx.allergies.trim()}`)
  if (ctx.current_medications?.trim()) lines.push(`Medicamentos em uso: ${ctx.current_medications.trim()}`)
  if (ctx.medical_history?.trim()) lines.push(`Histórico médico: ${ctx.medical_history.trim()}`)
  if (lines.length === 0) return ""
  return `Registered patient data (use these when filling the report; prefer over conversation extraction; use "Não informado" only for fields not provided here and not found in the conversation):\n${lines.map((l) => `- ${l}`).join("\n")}`
}

/**
 * Generates report content per section from a case conversation using the LLM.
 * When patientContext is provided, the model should use it for patient-identity sections (e.g. title, patient data) before conversation extraction; fallback to "Não informado" only when neither source has the data.
 * Returns a record mapping each section name to its generated text.
 * Empty or missing sections get "Sem informação registrada.".
 */
export async function generateCaseReport(
  messages: ConversationMessage[],
  sections: TemplateSectionInput[],
  patientContext: PatientReportContext | null = null,
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

  const patientBlock = patientContext ? buildPatientDataBlock(patientContext) : ""
  const priorityRule =
    "Data priority for sections about patient identity or demographics: use registered patient data first when provided, then information from the conversation, then \"Não informado\" only for fields still missing."
  const patientSectionRule =
    "When filling a section that lists patient data (e.g. 'Dados do Paciente'): (1) Include only fields that have real data from the registered patient block or the conversation; omit any field that would be 'Não informado'—do not list it. (2) Format with one field per line for readability, e.g. 'Nome: Antonio Tacconi\\nData de nascimento: 01/02/2026\\nResponsável: Bárbara Tacconi\\n...' Use line breaks so long text does not stay on a single line."

  const systemPrompt = `You are a pediatric medical report assistant. Your task is to extract and structure information from a conversation between the pediatrician (user) and the Falaped assistant (assistant) into a clinical report. The patient is the child under care; the report is for the pediatrician's use.

Rules:
- Output ONLY valid JSON. No markdown, no code fence, no extra text.
- JSON must have exactly one key per section name below; each value is the report text for that section in Brazilian Portuguese.
- Use correct medical Portuguese, grammar, and pediatric terminology. Fix dosages and drug names if mentioned.
- If the conversation has no information for a section, use the value "Sem informação registrada."
- Keep each section concise but complete. Structure with short paragraphs or bullets when appropriate.
${patientBlock ? `\n${priorityRule}\n${patientSectionRule}\n\n${patientBlock}\n` : ""}

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
