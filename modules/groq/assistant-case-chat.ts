import { groq } from "@/modules/groq/groq-client"

const MODEL = "llama-3.1-8b-instant"

/** json_object mode must finish valid JSON; long PT-BR replies need headroom after escaping newlines/quotes. */
const CHAT_MAX_COMPLETION_TOKENS = 2048
const SUMMARY_MAX_COMPLETION_TOKENS = 1536

export type ClinicalSyncMode = "single_turn" | "global_update" | "balanced"

export type FocusedAssistantAcknowledgement = "vaccine_orientation"

export type AssistantCaseChatInput = {
  patientContext: string | null
  conversationSummary: string | null
  messages: Array<{ role: "user" | "assistant"; content: string }>
  /** How to scope ANAMNESE / EXAME / HIPÓTESES / CONDUTA vs thread history. */
  clinicalSyncMode?: ClinicalSyncMode
  /** Second-pass: model echoed BMI though the user did not ask for it this turn. */
  forbidBmiInReply?: boolean
  /** Narrow regeneration when generic chat keeps failing on a specific topic. */
  focusedAcknowledgement?: FocusedAssistantAcknowledgement
}

function getReplyFromUnknownPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null

  const asRecord = payload as Record<string, unknown>
  if (typeof asRecord.reply === "string" && asRecord.reply.trim().length > 0) {
    return asRecord.reply.trim()
  }
  if (typeof asRecord.content === "string" && asRecord.content.trim().length > 0) {
    return asRecord.content.trim()
  }
  if (typeof asRecord.message === "string" && asRecord.message.trim().length > 0) {
    return asRecord.message.trim()
  }

  return null
}

function cleanupRawModelContent(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()
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

MODO FOCO VACINAÇÃO (esta rodada, prioridade sobre as regras 4, 5, 5b, 9–13 salvo segurança):
- A mensagem atual do médico registra orientações ou calendário de vacinas (SUS vs particular, esquema por idade).
- Responda APENAS com "CONDUTA:" e 5 a 12 linhas curtas sintetizando vacinas e diferenças SUS/particular descritas. Não copie parágrafos inteiros.
- PROIBIDO nesta reply: ANAMNESE, EXAME, HIPÓTESES, IMC, fórmula, peso, altura, antropometria ou texto copiado do prontuário anterior.
- Use só o que está na última mensagem do médico em messages; ignore qualquer conteúdo clínico que não esteja nela.`
      : ""

  const systemPrompt = `Você é FALAPED v2, assistente de prontuário pediátrico.

REGRAS RÍGIDAS:
1) MODO PASSIVO no registro: confirme brevemente e não faça perguntas, exceto se faltar dado clínico crítico.
2) MODO ATIVO somente com comando explícito, pergunta explícita ou intenção clínica evidente.
3) Sempre em PT-BR médico profissional.
4) Resposta passiva com no máximo 2 frases.
5) Quando clinicamente relevante, estruture em ANAMNESE | EXAME | HIPÓTESES DIAGNÓSTICAS | CONDUTA (omitir seções sem base no contexto permitido).
5b) Rótulos exatos: "ANAMNESE:", "EXAME:", "HIPÓTESES DIAGNÓSTICAS:" (ou "HIPÓTESES:" se for lista curta), "CONDUTA:". Uma linha em branco antes de cada novo rótulo (exceto antes do primeiro). Vários trechos de exame: cada um com "EXAME:" em linha própria.
6) Nunca invente dados; se faltar base, declare insuficiência e peça os dados específicos.
7) Não execute ação crítica sem confirmação explícita.
8) Evite redundância e didatismo excessivo.
9) Prioridade absoluta: responda primeiro à última mensagem do médico (perguntas explícitas, pedidos de orientação terapêutica). Não ignore perguntas para repetir blocos antigos.
10) Não repita na CONDUTA pedidos genéricos (peso atual, evolução da alimentação, etc.) se o médico já forneceu esses dados em mensagens recentes do histórico.
11) Não contradiga o que o médico registrou (ex.: regurgitação, queixas da mãe, perda de peso). Se houver achado ou hipótese documentada, mantenha coerência.
12) O campo conversationSummary é memória resumida e pode estar defasada; em conflito, prevalecem as mensagens recentes em messages.
13) Use "HIPÓTESES DIAGNÓSTICAS:" quando o médico registrar hipóteses ou diagnósticos de trabalho; liste-as fielmente.
14) clinicalSyncMode no JSON do usuário define o escopo — siga-o estritamente (ver abaixo).
15) Se o histórico já contiver cálculo de IMC (incluindo linhas resumidas entre colchetes) e a mensagem atual do médico NÃO pedir IMC, antropometria, peso ou altura, NÃO repita fórmula, conta ou bloco de IMC; responda ao tema atual (ex.: vacinas, orientações).
16) Não copie texto longo de mensagens anteriores do Falaped; produza resposta nova e pertinente ao turno.${forbidBmiBlock}${vaccineFocusBlock}

