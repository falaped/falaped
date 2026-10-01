import { env } from "@/lib/env"
import { TEMPLATE_VARS, type MessageChannel, type MessageMoment, MOMENT_LABEL } from "@/lib/message-template"
import { getGroq } from "@/modules/groq/groq-client"
import { stripJsonFences } from "@/modules/groq/lib/strip-json-fences"

export type MessageDraft = { subject: string | null; body: string }

function systemPrompt(channel: MessageChannel, keepVariables: boolean, sender: string): string {
  return `Você escreve mensagens do ${sender}, CEO do Falaped (IA que transcreve a consulta pediátrica e gera evolução, receita, atestado e relatório), para pediatras no Brasil.

Tom: o próprio CEO escrevendo em primeira pessoa, como um relato pessoal e direto. Nada de tom de anúncio, de promessas exageradas, de emojis ou de pontos de exclamação em sequência. Português do Brasil, frases curtas, sentence case.
Regras:
- O produto é "o Falaped" (masculino).
- O CEO não é médico: a dor é do pediatra, que ele ouviu de muitos ("ouvi de muitos pediatras…"). No WhatsApp, abra com "Oi, <nome>! Aqui é o ${sender}, do Falaped."
- Fale da dor real do pediatra (a consulta termina, a criança já saiu e o médico continua no teclado: evolução, receita, atestado) antes do produto.
- Use o contexto da pessoa só para acertar o momento e o tom. Nunca diga que ela abriu, leu ou clicou num e-mail, nem cite dados de rastreio.
- Uma única pergunta ou pedido no fim (ex.: 15 minutos para mostrar).
${channel === "whatsapp"
    ? "Canal: WhatsApp. No máximo 60 palavras, um parágrafo, sem assunto. Termine com uma pergunta simples."
    : "Canal: e-mail. Assunto curto (até 60 caracteres, sem a palavra grátis). Corpo com até 170 palavras em parágrafos separados por linha em branco; comece com a saudação. Não escreva assinatura: ela é adicionada depois."}
${keepVariables
    ? `É um modelo reutilizável: use as variáveis entre chaves no lugar dos dados da pessoa (${Object.keys(TEMPLATE_VARS).map((v) => `{${v}}`).join(", ")}).`
    : "É para uma pessoa específica: escreva o texto final, sem variáveis entre chaves."}

Responda APENAS em JSON válido: {"subject": ${channel === "email" ? '"assunto"' : "null"}, "body": "texto"}`
}

/**
 * Rascunho de mensagem pela Groq: momento + canal + o que se sabe da pessoa + instrução
 * opcional do admin. Com `base`, reescreve aquele texto em vez de começar do zero.
 */
export async function draftMessageWithAi(input: {
  channel: MessageChannel
  moment: MessageMoment
  sender: string
  instruction: string | null
  context: string | null
  base: MessageDraft | null
  keepVariables: boolean
}): Promise<MessageDraft> {
  const completion = await getGroq("message-draft").chat.completions.create({
    model: env.GROQ_ASSISTANT_MODEL,
    temperature: 0.6,
    max_tokens: 900,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt(input.channel, input.keepVariables, input.sender) },
      {
        role: "user",
        content: JSON.stringify({
          momento: MOMENT_LABEL[input.moment],
          sobre_a_pessoa: input.context,
          instrucao_do_ceo: input.instruction,
          texto_atual: input.base,
        }),
      },
    ],
  })
  // qwen3 pode abrir com <think>…</think> antes do JSON.
  const content = (completion.choices[0]?.message?.content ?? "").replace(/^[\s\S]*?<\/think>/, "").trim()
  const raw = stripJsonFences(content)
  let parsed: { subject?: unknown; body?: unknown }
  try {
    parsed = JSON.parse(raw || "{}")
  } catch {
    throw new Error("[ADMIN] A IA devolveu um texto fora do formato. Tente de novo.")
  }
  if (typeof parsed.body !== "string" || !parsed.body.trim()) throw new Error("[ADMIN] A IA não devolveu texto. Tente de novo.")
  return {
    subject: input.channel === "email" && typeof parsed.subject === "string" ? parsed.subject.trim() : null,
    body: parsed.body.trim(),
  }
}
