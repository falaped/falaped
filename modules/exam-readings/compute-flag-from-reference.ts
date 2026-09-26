import type { ExamReadingFlag } from "@/modules/exam-readings/types"

function toNumber(s: string): number | null {
  const n = Number(s.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "") || NaN)
  // "0.37" (ponto decimal) chega aqui sem vírgula: não pode virar 37.
  const dotDecimal = /^\s*-?\d+\.\d+\s*$/.test(s) ? Number(s) : null
  return dotDecimal ?? (Number.isFinite(n) ? n : null)
}

const NUM = String.raw`(-?\d+(?:[.,]\d+)?)`

/**
 * Compara valor e faixa IMPRESSA por código, em vez de confiar na comparação do
 * modelo. Reconhece "Menor que X", "Maior que X", "< X", "> X", "X a Y", "X - Y".
 * Devolve null quando não entende a faixa ou o valor: aí vale o que o modelo disse.
 */
export function computeFlagFromReference(
  value: string,
  reference: string | null,
): ExamReadingFlag | null {
  if (!reference) return null
  const v = /^\s*-?\d+(?:[.,]\d+)?\s*$/.test(value) ? toNumber(value) : null
  if (v == null) return null

  const ref = reference.toLowerCase()
  let m = ref.match(new RegExp(String.raw`(?:menor(?:es)?\s+(?:que|ou\s+igual\s+a)|<=?|até)\s*${NUM}`))
  if (m) {
    const max = toNumber(m[1])
    return max == null ? null : v > max ? "high" : "normal"
  }
  m = ref.match(new RegExp(String.raw`(?:maior(?:es)?\s+(?:que|ou\s+igual\s+a)|>=?|acima\s+de)\s*${NUM}`))
  if (m) {
    const min = toNumber(m[1])
    return min == null ? null : v < min ? "low" : "normal"
  }
  m = ref.match(new RegExp(String.raw`${NUM}\s*(?:a|-|–|até)\s*${NUM}`))
  if (m) {
    const min = toNumber(m[1])
    const max = toNumber(m[2])
    if (min == null || max == null || min > max) return null
    return v < min ? "low" : v > max ? "high" : "normal"
  }
  return null
}
