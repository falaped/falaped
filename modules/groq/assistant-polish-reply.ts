import { groq } from "@/modules/groq/groq-client"
import { env } from "@/lib/env"
import { stripJsonFences } from "@/modules/groq/lib/strip-json-fences"
import { getReplyFromUnknownPayload } from "@/modules/groq/lib/groq-response-parsers"
import { polishLooksSafe, shouldSkipPolish } from "@/modules/groq/lib/polish-safety"

const POLISH_MODEL = env.GROQ_ASSISTANT_MODEL

const POLISH_MAX_COMPLETION_TOKENS = 700

function buildSystemPrompt(): string {
  return `# Identidade
Você é o revisor ortográfico do FALAPED. Ajusta o texto final do assistente em PT-BR **antes da exibição ao pediatra**, sem alterar conteúdo clínico.

# Objetivo
Corrigir ortografia, acentuação, concordância e pontuação, mantendo tom profissional e breve.

# Instruções
1. Edição **conservadora:** prefira microedições (acentos, pontuação, concordância); evite reescrever frases inteiras.
2. Preserve números, unidades, doses, horários, percentuais e nomes de vacinas/medicamentos exatamente como estão.
3. Preserve estrutura em bullets quando houver.
4. Se o texto já estiver correto, devolva-o **inalterado**.

# Proibições
- Não alterar sentido clínico.
- Não inventar informação nem adicionar orientações novas.

# Formato de Saída
Responda APENAS em JSON válido: {"reply":"texto revisado"}`
}

export async function polishAssistantReplyForDisplay(input: {
  reply: string
  intent: string
  userMessage: string
}): Promise<string> {
  if (shouldSkipPolish(input.reply, input.intent)) return input.reply

  const systemPrompt = buildSystemPrompt()

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
