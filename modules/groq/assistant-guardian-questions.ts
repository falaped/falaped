import { groq } from "@/modules/groq/groq-client"
import { env } from "@/lib/env"
import { stripJsonFences } from "@/modules/groq/lib/strip-json-fences"
import { getReplyFromUnknownPayload } from "@/modules/groq/lib/groq-response-parsers"

const GUARDIAN_QUESTIONS_MODEL = env.GROQ_ASSISTANT_MODEL

const FALLBACK_GUARDIAN_QUESTIONS =
  "Sugestões para o responsável:\n- Como está a aceitação da alimentação nas últimas 24 horas?\n- Houve mudança no número de fraldas ou no comportamento do sono?\n- Notou febre, letargia ou dificuldade para respirar?\n- Há algo novo que gostaria de relatar desde a última consulta?"

export async function generateGuardianQuestionSuggestions(input: {
  clinicalThreadText: string
  conversationSummary: string | null
  patientGrammarHint?: string | null
}): Promise<string> {
  const grammarBlock =
    input.patientGrammarHint && input.patientGrammarHint.trim().length > 0
      ? `\nRegra obrigatória de linguagem: ${input.patientGrammarHint.trim()}`
      : ""

  const systemPrompt = `Você sugere perguntas em PT-BR que o pediatra pode fazer ao responsável pela criança (linguagem acessível, respeitosa).
Gere exatamente 4 itens em formato de lista com traço (- ), alinhados ao caso descrito (puericultura, ganho de peso, amamentação, sintomas respiratórios, etc.).
Evite lista genérica de gripe se o caso for recém-nascido ou ganho de peso, e vice-versa.
Sem diagnósticos definitivos; apenas perguntas de esclarecimento clínico.${grammarBlock}
Responda APENAS em JSON válido: {"reply":"texto com os traços"}`

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
