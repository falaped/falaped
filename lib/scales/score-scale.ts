import type { ScaleDefinition, ScaleScore } from "./types"

/**
 * Soma as respostas e resolve a faixa de interpretação.
 *
 * `answers` mapeia a chave do item ao valor escolhido. Item sem resposta, valor
 * que não pertence às opções do item ou item desconhecido são ERRO, não um zero
 * silencioso: escala clínica pontuada a menos por causa de um campo perdido é
 * exatamente o bug que não pode chegar no médico.
 *
 * @param definition Definição da escala.
 * @param answers Respostas por chave de item.
 * @returns Escore somado e a faixa correspondente.
 * @throws Error `[SCALES]` quando falta resposta, sobra chave ou o valor é inválido.
 */
export function scoreScale(
  definition: ScaleDefinition,
  answers: Record<string, number>,
): ScaleScore {
  const itemKeys = new Set(definition.items.map((item) => item.key))
  for (const key of Object.keys(answers)) {
    if (!itemKeys.has(key))
      throw new Error(
        `[SCALES] Unknown item "${key}" for scale "${definition.key}"`,
      )
  }

  let score = 0
  for (const item of definition.items) {
    const value = answers[item.key]
    if (value === undefined)
      throw new Error(
        `[SCALES] Missing answer for item "${item.key}" of scale "${definition.key}"`,
      )
    if (!item.options.some((option) => option.value === value))
      throw new Error(
        `[SCALES] Invalid value ${value} for item "${item.key}" of scale "${definition.key}"`,
      )
    score += value
  }

  const band = definition.bands.find((b) => score >= b.min && score <= b.max)
  if (!band)
    throw new Error(
      `[SCALES] Score ${score} falls outside the bands of scale "${definition.key}"`,
    )

  return { score, band }
}

/**
 * Menor e maior escore possíveis da escala (soma dos mínimos e dos máximos de
 * cada item). Usado pelos testes para provar que as faixas cobrem tudo.
 */
export function scoreRange(definition: ScaleDefinition): {
  min: number
  max: number
} {
  let min = 0
  let max = 0
  for (const item of definition.items) {
    const values = item.options.map((o) => o.value)
    min += Math.min(...values)
    max += Math.max(...values)
  }
  return { min, max }
}