Responda APENAS em JSON válido no formato: {"reply":"..."}`

  const mode = input.clinicalSyncMode ?? "balanced"
  const clinicalModeInstruction =
    mode === "global_update"
      ? "clinicalSyncMode=global_update: integre o histórico em messages para visão consolidada do atendimento; pode reunir anamnese, exame e hipóteses já citadas no fio quando fizer sentido clínico."
      : mode === "single_turn"
        ? "clinicalSyncMode=single_turn: baseie ANAMNESE, EXAME, HIPÓTESES DIAGNÓSTICAS e CONDUTA apenas no que está explícito na última mensagem do médico. Não preencha EXAME com achados que não aparecem nesse envio. Se a mensagem for só hipóteses, priorize HIPÓTESES DIAGNÓSTICAS: e omita EXAME ou use uma linha clara de insuficiência de exame neste turno."
        : "clinicalSyncMode=balanced: priorize a última mensagem; não invente exame físico. Use o histórico só para coerência pontual, sem substituir o trecho atual por um relatório completo salvo pedido claro."

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
    model: MODEL,
    temperature:
      input.focusedAcknowledgement === "vaccine_orientation"
        ? 0.2
        : input.forbidBmiInReply
          ? 0.15
          : 0.3,
    max_tokens: CHAT_MAX_COMPLETION_TOKENS,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  })

  const raw = completion.choices[0]?.message?.content?.trim() ?? ""
  const cleanedRaw = cleanupRawModelContent(raw)

  try {
    const parsed = JSON.parse(cleanedRaw || "{}")
    const normalizedReply = getReplyFromUnknownPayload(parsed)
    if (normalizedReply) {
      return normalizedReply
    }
  } catch {
    // Fallback below if model does not return strict JSON.
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

export async function generateCaseClinicalSummary(input: {
  clinicalThreadText: string
  conversationSummary: string | null
}): Promise<string> {
  const systemPrompt = `Você resume atendimentos pediátricos em PT-BR para o médico.
Não copie o texto integral. Sintetize em até 8 bullets curtos ou 2 parágrafos breves, cobrindo quando houver: queixas principais, dados relevantes (incl. antropometria), hipóteses, conduta, orientações ao responsável e pendências.
Ignore comandos de sistema (/resumo, gerar relatório, etc.) no conteúdo.
Responda APENAS em JSON válido: {"reply":"..."}`

  const userPrompt = JSON.stringify({
    conversationSummary: input.conversationSummary,
    substantiveNotes: input.clinicalThreadText,
  })

  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.25,
    max_tokens: SUMMARY_MAX_COMPLETION_TOKENS,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  })

  const raw = completion.choices[0]?.message?.content?.trim() ?? ""
  const cleanedRaw = cleanupRawModelContent(raw)

  try {
    const parsed = JSON.parse(cleanedRaw || "{}")
    const normalizedReply = getReplyFromUnknownPayload(parsed)
    if (normalizedReply) {
      return normalizedReply
    }
  } catch {
    // continue to fallback
  }

  return "Não foi possível gerar um resumo sintético agora. Tente novamente em instantes."
}

export async function generateGuardianQuestionSuggestions(input: {
  clinicalThreadText: string
  conversationSummary: string | null
}): Promise<string> {
  const systemPrompt = `Você sugere perguntas em PT-BR que o pediatra pode fazer ao responsável pela criança (linguagem acessível, respeitosa).
Gere exatamente 4 itens em formato de lista com traço (- ), alinhados ao caso descrito (puericultura, ganho de peso, amamentação, sintomas respiratórios, etc.).
Evite lista genérica de gripe se o caso for recém-nascido ou ganho de peso, e vice-versa.
Sem diagnósticos definitivos; apenas perguntas de esclarecimento clínico.
Responda APENAS em JSON válido: {"reply":"texto com os traços"}`

  const userPrompt = JSON.stringify({
    conversationSummary: input.conversationSummary,
    caseNotes: input.clinicalThreadText,
  })

  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.35,
    max_tokens: 500,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  })

  const raw = completion.choices[0]?.message?.content?.trim() ?? ""
  const cleanedRaw = cleanupRawModelContent(raw)

  try {
    const parsed = JSON.parse(cleanedRaw || "{}")
    const normalizedReply = getReplyFromUnknownPayload(parsed)
    if (normalizedReply) {
      return normalizedReply
    }
  } catch {
    // continue
  }

  return "Sugestões para o responsável:\n- Como está a aceitação da alimentação nas últimas 24 horas?\n- Houve mudança no número de fraldas ou no comportamento do sono?\n- Notou febre, letargia ou dificuldade para respirar?\n- Há algo novo que gostaria de relatar desde a última consulta?"
}

