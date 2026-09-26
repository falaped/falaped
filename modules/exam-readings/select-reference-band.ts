import type { PatientSex } from "@/modules/patients/patient-sex"

export type BandPatient = { ageDays: number | null; sex: PatientSex | null }

const DAYS = { dia: 1, dias: 1, semana: 7, semanas: 7, mes: 30.44, mês: 30.44, meses: 30.44, ano: 365.25, anos: 365.25 } as const
const UNIT = String.raw`(meses|m[eê]s|dias?|semanas?|anos?)`
const N = String.raw`(\d+(?:[.,]\d+)?)`

type Label = { index: number; length: number; min: number; max: number; sex?: PatientSex }

function days(n: string, unit: string): number {
  const u = unit.toLowerCase().replace("ê", "e") as keyof typeof DAYS
  return Number(n.replace(",", ".")) * (DAYS[u] ?? DAYS[unit.toLowerCase() as keyof typeof DAYS] ?? 30.44)
}

/** Rótulos de faixa etária/sexo que o laudo imprime antes de cada faixa. */
function findLabels(text: string): Label[] {
  const t = text.toLowerCase()
  const labels: Label[] = []
  const push = (m: RegExpMatchArray, min: number, max: number, sex?: PatientSex) =>
    labels.push({ index: m.index ?? 0, length: m[0].length, min, max, sex })

  for (const m of t.matchAll(new RegExp(String.raw`(?:de\s+)?${N}\s*(?:a|-|–|até)\s*${N}\s*${UNIT}`, "g")))
    push(m, days(m[1], m[3]), days(m[2], m[3]) + days("1", m[3]) - 0.001)
  for (const m of t.matchAll(new RegExp(String.raw`(?:<|menor(?:es)?\s+que|abaixo\s+de|até|inferior\s+a)\s*${N}\s*${UNIT}`, "g")))
    push(m, 0, days(m[1], m[2]))
  for (const m of t.matchAll(new RegExp(String.raw`(?:>|>=|maior(?:es)?\s+que|acima\s+de|igual\s+ou\s+superior\s+a|a\s+partir\s+de|superior\s+a)\s*${N}\s*${UNIT}`, "g")))
    push(m, days(m[1], m[2]), Infinity)
  for (const m of t.matchAll(/\badultos?\b/g)) push(m, days("18", "anos"), Infinity)
  // Cabeçalho de grupo ("PEDIÁTRICOS:"): não casa com ninguém, só delimita o trecho anterior.
  for (const m of t.matchAll(/\b(?:pedi[aá]tricos?|crian[cç]as?)\b/g)) push(m, -1, -1)
  for (const m of t.matchAll(/\b(?:rec[eé]m[- ]nascidos?|rn)\b/g)) push(m, 0, days("1", "mes"))
  for (const m of t.matchAll(/\b(?:masculino|homens|meninos)\b/g)) push(m, 0, Infinity, "masculino")
  for (const m of t.matchAll(/\b(?:feminino|mulheres|meninas)\b/g)) push(m, 0, Infinity, "feminino")

  // Um rótulo dentro de outro (o "1 a 23" dentro de "de 1 a 23 meses") fica com o maior.
  labels.sort((a, b) => a.index - b.index || b.length - a.length)
  return labels.filter((l, i) => i === 0 || l.index >= labels[i - 1].index + labels[i - 1].length)
}

/**
 * Quando a célula de referência traz várias faixas rotuladas por idade ou sexo
 * ("< 1 mês: não disponível. De 1 a 23 meses: 1,06 a 1,71. De 2 a 12 anos: …"),
 * devolve só o trecho da faixa que vale para o paciente. Sem rótulo, ou sem
 * rótulo que sirva, devolve o texto inteiro: o parser de limites já ignora
 * qualificadores soltos de idade.
 */
export function selectReferenceBand(reference: string, patient: BandPatient): string {
  const labels = findLabels(reference)
  if (labels.length === 0) return reference

  const matching = labels.filter((l) => {
    if (l.sex) return patient.sex != null && l.sex === patient.sex
    return patient.ageDays != null && patient.ageDays >= l.min && patient.ageDays < l.max
  })
  if (matching.length === 0) return reference

  // Trecho = do fim do rótulo até o próximo rótulo. Preferir o rótulo de idade
  // quando há também rótulo de sexo (o de idade é o mais específico).
  const chosen = matching.find((l) => !l.sex) ?? matching[0]
  const start = chosen.index + chosen.length
  const next = labels.find((l) => l.index > chosen.index)
  const segment = reference.slice(start, next ? next.index : undefined)
  const cleaned = segment.replace(/^[\s:=\-–.]+|[\s:=\-–.;,]+$/g, "").trim()
  return cleaned || reference
}
