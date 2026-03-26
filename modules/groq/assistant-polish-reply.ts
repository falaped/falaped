import { groq } from "@/modules/groq/groq-client"
import { env } from "@/lib/env"
import { stripJsonFences } from "@/modules/groq/lib/strip-json-fences"
import { getReplyFromUnknownPayload } from "@/modules/groq/lib/groq-response-parsers"
import { polishLooksSafe, shouldSkipPolish } from "@/modules/groq/lib/polish-safety"

const POLISH_MODEL = env.GROQ_ASSISTANT_MODEL

const POLISH_MAX_COMPLETION_TOKENS = 700

export async function polishAssistantReplyForDisplay(input: {
  reply: string
  intent: string
  userMessage: string
}): Promise<string> {
  if (shouldSkipPolish(input.reply, input.intent)) return input.reply

  const systemPrompt = `Você revisa texto final do assistente em PT-BR antes da exibição ao pediatra.
Objetivo: corrigir ortografia, acentuação, concordância e pontuação, mantendo tom profissional e breve.

REGRAS CRÍTICAS:
- Não alterar sentido clínico, não inventar informação, não adicionar orientações novas.
- Corrigir de forma CONSERVADORA: prefira microedições (acentos, pontuação, concordância) e evite reescrever frases.
- Preservar números, unidades, doses, horários, percentuais e nomes de vacinas/medicamentos exatamente como estão.
- Preservar estrutura em bullets quando houver.
- Se o texto já estiver bom, devolva igual.
- Responda APENAS em JSON válido: {"reply":"texto revisado"}`

  const userPrompt = JSON.stringify({
    intent: input.intent,
    userMessage: input.userMessage,
    replyToPolish: input.reply,
  })

  try {
    const completion = await groq.chat.completions.create({
      model: POLISH_MODEL,
      temperature: 0,
      max_tokens: POLISH_MAX_COMPLETION_TOKENS,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ""
    const cleanedRaw = stripJsonFences(raw)
    const parsed = JSON.parse(cleanedRaw || "{}")
    const polished = getReplyFromUnknownPayload(parsed)
    if (!polished || polished.trim().length === 0) return input.reply
    if (!polishLooksSafe(input.reply, polished)) return input.reply
    return polished
  } catch (error) {
    console.error("[GROQ] polishAssistantReplyForDisplay failed", { error })
    return input.reply
  }
}
