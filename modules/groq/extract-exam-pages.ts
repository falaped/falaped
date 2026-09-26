import { env } from "@/lib/env"
import { getGroq } from "@/modules/groq/groq-client"
import { stripJsonFences } from "@/modules/groq/lib/strip-json-fences"
import {
  mergeExtractedBatches,
  type ExtractedExam,
} from "@/modules/exam-readings/merge-extracted-batches"

/** Limite do Groq para o qwen/qwen3.8-27b. */
const MAX_IMAGES_PER_REQUEST = 3
const EXTRACTION_MAX_COMPLETION_TOKENS = 8192

export type ExamPageImage = { mimeType: string; base64: string }

// Instruções vão no turno do usuário, não em `system`: a documentação de visão
// do Groq não garante system prompt junto com imagem, e assim funciona nos dois casos.
const INSTRUCTIONS = `Você transcreve laudos de exames laboratoriais pediátricos a partir de fotos ou páginas de PDF.
Transcreva SOMENTE o que está impresso. Nunca invente, complete ou "corrija" um valor, uma unidade ou uma faixa de referência.

Para cada analito (linha de resultado) devolva:
- "name": nome do exame/analito como impresso (ex.: "Hemoglobina", "TSH", "Leucócitos").
- "value": resultado como impresso, em texto, preservando vírgula decimal (ex.: "11,2", "Negativo").
- "unit": unidade impressa, ou null.
- "reference": faixa de referência IMPRESSA NO LAUDO para esse analito, ou null se não houver. Não use faixas da sua memória.
- "flag": "low" se o valor está abaixo da faixa impressa, "high" se acima, "normal" se dentro, "unknown" se não há faixa ou não dá para comparar.
- "page": número da imagem em que a linha aparece (1 = primeira imagem desta mensagem).

Também devolva "exam": {"laboratory": nome do laboratório ou null, "collected_at": data da coleta como impressa ou null, "exam_types": lista dos exames/painéis presentes (ex.: ["Hemograma", "TSH"])}.

Ignore cabeçalhos, rodapés, assinaturas e observações que não sejam resultados. Se uma imagem não for um exame, devolva "items": [] para ela.

Responda APENAS com JSON válido no formato:
{"exam": {"laboratory": null, "collected_at": null, "exam_types": []}, "items": [{"name": "", "value": "", "unit": null, "reference": null, "flag": "unknown", "page": 1}]}`

async function extractBatch(pages: ExamPageImage[]): Promise<unknown> {
  const completion = await getGroq().chat.completions.create({
    model: env.GROQ_VISION_MODEL,
    temperature: 0,
    max_tokens: EXTRACTION_MAX_COMPLETION_TOKENS,
    // Extração é transcrição: raciocinar só custa tokens e abre espaço para "corrigir" o laudo.
    reasoning_effort: "none",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: INSTRUCTIONS },
          ...pages.map((p) => ({
            type: "image_url" as const,
            image_url: { url: `data:${p.mimeType};base64,${p.base64}` },
          })),
        ],
      },
    ],
  })
  const raw = stripJsonFences(completion.choices[0]?.message?.content?.trim() ?? "")
  try {
    return JSON.parse(raw || "{}")
  } catch {
    throw new Error("[EXAM_READINGS] O modelo de visão devolveu uma resposta ilegível.")
  }
}

/**
 * Transcreve as páginas de um exame com o modelo de visão do Groq, em lotes de
 * até 3 imagens, e funde tudo numa leitura só (páginas renumeradas no documento).
 */
export async function extractExamPages(pages: ExamPageImage[]): Promise<ExtractedExam> {
  const batches: ExamPageImage[][] = []
  for (let i = 0; i < pages.length; i += MAX_IMAGES_PER_REQUEST)
    batches.push(pages.slice(i, i + MAX_IMAGES_PER_REQUEST))

  const offsets = batches.map((_, i) => i * MAX_IMAGES_PER_REQUEST)
  const raw = await Promise.all(batches.map(extractBatch))
  return mergeExtractedBatches(raw, offsets)
}
