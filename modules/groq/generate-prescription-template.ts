import { env } from "@/lib/env"
import { getGroq } from "@/modules/groq/groq-client"
import {
  MAX_SUGGESTED_MEDICATIONS,
  parsePrescriptionTemplate,
  type GeneratedPrescriptionTemplate,
} from "@/modules/groq/lib/template-suggestion-parsers"

const PROMPT_MAX_LENGTH = 300

const systemPrompt = `Você ajuda pediatras brasileiros a montar um MODELO de receita (um rascunho que o médico revisa) a partir do quadro clínico que ele digita.

Regras:
- Responda SOMENTE com JSON válido, sem markdown e sem texto fora do JSON.
- Formato: {"suggestedName": string, "medications": [{"name": string, "posology": string, "duration": string}], "orientations": string}
- suggestedName: o quadro, curto (ex.: "Gripe", "Otite média aguda").
- medications: de 1 a ${MAX_SUGGESTED_MEDICATIONS} itens, só o que é usual na pediatria brasileira para ESTE quadro. Nada fora do quadro: para gripe, por exemplo, sintomáticos e lavagem nasal, nunca remédio de outra doença.
- name: princípio ativo + apresentação comercial pediátrica comum (ex.: "Paracetamol 200 mg/mL, gotas").
- NUNCA informe dose em mg, mL, gotas por kg ou quantidade: a dose é calculada pelo peso de cada criança. posology traz só frequência, via e condição (ex.: "de 6/6 h se febre ou dor, via oral").
- duration: tempo de uso (ex.: "5 dias") ou "se precisar".
- orientations: 1 a 3 frases de orientação à família, em português simples.
- Se o quadro não for pediátrico ou não for um quadro clínico, devolva "medications": [].`

/**
 * Sugere um modelo de receita (nome, medicamentos sem dose e orientações) a partir do quadro.
 * Não grava nada: o médico revisa no formulário e é responsável pelo que salvar.
 */
export async function generatePrescriptionTemplate(prompt: string): Promise<GeneratedPrescriptionTemplate> {
  const condition = prompt.trim().slice(0, PROMPT_MAX_LENGTH)
  const completion = await getGroq("prescription-template").chat.completions.create({
    model: env.GROQ_ASSISTANT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Quadro: ${condition}` },
    ],
    temperature: 0.2,
    max_tokens: 1500,
  })
  return parsePrescriptionTemplate(completion.choices[0]?.message?.content ?? "", condition)
}
