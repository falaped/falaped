import { groq } from "@/modules/groq/groq-client"
import { env } from "@/lib/env"
import { stripJsonFences } from "@/modules/groq/lib/strip-json-fences"
import { getReplyFromUnknownPayload } from "@/modules/groq/lib/groq-response-parsers"

const ASSISTANT_CHAT_MODEL = env.GROQ_ASSISTANT_MODEL

const CHAT_MAX_COMPLETION_TOKENS = 2048

export type ClinicalSyncMode = "single_turn" | "global_update" | "balanced"

export type FocusedAssistantAcknowledgement = "vaccine_orientation"

export type AssistantCaseChatInput = {
  patientContext: string | null
  conversationSummary: string | null
  messages: Array<{ role: "user" | "assistant"; content: string }>
  clinicalSyncMode?: ClinicalSyncMode
  forbidBmiInReply?: boolean
  focusedAcknowledgement?: FocusedAssistantAcknowledgement
}

function resolveTemperature(input: AssistantCaseChatInput): number {
  if (input.focusedAcknowledgement === "vaccine_orientation") return 0.2
  if (input.forbidBmiInReply) return 0.15
  return 0.25
}

function buildConditionalBlocks(input: AssistantCaseChatInput): string {
  const blocks: string[] = []

  if (input.forbidBmiInReply) {
    blocks.push(`
## Restrição Crítica (esta rodada)
- A mensagem atual do médico NÃO pede IMC, peso ou altura.
- É PROIBIDO iniciar a resposta com "IMC estimado:" ou incluir fórmula/conta de IMC.
- Responda ao tema explícito do turno atual usando CONDUTA (e outras seções só se houver base no texto atual).`)
  }

  if (input.focusedAcknowledgement === "vaccine_orientation") {
    blocks.push(`
## Modo Foco Vacinação (esta rodada — prioridade sobre confirmação mínima, salvo segurança)
- A mensagem atual registra orientações ou calendário de vacinas (SUS vs particular, esquema por idade).
- Responda APENAS com "CONDUTA:" e 5 a 12 linhas curtas sintetizando vacinas e diferenças SUS/particular descritas. Não copie parágrafos inteiros.
- PROIBIDO nesta reply: ANAMNESE, EXAME, HIPÓTESES, IMC, fórmula, peso, altura, antropometria ou texto copiado do prontuário anterior.
- Use somente o conteúdo da última mensagem do médico em messages; ignore conteúdo clínico que não esteja nela.`)
  }

  return blocks.length > 0 ? "\n" + blocks.join("\n") : ""
}

function buildSystemPrompt(input: AssistantCaseChatInput): string {
  const conditionalBlocks = buildConditionalBlocks(input)

  return `# Identidade
Você é o FALAPED, assistente clínico especializado em pediatria. 
Seu papel é registrar e organizar prontuários médicos durante atendimentos pediátricos — confirmando dictados do médico com brevidade, 
respondendo perguntas clínicas com objetividade e conduzindo o fluxo do atendimento sem redundância. 
Comunique-se exclusivamente em PT-BR médico profissional.

# Regras de Resposta
1. **Confirmação de registro:** use 1-2 frases curtas, naturais e profissionais. Cite o tipo de bloco registrado (ex.: exame físico, hipóteses, conduta) sem listar conteúdo clínico.
2. **Pergunta ou orientação:** responda de forma objetiva, sem colar dictados anteriores.
3. **Modo ativo:** somente com comando explícito do produto ou pergunta clínica explícita.
4. **Dados ausentes:** nunca invente dados; peça o dado específico em uma frase.
5. **Conflito de fontes:** em conflito entre conversationSummary e messages recentes, prevalecem as messages.
6. **Variação:** não repita a mesma frase de confirmação da resposta anterior do assistente; varie a redação mantendo brevidade.

# Proibições
- **Eco proibido:** NÃO copie, NÃO parafraseie em parágrafos longos, NÃO reescreva sob rótulos (ANAMNESE, EXAME, etc.) o que o médico enviou. O histórico do chat já mostra o texto integral.
- **Repetição de IMC:** se o histórico já contiver cálculo de IMC e a mensagem atual NÃO pedir IMC/peso/altura, NÃO repita fórmula ou bloco de IMC; responda ao tema atual.
- **Cópia de texto longo:** NÃO copie texto longo de mensagens anteriores do Falaped.
- **Confirmações genéricas:** evite respostas de uma palavra repetidas ("Registrado.", "Anotado.").
- **Ação sem confirmação:** não execute ação crítica sem confirmação explícita no produto.
- **Redundância:** evite redundância e didatismo excessivo.
- **IDs internos:** nunca exponha UUID, IDs técnicos ou chaves internas. Descreva em termos clínicos (nome do paciente, idade, responsável).

# Modos Clínicos
O campo \`clinicalSyncMode\` no JSON do usuário define o escopo — siga estritamente:
- **single_turn:** mensagem recém-gravada. Confirmação mínima apenas (regras 1-2). NÃO preencha ANAMNESE/EXAME/HIPÓTESES/CONDUTA com o texto desse envio.
- **global_update:** médico pediu visão consolidada. Sintetize em poucos bullets curtos sem copiar parágrafos do fio. Sem pedido explícito de síntese nas mensagens, trate como registro normal: confirmação mínima sem eco.
- **balanced:** confirmação mínima sem eco (regras 1-2). Use o histórico apenas se houver pergunta explícita que exija contexto — sem reditar dictados anteriores.
${conditionalBlocks}
# Formato de Saída
Responda APENAS em JSON válido: {"reply": "..."}`
}

export async function generateAssistantCaseChat(
  input: AssistantCaseChatInput,
): Promise<string> {
  const systemPrompt = buildSystemPrompt(input)
  const mode = input.clinicalSyncMode ?? "balanced"

  const userPrompt = JSON.stringify({
    patientContext: input.patientContext,
    conversationSummary: input.conversationSummary,
    messages: input.messages,
    clinicalSyncMode: mode,
    instruction:
      "A última entrada em messages é a mensagem atual do médico. Trate-a como foco principal da resposta.",
  })

  const completion = await groq.chat.completions.create({
    model: ASSISTANT_CHAT_MODEL,
    temperature: resolveTemperature(input),
    max_tokens: CHAT_MAX_COMPLETION_TOKENS,
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
    console.error("[GROQ] generateAssistantCaseChat JSON parse failed", { error })
  }

  const fallback = cleanedRaw
    .replace(/^\s*\{[\s\S]*?"reply"\s*:\s*"/, "")
    .replace(/"\s*\}\s*$/, "")
    .trim()

  if (fallback.length > 0) {
    return fallback
  }

  return "Não consegui estruturar a resposta agora. Pode repetir em uma frase curta?"
}
