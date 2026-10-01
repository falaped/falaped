import { env } from "@/lib/env"
import { getGroq } from "@/modules/groq/groq-client"
import { stripJsonFences } from "@/modules/groq/lib/strip-json-fences"
import {
  mergeExtractedBatches,
  type ExtractedExam,
} from "@/modules/exam-readings/merge-extracted-batches"
import { examReadingInfoSchema } from "@/lib/schemas/exam-reading"
import {
  resolveExamPatient,
  type CasePatientForExam,
} from "@/modules/exam-readings/resolve-exam-patient"

/** Limite do Groq para o qwen/qwen3.8-27b. */
const MAX_IMAGES_PER_REQUEST = 3
const EXTRACTION_MAX_COMPLETION_TOKENS = 8192

export type ExamPageImage = { mimeType: string; base64: string }

export type ExtractExamOptions = {
  /** Paciente do caso: só entra no que o cabeçalho do laudo não trouxer. */
  casePatient?: CasePatientForExam
}

const HEADER_MAX_COMPLETION_TOKENS = 400

// Só o cabeçalho, da primeira imagem. Nome, nascimento e sexo saem daqui e a
// IDADE NA COLETA é calculada por código: data é conta que o modelo erra.
const HEADER_INSTRUCTIONS = `Leia APENAS o cabeçalho deste laudo de exame laboratorial e devolva o que está impresso (null no que não houver).
Responda APENAS com JSON válido:
{"laboratory": nome do laboratório, "collected_at": data da coleta no formato dd/mm/aaaa, "exam_types": [], "patient_name": nome do paciente, "patient_birth_date": data de nascimento no formato dd/mm/aaaa, "patient_age": idade como impressa (ex.: "2 anos e 4 meses"), "patient_sex": "masculino" ou "feminino"}`

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
2. Quando o laudo imprime várias faixas por idade ou sexo, copie a célula de referência INTEIRA, com todos os rótulos e faixas como impressos (ex.: "< 1 mês: não disponível. De 1 a 23 meses: de 1,06 a 1,71 ng/dL. De 2 a 12 anos: de 1,05 a 1,67 ng/dL"). Não escolha a faixa: isso é feito depois, por código.
3. Quando limite inferior e superior do MESMO analito aparecem em linhas separadas ("Maior que 0,79" e "Menor que 9,05"), devolva UM item com a faixa combinada ("0,79 a 9,05").
4. Cada linha impressa vira exatamente UM item, uma vez só. Não repita, não junte linhas diferentes e não pule linha alguma, mesmo dentro de referência.
5. Resultado qualitativo (ex.: "Não reagente", "Negativo", "Normal", "FA") é transcrito como texto em "value"; a referência esperada vai em "reference" e "flag" é "normal" quando coincide com o esperado.
6. Para hemograma, leucograma, urina e outros painéis com muitas linhas, mantenha a ordem impressa e o nome de cada linha como impresso (ex.: "Neutrófilos segmentados", "Leucócitos", "Densidade").
7. Ignore cabeçalho, rodapé, dados do paciente, método, "Liberado por", assinaturas, carimbos e observações que não sejam resultado.

Também devolva "exam" com o que está impresso no cabeçalho do laudo (null no que não houver): {"laboratory": nome do laboratório, "collected_at": data da coleta no formato dd/mm/aaaa, "exam_types": lista dos exames/painéis presentes (ex.: ["Hemograma", "TSH"]), "patient_name": nome do paciente, "patient_birth_date": data de nascimento no formato dd/mm/aaaa, "patient_age": idade como impressa (ex.: "2 anos e 4 meses"), "patient_sex": "masculino" ou "feminino"}.

Se uma imagem não for um exame, devolva "items": [] para ela.

Responda APENAS com JSON válido no formato:
{"exam": {"laboratory": null, "collected_at": null, "exam_types": [], "patient_name": null, "patient_birth_date": null, "patient_age": null, "patient_sex": null}, "items": [{"name": "", "value": "", "unit": null, "reference": null, "flag": "unknown", "page": 1, "lab_interpretation": null}]}`

async function parseJsonReply(raw: string): Promise<unknown> {
  try {
    return JSON.parse(stripJsonFences(raw) || "{}")
  } catch {
    throw new Error("[EXAM_READINGS] O modelo de visão devolveu uma resposta ilegível.")
  }
}

async function extractHeader(first: ExamPageImage) {
  const completion = await getGroq("exam-pages").chat.completions.create({
    model: env.GROQ_VISION_MODEL,
    temperature: 0,
    max_tokens: HEADER_MAX_COMPLETION_TOKENS,
    reasoning_effort: "none",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: HEADER_INSTRUCTIONS },
          { type: "image_url", image_url: { url: `data:${first.mimeType};base64,${first.base64}` } },
        ],
      },
    ],
  })
  const parsed = examReadingInfoSchema.safeParse(
    await parseJsonReply(completion.choices[0]?.message?.content?.trim() ?? ""),
  )
  return parsed.success ? parsed.data : null
}

async function extractBatch(pages: ExamPageImage[]): Promise<unknown> {
  const completion = await getGroq("exam-pages").chat.completions.create({
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
  return parseJsonReply(completion.choices[0]?.message?.content?.trim() ?? "")
}

/**
 * Transcreve as imagens de um exame com o modelo de visão do Groq: o cabeçalho
 * (paciente do LAUDO) e os resultados em lotes de até 3 imagens, em paralelo.
 * A faixa por idade/sexo é escolhida depois, por código, com a idade na coleta
 * (laudo manda, cadastro do caso completa). `imagesPerPage` diz quantas imagens
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
  const [header, ...raw] = await Promise.all([
    images[0] ? extractHeader(images[0]) : Promise.resolve(null),
    ...batches.map(extractBatch),
  ])
  const resolved =
    header && options.casePatient ? resolveExamPatient(header, options.casePatient) : null

  // Cabeçalho entra primeiro na fusão: seus campos têm prioridade sobre o que os lotes acharem.
  return mergeExtractedBatches(
    [{ exam: header ?? {}, items: [] }, ...raw],
    [0, ...offsets],
    imagesPerPage,
    { ageDays: resolved?.ageDays ?? null, sex: resolved?.sexKey ?? null },
  )
}
