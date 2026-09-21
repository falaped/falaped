import type Groq from "groq-sdk"

import { env } from "@/lib/env"
import { getGroq } from "@/modules/groq/groq-client"
import { stripJsonFences } from "@/modules/groq/lib/strip-json-fences"
import { getReplyFromUnknownPayload } from "@/modules/groq/lib/groq-response-parsers"

const CARRYOVER_MODEL = env.GROQ_ASSISTANT_MODEL

/** Teto curto de propósito: isto é um lembrete de abertura, não um relatório. */
const CARRYOVER_MAX_COMPLETION_TOKENS = 400

export type GenerateCaseCarryoverSummaryInput = {
  /** Conversa do atendimento, já achatada em texto. */
  conversationText: string
  /** Relatório do caso, quando houver. */
  reportText: string | null
  /** Lembretes escritos à mão pelo médico durante o atendimento. */
  reminders: string | null
}

function buildSystemPrompt(): string {
  return `# Identidade
Você escreve o MINI RESUMO de um atendimento pediátrico do FALAPED, em PT-BR médico, para o próprio pediatra ler no começo da PRÓXIMA consulta da mesma criança.

# O que o resumo precisa responder
1. O que aconteceu na consulta anterior (motivo e desfecho), em uma ou duas linhas.
2. O que ficou pendente ou combinado para esta consulta (reavaliação, exame, retorno, ajuste de conduta).

# Regras
- No máximo 5 linhas curtas, em bullets começando com "• ".
- Só afirme o que está no material recebido. Sem diagnóstico novo, sem conduta nova, sem inventar seguimento.
- Os lembretes escritos pelo médico (campo reminders) são PRIORIDADE: se existirem, precisam aparecer no resumo.
- Sem saudação, sem preâmbulo, sem repetir nome do paciente.
- Material insuficiente para um resumo útil: devolva reply como string vazia.

# Formato de saída
Um único objeto JSON com a chave "reply" contendo o resumo inteiro como string.
Exemplo: {"reply":"• Consulta por tosse há 3 dias; ausculta limpa.\\n• Pendente: reavaliar em 7 dias se mantiver febre."}`
}

async function generateOnce(
  input: GenerateCaseCarryoverSummaryInput,
): Promise<string | null> {
  const userPrompt = JSON.stringify({
    conversation: input.conversationText,
    report: input.reportText,
    reminders: input.reminders,
  })

  let completion: Awaited<ReturnType<Groq["chat"]["completions"]["create"]>>
  try {
    completion = await getGroq().chat.completions.create({
      model: CARRYOVER_MODEL,
      temperature: 0.2,
      max_tokens: CARRYOVER_MAX_COMPLETION_TOKENS,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    })
  } catch (error) {
    console.error("[GROQ] generateCaseCarryoverSummary API call failed", { error })
    return null
  }

  const raw = completion.choices[0]?.message?.content?.trim() ?? ""
  try {
    const parsed = JSON.parse(stripJsonFences(raw) || "{}")
    return getReplyFromUnknownPayload(parsed)
  } catch (error) {
    console.error("[GROQ] generateCaseCarryoverSummary JSON parse failed", { error })
    return null
  }
}

/**
 * Gera o mini resumo do atendimento para a próxima consulta.
 *
 * Devolve `null` em vez de texto de erro quando não dá para gerar: este resumo
 * é gravado no banco e mostrado num modal meses depois — uma mensagem de falha
 * persistida viraria "resumo" da consulta para sempre. Sem resumo, o modal
 * mostra só os lembretes escritos pelo médico.
 */
export async function generateCaseCarryoverSummary(
  input: GenerateCaseCarryoverSummaryInput,
): Promise<string | null> {
  const first = await generateOnce(input)
  if (first?.trim()) return first.trim()
  const second = await generateOnce(input)
  return second?.trim() ? second.trim() : null
}
