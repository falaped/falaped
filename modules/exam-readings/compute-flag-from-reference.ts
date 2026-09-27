import type { ExamReadingFlag } from "@/modules/exam-readings/types"

const NUM = String.raw`(-?\d+(?:[.,]\d+)?)`
const AGE_UNIT = String.raw`(?:dias?|semanas?|m[eê]s(?:es)?|anos?)`

function toNumber(s: string): number | null {
  const n = Number(s.trim().replace(",", "."))
  return Number.isFinite(n) ? n : null
}

/**
 * Tira do texto o que NÃO é limite do analito: parênteses ("Alteração do valor
 * de referência em 19/08/2025") e qualificadores de idade ("< 1 mês",
 * "de 1 a 23 meses", "até 7 dias"). Sem isso o "< 1" de "< 1 mês" vira teto.
 */
function stripNoise(reference: string): string {
  return reference
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(new RegExp(String.raw`(?:<=?|>=?|de|até|a|entre)?\s*\d+(?:[.,]\d+)?\s*(?:a|-|–|e|até)\s*\d+(?:[.,]\d+)?\s*${AGE_UNIT}\b`, "g"), " ")
    .replace(new RegExp(String.raw`(?:<=?|>=?|de|até|a|acima\s+de|abaixo\s+de|menor(?:es)?\s+que|maior(?:es)?\s+que)?\s*\d+(?:[.,]\d+)?\s*${AGE_UNIT}\b`, "g"), " ")
}

/**
 * Compara valor e faixa IMPRESSA por código, em vez de confiar na comparação do
 * modelo. Reconhece "Menor que X", "Maior que X", "< X", "> X", "X a Y", "X - Y".
 * Devolve null quando não entende a faixa ou o valor (aí vale o que o modelo
 * disse) e "unknown" quando a faixa tem mais de um intervalo candidato, como
 * referências por idade que o modelo copiou inteiras: melhor "sem faixa" na tela
 * do que um alto/baixo chutado.
 */
export function computeFlagFromReference(
  value: string,
  reference: string | null,
): ExamReadingFlag | null {
  if (!reference) return null
  const v = /^\s*-?\d+(?:[.,]\d+)?\s*$/.test(value) ? toNumber(value) : null
  if (v == null) return null

  const ref = stripNoise(reference)
  const intervals = [...ref.matchAll(new RegExp(String.raw`${NUM}\s*(?:a|-|–|até)\s*${NUM}`, "g"))]
  const uppers = [...ref.matchAll(new RegExp(String.raw`(?:menor(?:es)?\s+(?:que|ou\s+igual\s+a)|<=?|até|abaixo\s+de)\s*${NUM}`, "g"))]
  const lowers = [...ref.matchAll(new RegExp(String.raw`(?:maior(?:es)?\s+(?:que|ou\s+igual\s+a)|>=?|acima\s+de)\s*${NUM}`, "g"))]

  if (intervals.length > 1 || uppers.length > 1 || lowers.length > 1) return "unknown"
  if (intervals.length === 1 && (uppers.length > 0 || lowers.length > 0)) return "unknown"

  let min: number | null = null
  let max: number | null = null
  if (intervals.length === 1) {
    min = toNumber(intervals[0][1])
    max = toNumber(intervals[0][2])
    if (min == null || max == null || min > max) return null
  } else {
    if (uppers.length === 1) max = toNumber(uppers[0][1])
    if (lowers.length === 1) min = toNumber(lowers[0][1])
    if (min == null && max == null) return null
  }

  if (min != null && v < min) return "low"
  if (max != null && v > max) return "high"
  return "normal"
}
