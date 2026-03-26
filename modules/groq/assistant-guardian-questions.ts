import { groq } from "@/modules/groq/groq-client"
import { env } from "@/lib/env"
import { stripJsonFences } from "@/modules/groq/lib/strip-json-fences"
import { getReplyFromUnknownPayload } from "@/modules/groq/lib/groq-response-parsers"

const GUARDIAN_QUESTIONS_MODEL = env.GROQ_ASSISTANT_MODEL

const FALLBACK_GUARDIAN_QUESTIONS =
  "Sugestões para o responsável:\n- Como está a aceitação da alimentação nas últimas 24 horas?\n- Houve mudança no número de fraldas ou no comportamento do sono?\n- Notou febre, letargia ou dificuldade para respirar?\n- Há algo novo que gostaria de relatar desde a última consulta?"

function buildGrammarSection(patientGrammarHint: string | null | undefined): string {
  const trimmed = patientGrammarHint?.trim()
  if (!trimmed) return ""
  return `
# Regra de Linguagem (obrigatória)
Aplique estritamente ao redigir as perguntas: ${trimmed}`
}

function buildSystemPrompt(patientGrammarHint: string | null | undefined): string {
  return `# Identidade
Você é o módulo de sugestões do FALAPED para conversa com responsáveis. Gera perguntas que o pediatra pode fazer ao responsável pela criança, em linguagem acessível e respeitosa.

# Instruções
1. Gere exatamente **4** itens em lista com traço (\`- \`), alinhados ao caso (puericultura, ganho de peso, amamentação, sintomas respiratórios, etc.).
2. Evite lista genérica de gripe se o caso for recém-nascido ou ganho de peso, e vice-versa.
3. Não emitir diagnósticos definitivos; apenas perguntas de esclarecimento clínico.
${buildGrammarSection(patientGrammarHint)}
# Formato de Saída
Responda APENAS em JSON válido: {"reply":"texto com os quatro traços (- )"}`
}

export async function generateGuardianQuestionSuggestions(input: {
  clinicalThreadText: string
  conversationSummary: string | null
  patientGrammarHint?: string | null
}): Promise<string> {
  const systemPrompt = buildSystemPrompt(input.patientGrammarHint)

  const userPrompt = JSON.stringify({
    conversationSummary: input.conversationSummary,
    caseNotes: input.clinicalThreadText,
    patientGrammarHint: input.patientGrammarHint ?? null,
  })

  const completion = await groq.chat.completions.create({
    model: GUARDIAN_QUESTIONS_MODEL,
    temperature: 0.35,
    max_tokens: 500,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  })

  const raw = completion.choices[0]?.message?.content?.trim() ?? ""
  const cleanedRaw = stripJsonFences(raw)

  try {
    const parsed = JSON.parse(cleanedRaw || "{}")
    const normalizedReply = getReplyFromUnknownPayload(parsed)
    if (normalizedReply) {
      return normalizedReply
    }
  } catch (error) {
    console.error("[GROQ] generateGuardianQuestionSuggestions JSON parse failed", { error })
  }

  return FALLBACK_GUARDIAN_QUESTIONS
}
