import { env } from "@/lib/env"
import { getGroq } from "@/modules/groq/groq-client"
import { MAX_SUGGESTED_EXAMS, parseExamPanel, type GeneratedExamPanel } from "@/modules/groq/lib/template-suggestion-parsers"

const PROMPT_MAX_LENGTH = 300
/** ponytail: o catálogo inteiro vai no prompt (hoje 13 itens); filtrar por relevância se crescer muito. */
const MAX_CATALOG = 800

const systemPrompt = `Você ajuda pediatras brasileiros a montar um MODELO de pedido de exames (um rascunho que o médico revisa) a partir do objetivo que ele digita.

Regras:
- Responda SOMENTE com JSON válido, sem markdown e sem texto fora do JSON.
- Formato: {"suggestedName": string, "exams": string[]}
- suggestedName: o objetivo, curto (ex.: "Investigação de anemia").
- exams: de 1 a ${MAX_SUGGESTED_EXAMS} exames usuais na pediatria brasileira para ESTE objetivo, com o nome como se pede no laboratório (ex.: "Hemograma completo"). Nada fora do objetivo.
- Quando o exame estiver no catálogo do médico, use o nome exatamente como está nele.
- Se o objetivo não for clínico, devolva "exams": [].`

/**
 * Sugere um painel de exames a partir do objetivo, com os nomes do catálogo do médico quando houver.
 * Não grava nada: o médico revisa no formulário.
 */
export async function generateExamPanel(prompt: string, catalog: string[]): Promise<GeneratedExamPanel> {
  const goal = prompt.trim().slice(0, PROMPT_MAX_LENGTH)
  const completion = await getGroq("exam-panel-template").chat.completions.create({
    model: env.GROQ_ASSISTANT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Catálogo do médico:\n${catalog.slice(0, MAX_CATALOG).join("\n") || "(vazio)"}\n\nObjetivo: ${goal}` },
    ],
    temperature: 0.2,
    max_tokens: 1000,
  })
  return parseExamPanel(completion.choices[0]?.message?.content ?? "", goal, catalog)
}
