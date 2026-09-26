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

export type ExtractExamOptions = {
  /** Idade por extenso (ex.: "4 meses") e sexo do paciente, para escolher a faixa certa. */
  patientAgeLabel?: string | null
  patientSex?: string | null
}

// Instruções vão no turno do usuário, não em `system`: a documentação de visão
// do Groq não garante system prompt junto com imagem, e assim funciona nos dois casos.
const INSTRUCTIONS = `Você transcreve laudos de exames laboratoriais pediátricos a partir de fotos ou páginas de PDF.
Transcreva SOMENTE o que está impresso. Nunca invente, complete ou "corrija" um valor, uma unidade ou uma faixa de referência.

Para cada analito (linha de resultado) devolva:
- "name": nome do exame/analito como impresso (ex.: "Hemoglobina", "TSH", "Leucócitos"). Sem o método, sem o nome do painel.
- "value": resultado como impresso, em texto, preservando vírgula decimal (ex.: "11,2", "Negativo", "Não reagente").
- "unit": unidade impressa, ou null (razões como "C8/C10" e resultados qualitativos não têm unidade).
- "reference": faixa de referência IMPRESSA NO LAUDO para esse analito, ou null se não houver. Não use faixas da sua memória.
- "flag": "low" se o valor está abaixo da faixa impressa, "high" se acima, "normal" se dentro, "unknown" se não há faixa ou não dá para comparar.
- "page": número da imagem em que a linha aparece (1 = primeira imagem desta mensagem).
- "lab_interpretation": o que a linha "Interpretação" ou "Conclusão" do BLOCO em que o analito está diz: "normal" se o laudo diz que o resultado está dentro da referência, "altered" se diz que está alterado, null se não há essa linha.

Regras de leitura da tabela:
1. A referência de cada analito é a que está NA MESMA LINHA dele. Nunca use a referência da linha de cima ou de baixo. Quando a célula de referência ocupa duas linhas de texto, copie o texto inteiro.
2. Quando o laudo imprime várias faixas por idade ou sexo, copie SOMENTE a faixa que vale para o paciente informado no fim destas instruções (ex.: "1,06 a 1,71 ng/dL"), sem as outras faixas e sem o rótulo de idade. Se a faixa da idade do paciente diz "não disponível" ou não existe, use null.
3. Quando limite inferior e superior do MESMO analito aparecem em linhas separadas ("Maior que 0,79" e "Menor que 9,05"), devolva UM item com a faixa combinada ("0,79 a 9,05").
4. Cada linha impressa vira exatamente UM item, uma vez só. Não repita, não junte linhas diferentes e não pule linha alguma, mesmo dentro de referência.
5. Resultado qualitativo (ex.: "Não reagente", "Negativo", "Normal", "FA") é transcrito como texto em "value"; a referência esperada vai em "reference" e "flag" é "normal" quando coincide com o esperado.
6. Para hemograma, leucograma, urina e outros painéis com muitas linhas, mantenha a ordem impressa e o nome de cada linha como impresso (ex.: "Neutrófilos segmentados", "Leucócitos", "Densidade").
7. Ignore cabeçalho, rodapé, dados do paciente, método, "Liberado por", assinaturas, carimbos e observações que não sejam resultado.

Também devolva "exam": {"laboratory": nome do laboratório ou null, "collected_at": data da coleta como impressa ou null, "exam_types": lista dos exames/painéis presentes (ex.: ["Hemograma", "TSH"])}.

Se uma imagem não for um exame, devolva "items": [] para ela.

Responda APENAS com JSON válido no formato:
{"exam": {"laboratory": null, "collected_at": null, "exam_types": []}, "items": [{"name": "", "value": "", "unit": null, "reference": null, "flag": "unknown", "page": 1, "lab_interpretation": null}]}`

function buildInstructions(options: ExtractExamOptions): string {
  const patient = [
    options.patientAgeLabel ? `idade ${options.patientAgeLabel}` : null,
    options.patientSex ? `sexo ${options.patientSex}` : null,
  ]
    .filter(Boolean)
    .join(", ")
  return patient ? `${INSTRUCTIONS}\n\nPaciente: ${patient}.` : INSTRUCTIONS
}

async function extractBatch(pages: ExamPageImage[], options: ExtractExamOptions): Promise<unknown> {
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
          { type: "text", text: buildInstructions(options) },
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
 * Transcreve as imagens de um exame com o modelo de visão do Groq, em lotes de
 * até 3, e funde tudo numa leitura só. `imagesPerPage` diz quantas imagens
 * consecutivas formam uma página do documento (2 quando a página vai em metades).
 */
export async function extractExamPages(
  images: ExamPageImage[],
  imagesPerPage = 1,
  options: ExtractExamOptions = {},
): Promise<ExtractedExam> {
  const batches: ExamPageImage[][] = []
  for (let i = 0; i < images.length; i += MAX_IMAGES_PER_REQUEST)
    batches.push(images.slice(i, i + MAX_IMAGES_PER_REQUEST))

  const offsets = batches.map((_, i) => i * MAX_IMAGES_PER_REQUEST)
  const raw = await Promise.all(batches.map((b) => extractBatch(b, options)))
  return mergeExtractedBatches(raw, offsets, imagesPerPage)
}
