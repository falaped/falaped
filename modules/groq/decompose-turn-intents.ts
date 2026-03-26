import { groq } from "@/modules/groq/groq-client"
import {
  isPipelineStepKind,
  type PipelineStepKind,
} from "@/modules/falaped-assistant/contracts/turn-queue"

const MODEL = process.env.GROQ_ASSISTANT_MODEL?.trim() || "qwen/qwen3-32b"
const MAX_COMPLETION_TOKENS = 180

type DecomposePayload = {
  intents?: unknown
}

function cleanupRawModelContent(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

export function decomposeTurnIntentsHeuristic(userMessage: string): PipelineStepKind[] {
  const n = normalizeText(userMessage)
  const intents: PipelineStepKind[] = []

  const hasBmiCommand = n.includes("/imc") || n.includes("calcular imc") || /\bimc\b/.test(n)
  if (hasBmiCommand) {
    intents.push("CALCULATE_BMI")
  }
  if (n.includes("/resumo") || n.includes("resumir principais pontos")) {
    intents.push("SUMMARY")
  }
  if (n.includes("sugerir perguntas para o responsavel") || n.includes("sugerir perguntas ao responsavel")) {
    intents.push("SUGGEST_GUARDIAN_QUESTIONS")
  }
  if (
    n.includes("/relatorio") ||
    n.includes("gerar relatorio") ||
    n.includes("gerar relatório") ||
    /\b(gere|gerar)\s+(?:o\s+)?relat[oó]rio\b/.test(n) ||
    /\b(elaborar|emitir|fazer)\s+(?:o\s+)?relat[oó]rio\b/.test(n)
  ) {
    intents.push("GENERATE_REPORT")
  }
  if (n.includes("/atestado") || n.includes("gerar atestado")) {
    intents.push("GENERATE_MEDICAL_CERTIFICATE")
  }
  if (n.includes("/receita") || n.includes("gerar receita")) {
    intents.push("GENERATE_PRESCRIPTION")
  }
  if (n.includes("/encerrar") || n.includes("encerrar caso") || n.includes("fechar caso")) {
    intents.push("CLOSE_CASE")
  }
  const questionSignals =
    /\?|\b(como|qual|quais|devo|deveria|estrategia|por que|porque|qual imc)\b/.test(n)
  const bmiUtteranceLooksLikeImcAsk =
    n.includes("/imc") ||
    n.includes("calcular imc") ||
    /\bqual\b[^.!?]{0,120}\bimc\b/.test(n) ||
    /\bimc\b[^.!?]{0,20}\?/.test(n)
  if (questionSignals && !(hasBmiCommand && bmiUtteranceLooksLikeImcAsk)) {
    intents.push("QUESTION")
  }

  if (intents.length === 0) return ["CHAT"]
  return Array.from(new Set(intents))
}

function parseIntentsFromPayload(payload: unknown): PipelineStepKind[] {
  if (!payload || typeof payload !== "object") return []
  const raw = payload as DecomposePayload
  if (!Array.isArray(raw.intents)) return []
  return raw.intents
    .map((item) => (typeof item === "string" ? item : ""))
    .filter((item): item is PipelineStepKind => isPipelineStepKind(item))
}

export async function decomposeTurnIntentsByAi(params: {
  userMessage: string
}): Promise<{ intents: PipelineStepKind[]; source: "llm" | "heuristic" }> {
  const text = params.userMessage.trim()
  if (!text) return { intents: ["CHAT"], source: "heuristic" }

  const systemPrompt = `Classifique a mensagem do pediatra em uma lista ORDENADA de intents do assistente.
Retorne SOMENTE intents da lista:
["CHAT","QUESTION","SUMMARY","CALCULATE_BMI","REVIEW_PATIENT_PROFILE_UPDATE","REVIEW_ANTHROPOMETRIC_REFERENCE","REVIEW_GUARDIAN_ALERT","SUGGEST_GUARDIAN_QUESTIONS","GENERATE_REPORT","GENERATE_MEDICAL_CERTIFICATE","GENERATE_PRESCRIPTION","CLOSE_CASE"].

Regras:
- Pode retornar várias intents quando o texto pedir múltiplas ações.
- Não invente intents fora da lista.
- Se não houver comando claro, use CHAT.
- NUNCA use SUMMARY a menos que o pediatra peça resumo explícito (ex.: /resumo, "resumir principais pontos", "fazer um resumo clínico", "gerar resumo do caso"). Anamnese ou texto estruturado sem esse pedido → CHAT, não SUMMARY.
- NUNCA use GENERATE_PRESCRIPTION salvo pedido explícito de receita (ex.: /receita, "gerar receita", "emitir receita", "emissão de receita"). Descrever medicações, doses ou nebulização na conduta NÃO é pedido de receita → use CHAT.
- NUNCA use REVIEW_ANTHROPOMETRIC_REFERENCE se a mensagem não trouxer peso e/ou comprimento/altura novos (números). Perguntas gerais ou só texto clínico → não inclua essa intent.
- NUNCA use QUESTION junto com CALCULATE_BMI quando o pedido for só cálculo/explicação de IMC (ex.: "Qual o IMC?"); use apenas CALCULATE_BMI.
- Use GENERATE_REPORT quando o pediatra pedir relatório explicitamente (inclui "gere o relatório", "gerar relatório do caso", /relatorio).
- Saída JSON obrigatória no formato: {"intents":["...","..."]}.`

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0,
      max_tokens: MAX_COMPLETION_TOKENS,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({ message: text }) },
      ],
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ""
    const cleaned = cleanupRawModelContent(raw)
    const parsed = JSON.parse(cleaned || "{}")
    const intents = parseIntentsFromPayload(parsed)
    if (intents.length > 0) {
      return { intents, source: "llm" }
    }
  } catch {
    // Fallback below.
  }

  return { intents: decomposeTurnIntentsHeuristic(text), source: "heuristic" }
}
