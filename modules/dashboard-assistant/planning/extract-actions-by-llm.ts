import { groq } from "@/modules/groq/groq-client"
import { isPipelineStepKind } from "@/modules/dashboard-assistant/contracts/turn-queue"
import type { TurnActionKind } from "@/modules/dashboard-assistant/planning/turn-action-types"

const MODEL = process.env.GROQ_ASSISTANT_MODEL?.trim() || "qwen/qwen3-32b"
const MAX_COMPLETION_TOKENS = 220

const ALLOWED_ACTIONS: TurnActionKind[] = [
  "CHAT",
  "QUESTION",
  "SUMMARY",
  "CALCULATE_BMI",
  "REVIEW_PATIENT_PROFILE_UPDATE",
  "REVIEW_GUARDIAN_ALERT",
  "SUGGEST_GUARDIAN_QUESTIONS",
  "GENERATE_REPORT",
  "GENERATE_MEDICAL_CERTIFICATE",
  "GENERATE_PRESCRIPTION",
  "CLOSE_CASE",
]

const SYSTEM_PROMPT = `Você é o classificador de ações do assistente pediátrico Falaped.
A partir da mensagem do pediatra, identifique TODAS as ações que ele está pedindo.

Retorne uma lista ORDENADA de ações. Ações válidas:
${JSON.stringify(ALLOWED_ACTIONS)}

Regras:
- Retorne todas as ações presentes na mensagem; uma mensagem pode pedir várias ações ao mesmo tempo.
- Se a mensagem contém texto clínico sem pedido de ação específica, use CHAT.
- SUMMARY: usar apenas quando há pedido explícito de resumo (ex.: "gere um resumo", "resumir o caso", "/resumo").
- GENERATE_REPORT: usar quando o pediatra pede relatório (ex.: "gere o relatório", "relatório do caso", "/relatorio").
- GENERATE_PRESCRIPTION: usar apenas quando há pedido explícito de receita (ex.: "gerar receita", "/receita"). Descrever medicações na conduta NÃO é pedido de receita.
- CALCULATE_BMI: usar quando o pediatra pede cálculo de IMC (ex.: "qual o IMC?", "/imc", "calcular imc"). Quando o pedido é de IMC, NÃO adicione QUESTION — use apenas CALCULATE_BMI.
- QUESTION: usar quando o pediatra faz uma pergunta ao assistente que exige resposta assistiva (estratégia, orientação, explicação). NÃO usar junto com CALCULATE_BMI se a pergunta for somente sobre IMC.
- CLOSE_CASE: usar quando o pediatra pede encerramento (ex.: "encerrar caso", "/encerrar").
- SUGGEST_GUARDIAN_QUESTIONS: usar quando o pediatra pede sugestão de perguntas ao responsável.
- GENERATE_MEDICAL_CERTIFICATE: usar quando o pediatra pede atestado (ex.: "gerar atestado", "/atestado").
- REVIEW_PATIENT_PROFILE_UPDATE: NÃO usar na classificação; é adicionado automaticamente pelo sistema.
- REVIEW_GUARDIAN_ALERT: NÃO usar na classificação; é adicionado automaticamente pelo sistema.
- NÃO invente ações fora da lista.

Saída JSON obrigatória: {"actions":["...","..."]}`

export type ExtractedActions = {
  actions: TurnActionKind[]
  source: "llm" | "fallback"
}

function cleanupRawContent(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()
}

function parseActionsFromPayload(payload: unknown): TurnActionKind[] {
  if (!payload || typeof payload !== "object") return []
  const raw = payload as { actions?: unknown }
  if (!Array.isArray(raw.actions)) return []
  return raw.actions
    .map((item) => (typeof item === "string" ? item : ""))
    .filter((item): item is TurnActionKind => isPipelineStepKind(item))
}

export async function extractActionsByLlm(userMessage: string): Promise<ExtractedActions> {
  const text = userMessage.trim()
  if (!text) return { actions: ["CHAT"], source: "fallback" }

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0,
      max_tokens: MAX_COMPLETION_TOKENS,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify({ message: text }) },
      ],
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ""
    const cleaned = cleanupRawContent(raw)
    const parsed = JSON.parse(cleaned || "{}")
    const actions = parseActionsFromPayload(parsed)
    if (actions.length > 0) {
      return { actions, source: "llm" }
    }
  } catch {
    console.error("[ASSISTANT_PLAN] LLM action extraction failed, using fallback")
  }

  return { actions: ["CHAT"], source: "fallback" }
}
