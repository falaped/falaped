import { env } from "@/lib/env"
import { getGroq } from "@/modules/groq/groq-client"
import { stripJsonFences } from "@/modules/groq/lib/strip-json-fences"
import type { ExamReadingInfo, ExamReadingItem } from "@/modules/exam-readings/types"

const REPORT_MAX_COMPLETION_TOKENS = 4096

export type GenerateExamReportInput = {
  /** Idade por extenso (ex.: "3 anos e 2 meses") ou null. */
  patientAgeLabel: string | null
  patientSex: string | null
  examInfo: ExamReadingInfo
  /** Itens JÁ conferidos pelo médico. Só o que está aqui existe para o modelo. */
  items: ExamReadingItem[]
}

const SYSTEM_PROMPT = `Você é um assistente de pediatra. Recebe os resultados de exames laboratoriais de uma criança, já conferidos pelo médico, e redige um RASCUNHO de relatório de exames em português do Brasil, para o pediatra revisar, editar e assinar.

Regras invioláveis:
- Use SOMENTE os valores, unidades e faixas de referência fornecidos. Não invente faixas de referência nem "corrija" valores. Se um item vier sem faixa, diga que o laudo não traz faixa para ele.
- O campo "flag" de cada resultado ("normal", "low", "high", "unknown") já foi conferido pelo médico e é a palavra final: só chame de alterado o que vier como "low" ou "high", e nunca contradiga um "normal". Não recalcule a comparação.
- Considere idade e sexo informados ao interpretar, e diga quando um resultado merece cautela por causa da idade (recém-nascido, lactente).
- Não faça diagnóstico fechado: aponte achados, correlações possíveis e o que o médico pode considerar. Sugestões de conduta e de exames complementares são SUGESTÕES.
- Sem markdown, sem listas com marcadores, sem IDs técnicos.

Estrutura obrigatória, com estes títulos em linha própria e um parágrafo curto (ou poucos) sob cada um:

Exames avaliados
Uma frase com o laboratório, a data da coleta e os painéis presentes, na ordem do laudo.

Resultados alterados
Um parágrafo por resultado com flag "low" ou "high", nesta forma: nome, valor com unidade, faixa de referência do laudo e se está abaixo ou acima. Agrupe pelo painel do laudo quando houver mais de um alterado no mesmo painel. Se não houver nenhum, escreva "Nenhum resultado fora da faixa de referência do laboratório."

Resultados dentro da referência
Só os NOMES dos analitos com flag "normal", agrupados por painel e separados por vírgula, sem repetir valores nem faixas. Resultados com flag "unknown" entram numa frase à parte: "Sem faixa de referência no laudo para: ...".

Interpretação
Correlação clínica cautelosa dos alterados entre si e com a idade e o sexo; para um recém-nascido ou lactente, diga quando o achado é comum nessa fase. Se não há alterados, uma frase dizendo que o painel está dentro do esperado para a idade.

Sugestões para o médico
Até quatro frases: repetir, complementar ou acompanhar o quê, e quando. Todas marcadas como sugestão.

Responda APENAS em JSON válido: {"report": "texto do relatório"}`

/** Redige o rascunho do relatório de exames com o modelo de texto do assistente. */
export async function generateExamReport(input: GenerateExamReportInput): Promise<string> {
  const completion = await getGroq("exam-report").chat.completions.create({
    model: env.GROQ_ASSISTANT_MODEL,
    temperature: 0.2,
    max_tokens: REPORT_MAX_COMPLETION_TOKENS,
    // gpt-oss raciocina antes de responder e o raciocínio consome max_tokens; baixo evita JSON truncado.
    reasoning_effort: "low",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          paciente: { idade: input.patientAgeLabel, sexo: input.patientSex },
          exame: input.examInfo,
          resultados: input.items.map(({ page: _page, ...item }) => item),
        }),
      },
    ],
  })

  const raw = stripJsonFences(completion.choices[0]?.message?.content?.trim() ?? "")
  let report: unknown
  try {
    report = (JSON.parse(raw || "{}") as { report?: unknown }).report
  } catch {
    report = null
  }
  if (typeof report !== "string" || report.trim() === "")
    throw new Error("[EXAM_READINGS] O modelo não devolveu o texto do relatório.")
  return report.trim()
}
