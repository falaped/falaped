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

/**
 * Llama sometimes returns a multi-key clinical summary instead of {"reply":"..."}; normalize for display.
 */
function summaryFromStructuredPediatricPayload(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object") return null
  const o = parsed as Record<string, unknown>

  const parts: string[] = []

  const formatSection = (label: string, value: unknown): string | null => {
    if (value == null) return null
    if (typeof value === "string") {
      const t = value.trim()
      return t.length > 0 ? `${label}\n${t}` : null
    }
    if (Array.isArray(value)) {
      const lines = value
        .map((item) => String(item).trim())
        .filter((line) => line.length > 0)
      if (lines.length === 0) return null
      return `${label}\n${lines.map((line) => `- ${line}`).join("\n")}`
    }
    return null
  }

  const tryKeys = (label: string, keys: string[]): void => {
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(o, key)) continue
      const block = formatSection(label, o[key])
      if (block) {
        parts.push(block)
        return
      }
    }
  }

  tryKeys("Queixa principal", ["queixa_principal", "queixaPrincipal"])
  tryKeys("Dados relevantes", ["dados_relevantes", "dadosRelevantes"])
  tryKeys("Hipóteses", ["hipóteses", "hipoteses"])
  tryKeys("Conduta", ["conduta"])
  tryKeys("Orientações", ["orientações", "orientacoes"])
  tryKeys("Pendências", ["pendências", "pendencias"])

  const out = parts.join("\n\n").trim()
  return out.length > 0 ? out : null
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

MODO FOCO VACINAÇÃO (esta rodada, prioridade sobre confirmação mínima salvo segurança):
- A mensagem atual do médico registra orientações ou calendário de vacinas (SUS vs particular, esquema por idade).
- Responda APENAS com "CONDUTA:" e 5 a 12 linhas curtas sintetizando vacinas e diferenças SUS/particular descritas. Não copie parágrafos inteiros.
- PROIBIDO nesta reply: ANAMNESE, EXAME, HIPÓTESES, IMC, fórmula, peso, altura, antropometria ou texto copiado do prontuário anterior.
- Use só o que está na última mensagem do médico em messages; ignore qualquer conteúdo clínico que não esteja nela.`
      : ""

  const systemPrompt = `Você é FALAPED v2, assistente de prontuário pediátrico.

REGRAS RÍGIDAS:
1) ECO PROIBIDO: NÃO copie, NÃO parafraseie em parágrafos longos e NÃO reescreva sob rótulos (ANAMNESE, EXAME, etc.) o que o médico acabou de enviar. O histórico do chat já mostra o texto integral do médico; o Falaped só confirma o registro e conduz o fluxo.
2) Resposta padrão (registro / dictado): no máximo 2 frases curtas OU até 2 bullets mínimos (ex.: "Registrado." / "Prosseguindo."). Opcional: uma linha neutra com o tipo de informação (ex.: "Exame físico anotado.", "Hipóteses registradas.", "Conduta anotada.") sem listar o conteúdo clínico.
3) Se a última mensagem for uma pergunta explícita ou pedido de orientação: responda de forma objetiva, sem colar o dictado anterior.
4) MODO ATIVO somente com comando explícito do produto ou pergunta clínica explícita.
5) Sempre em PT-BR médico profissional.
6) Nunca invente dados; se faltar base para responder a uma pergunta, peça o dado específico (uma frase).
7) Não execute ação crítica sem confirmação explícita no produto.
8) Evite redundância e didatismo excessivo.
9) Não contradiga o que o médico registrou; em conflito com conversationSummary, prevalecem as mensagens recentes em messages.
10) clinicalSyncMode no JSON do usuário define o escopo — siga-o estritamente (ver abaixo).
11) Se o histórico já contiver cálculo de IMC e a mensagem atual do médico NÃO pedir IMC, peso ou altura, NÃO repita fórmula, conta ou bloco de IMC; responda ao tema atual.
12) Não copie texto longo de mensagens anteriores do Falaped.${forbidBmiBlock}${vaccineFocusBlock}

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
    model: MODEL,
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

/** Shown when Groq fails or returns unusable JSON after retries. */
export const CASE_CLINICAL_SUMMARY_FAILURE_MESSAGE =
  "Não foi possível gerar um resumo sintético agora. Tente novamente em instantes. Se o erro persistir, contacte o suporte."

export type GenerateCaseClinicalSummaryInput = {
  clinicalThreadText: string
  conversationSummary: string | null
  /** e.g. latest weight/height from patient record for this case */
  latestAnthropometricsHint?: string | null
}

async function generateCaseClinicalSummaryOnce(
  input: GenerateCaseClinicalSummaryInput,
): Promise<string | null> {
  const systemPrompt = `Você resume atendimentos pediátricos em PT-BR para o médico.
Não copie o texto integral. Sintetize em até 8 bullets curtos ou 2 parágrafos breves, cobrindo quando houver: queixas principais, dados relevantes (incl. antropometria mais recente do atendimento), hipóteses, conduta, orientações ao responsável e pendências.
Inclua um bullet "Alertas / queixas do responsável" quando o fio citar queixas explícitas (ex.: frases em maiúsculas, "queixa da mãe", engasgos, recusa de alimento) — omita o bullet se não houver.
Se latestAnthropometricsHint estiver preenchido no JSON do usuário, trate como referência da antropometria mais recente ligada ao paciente/caso quando coerente com o fio (o texto do fio pode conter medições antigas; prefira valores mais novos e consistentes).
Ignore comandos de sistema (/resumo, gerar relatório, etc.) no conteúdo.
Formato obrigatório: um único objeto JSON com a chave "reply" contendo TODO o resumo como uma string (pode usar quebras de linha escapadas em JSON). Exemplo: {"reply":"• Queixa: ...\\n• Conduta: ..."}
Não use chaves de primeiro nível separadas (ex.: queixa_principal, conduta) — apenas "reply".`

  const userPrompt = JSON.stringify({
    conversationSummary: input.conversationSummary,
    substantiveNotes: input.clinicalThreadText,
    latestAnthropometricsHint: input.latestAnthropometricsHint ?? null,
  })

  let completion: Awaited<ReturnType<typeof groq.chat.completions.create>>
  try {
    completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.25,
      max_tokens: SUMMARY_MAX_COMPLETION_TOKENS,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    })
  } catch {
    return null
  }

  const raw = completion.choices[0]?.message?.content?.trim() ?? ""
  const cleanedRaw = cleanupRawModelContent(raw)

  try {
    const parsed = JSON.parse(cleanedRaw || "{}")
    const normalizedReply = getReplyFromUnknownPayload(parsed)
    if (normalizedReply) {
      return normalizedReply
    }
    const structuredSummary = summaryFromStructuredPediatricPayload(parsed)
    if (structuredSummary) {
      return structuredSummary
    }
  } catch {
    // Model returned non-JSON or malformed document
  }

  return null
}

export async function generateCaseClinicalSummary(
  input: GenerateCaseClinicalSummaryInput,
): Promise<string> {
  const first = await generateCaseClinicalSummaryOnce(input)
  if (first) return first
  const second = await generateCaseClinicalSummaryOnce(input)
  if (second) return second
  return CASE_CLINICAL_SUMMARY_FAILURE_MESSAGE
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

