import { groq } from "@/modules/groq/groq-client"
import { env } from "@/lib/env"
import { stripJsonFences } from "@/modules/groq/lib/strip-json-fences"

const CLASSIFY_MODEL = env.GROQ_ASSISTANT_MODEL

const INTENT_MAX_COMPLETION_TOKENS = 120

export async function classifyQuestionIntentByAi(input: {
  userMessage: string
}): Promise<boolean> {
  const text = input.userMessage.trim()
  if (!text) return false

  const systemPrompt = `Classifique se a mensagem do médico é uma PERGUNTA que exige resposta assistiva imediata (estratégia, explicação, orientação, dúvida), em vez de simples ditado para registro.
Responda SOMENTE em JSON válido: {"isQuestion":true} ou {"isQuestion":false}.`

  const userPrompt = JSON.stringify({
    message: text,
    guidance:
      "isQuestion=true quando houver intenção de perguntar algo ao assistente, mesmo sem '?'.",
  })

  try {
    const completion = await groq.chat.completions.create({
      model: CLASSIFY_MODEL,
      temperature: 0,
      max_tokens: INTENT_MAX_COMPLETION_TOKENS,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ""
    const cleanedRaw = stripJsonFences(raw)
    const parsed = JSON.parse(cleanedRaw || "{}") as { isQuestion?: unknown }
    return parsed.isQuestion === true
  } catch (error) {
    console.error("[GROQ] classifyQuestionIntentByAi failed", { error })
    return false
  }
}
