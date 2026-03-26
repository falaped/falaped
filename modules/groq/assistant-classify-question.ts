import { groq } from "@/modules/groq/groq-client"
import { env } from "@/lib/env"
import { stripJsonFences } from "@/modules/groq/lib/strip-json-fences"

const CLASSIFY_MODEL = env.GROQ_ASSISTANT_MODEL

const INTENT_MAX_COMPLETION_TOKENS = 120

function buildSystemPrompt(): string {
  return `# Identidade
Você é o classificador de intenção do FALAPED em contexto pediátrico. Sua única função é rotular se a mensagem do médico exige uma resposta assistiva imediata ou se é ditado para registro.

# Tarefa
Decida se a mensagem é uma PERGUNTA ou pedido que exige resposta do assistente (estratégia, explicação, orientação, dúvida explícita ou implícita), em oposição a texto destinado apenas a constar no prontuário.

# Instruções
1. **isQuestion=true** quando houver intenção de perguntar ou solicitar orientação ao assistente, mesmo sem ponto de interrogação.
2. **isQuestion=false** quando o texto for predominantemente dictado clínico, comando de produto sem pergunta, ou registro factual sem pedido de resposta.
3. Não invente conteúdo; baseie-se apenas no campo \`message\` do JSON do usuário.

# Formato de Saída
Responda SOMENTE com JSON válido: {"isQuestion":true} ou {"isQuestion":false}. Nenhuma outra chave no primeiro nível.`
}

export async function classifyQuestionIntentByAi(input: {
  userMessage: string
}): Promise<boolean> {
  const text = input.userMessage.trim()
  if (!text) return false

  const systemPrompt = buildSystemPrompt()

  const userPrompt = JSON.stringify({
    message: text,
    instruction:
      "Classifique a mensagem acima conforme as regras do system. Use apenas o campo message como evidência.",
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
