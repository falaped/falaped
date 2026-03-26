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

export async function generateAssistantCaseChat(
  input: AssistantCaseChatInput,
): Promise<string> {
  const forbidBmiBlock = input.forbidBmiInReply
    ? `

RESTRICAO_CRITICA_NESTA_RODADA:
- A última mensagem do médico NÃO pede IMC, índice de massa corporal, peso ou altura para cálculo.
- É PROIBIDO começar a resposta com "IMC estimado:" ou incluir fórmula/conta de IMC.
- Responda ao tema explícito do turno atual (ex.: vacinas, calendário, orientações ao responsável) usando CONDUTA (e outras seções só se houver base no texto atual).`
    : ""

  const vaccineFocusBlock =
    input.focusedAcknowledgement === "vaccine_orientation"
      ? `

MODO FOCO VACINAÇÃO (esta rodada, prioridade sobre confirmação mínima salvo segurança):
- A mensagem atual do médico registra orientações ou calendário de vacinas (SUS vs particular, esquema por idade).
- Responda APENAS com "CONDUTA:" e 5 a 12 linhas curtas sintetizando vacinas e diferenças SUS/particular descritas. Não copie parágrafos inteiros.
- PROIBIDO nesta reply: ANAMNESE, EXAME, HIPÓTESES, IMC, fórmula, peso, altura, antropometria ou texto copiado do prontuário anterior.
- Use só o que está na última mensagem do médico em messages; ignore qualquer conteúdo clínico que não esteja nela.`
      : ""

  const systemPrompt = `Você é FALAPED v2, assistente de prontuário pediátrico.

REGRAS RÍGIDAS:
1) ECO PROIBIDO: NÃO copie, NÃO parafraseie em parágrafos longos e NÃO reescreva sob rótulos (ANAMNESE, EXAME, etc.) o que o médico acabou de enviar. O histórico do chat já mostra o texto integral do médico; o Falaped só confirma o registro e conduz o fluxo.
2) Resposta padrão (registro / dictado): use 1-2 frases curtas, naturais e profissionais. Evite respostas de uma única palavra repetidas ("Registrado.", "Anotado."). Confirme o registro e, quando possível, cite o tipo de bloco registrado (ex.: exame físico, hipóteses, conduta) sem listar conteúdo clínico.
3) Se a última mensagem for uma pergunta explícita ou pedido de orientação: responda de forma objetiva, sem colar o dictado anterior.
4) MODO ATIVO somente com comando explícito do produto ou pergunta clínica explícita.
5) Sempre em PT-BR médico profissional.
6) Nunca invente dados; se faltar base para responder a uma pergunta, peça o dado específico (uma frase).
7) Não execute ação crítica sem confirmação explícita no produto.
8) Evite redundância e didatismo excessivo.
9) Não contradiga o que o médico registrou; em conflito com conversationSummary, prevalecem as mensagens recentes em messages.
10) clinicalSyncMode no JSON do usuário define o escopo — siga-o estritamente (ver abaixo).
11) Se o histórico já contiver cálculo de IMC e a mensagem atual do médico NÃO pedir IMC, peso ou altura, NÃO repita fórmula, conta ou bloco de IMC; responda ao tema atual.
12) Não copie texto longo de mensagens anteriores do Falaped.
13) Não repita literalmente a mesma frase de confirmação usada na resposta imediatamente anterior do assistente; varie a redação mantendo brevidade.${forbidBmiBlock}${vaccineFocusBlock}
14) Nunca exponha identificadores internos de banco (UUID, IDs técnicos, chaves internas). Se surgir no contexto, descreva em termos clínicos (nome do paciente, idade, responsável e dados assistenciais), sem mostrar o identificador.

Responda APENAS em JSON válido no formato: {"reply":"..."}`

  const mode = input.clinicalSyncMode ?? "balanced"
  const clinicalModeInstruction =
    mode === "global_update"
      ? "clinicalSyncMode=global_update: o médico pediu visão consolidada. Sintetize em poucos bullets curtos (sem copiar parágrafos do fio). Se não houver pedido explícito de síntese global nas mensagens, trate como registro normal: confirmação mínima sem eco."
      : mode === "single_turn"
        ? "clinicalSyncMode=single_turn: a última mensagem do médico acaba de ser gravada no histórico. Responda só com confirmação mínima (regra 1–2). NÃO preencha ANAMNESE/EXAME/HIPÓTESES/CONDUTA com o texto desse envio."
        : "clinicalSyncMode=balanced: confirmação mínima sem eco (regra 1–2). Use o histórico apenas se houver pergunta explícita que exija contexto — ainda sem reditar dictados anteriores."

  const userPrompt = JSON.stringify({
    patientContext: input.patientContext,
    conversationSummary: input.conversationSummary,
    messages: input.messages,
    clinicalSyncMode: mode,
    clinicalModeInstruction,
    forbidBmiInReply: Boolean(input.forbidBmiInReply),
    focusedAcknowledgement: input.focusedAcknowledgement ?? null,
    instruction:
      "A última entrada em messages é a mensagem atual do médico. Trate-a como foco principal da resposta.",
  })

  const completion = await groq.chat.completions.create({
    model: ASSISTANT_CHAT_MODEL,
    temperature:
      input.focusedAcknowledgement === "vaccine_orientation"
        ? 0.2
        : input.forbidBmiInReply
          ? 0.15
          : 0.25,
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
