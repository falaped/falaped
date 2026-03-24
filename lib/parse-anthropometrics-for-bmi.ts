/**
 * Parses weight (kg) and height/comprimento (m) from free-text clinical dictation.
 * Avoids confusing PC/PA (perímetros) with comprimento when possible.
 */

function normalizeAccentsLower(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

/** Replace Brazilian decimal commas between digits (iteratively for chained commas). */
function normalizeDecimalCommas(value: string): string {
  let next = value
  let previous = ""
  while (next !== previous) {
    previous = next
    next = next.replace(/(\d),(\d)/g, "$1.$2")
  }
  return next
}

const WEIGHT_KG_REGEX = /\b(\d+(?:\.\d+)?)\s*kg\b/gi

/**
 * Plausible weight in kg for pediatric dictation (excludes stray large numbers).
 */
function pickWeightKg(normalizedFlat: string): number | null {
  const matches = [...normalizedFlat.matchAll(WEIGHT_KG_REGEX)]
  const values = matches
    .map((match) => Number(match[1]))
    .filter((weight) => weight >= 0.3 && weight <= 180)

  if (values.length === 0) return null
  // Prefer explicit "peso" label if present
  const labeled = /\bpeso\s*[:]?\s*(\d+(?:\.\d+)?)\s*kg\b/i.exec(normalizedFlat)
  if (labeled) {
    const fromLabel = Number(labeled[1])
    if (fromLabel >= 0.3 && fromLabel <= 180) return fromLabel
  }
  return values[values.length - 1] ?? null
}

/**
 * Stature (cm) from a line: ignore everything after first PC:/PA: (perimeters on same line).
 */
function extractLengthCmFromLine(line: string): number | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  const lower = normalizeAccentsLower(trimmed)
  const idxPc = lower.search(/\bpc\s*:/)
  const idxPa = lower.search(/\bpa\s*:/)
  let cut = trimmed.length
  if (idxPc >= 0) cut = Math.min(cut, idxPc)
  if (idxPa >= 0) cut = Math.min(cut, idxPa)
  const beforePerimeters = trimmed.slice(0, cut)

  const prefersLength =
    /\b(comp|rimento|comprimento|altura|estatura|length|talla)\b/i.test(lower) ||
    /^comp\s*:/i.test(trimmed)

  const matches = [
    ...beforePerimeters.matchAll(/\b(\d+(?:\.\d+)?)\s*cm\b/gi),
  ]
    .map((match) => Number(match[1]))
    .filter((cm) => cm >= 25 && cm <= 130 && (prefersLength || cm >= 35))

  if (matches.length === 0) return null
  return Math.max(...matches)
}

function pickHeightMeters(rawLines: string[], normalizedFlat: string): number | null {
  const candidatesCm: number[] = []

  for (const line of rawLines) {
    const cm = extractLengthCmFromLine(line)
    if (cm !== null) candidatesCm.push(cm)
  }

  if (candidatesCm.length > 0) {
    return Math.max(...candidatesCm) / 100
  }

  const stripped = normalizedFlat.replace(/\bpc\s*:\s*[^.\n]*?\b\d+(?:\.\d+)?\s*cm/gi, "")
  const stripped2 = stripped.replace(/\bpa\s*:\s*[^.\n]*?\b\d+(?:\.\d+)?\s*cm/gi, "")
  const fallbackMatches = [...stripped2.matchAll(/\b(\d+(?:\.\d+)?)\s*cm\b/gi)]
    .map((match) => Number(match[1]))
    .filter((cm) => cm >= 30 && cm <= 130)

  if (fallbackMatches.length === 0) return null
  return Math.max(...fallbackMatches) / 100
}

export type ParsedAnthropometrics = {
  weightKg: number | null
  heightM: number | null
}

export function parseWeightHeightForBmi(raw: string): ParsedAnthropometrics {
  const normalizedFlat = normalizeDecimalCommas(normalizeAccentsLower(raw))
  const rawLines = raw.split(/\r?\n/)

  const weightKg = pickWeightKg(normalizedFlat)
  const heightM = pickHeightMeters(rawLines, normalizedFlat)

  return { weightKg, heightM }
}

export type BmiSanityResult =
  | { ok: true; bmi: number }
  | { ok: false; reason: string }

const BMI_MIN_PLAUSIBLE = 4
const BMI_MAX_PLAUSIBLE = 55

export function computePediatricBmi(weightKg: number, heightM: number): BmiSanityResult {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightM)) {
    return { ok: false, reason: "Valores numéricos inválidos." }
  }
  if (heightM <= 0 || heightM > 2.6 || weightKg <= 0 || weightKg > 250) {
    return {
      ok: false,
      reason:
        "Altura ou peso fora do intervalo esperado. Informe peso em kg e comprimento ou altura em cm (ex.: peso 3,45 kg, comprimento 51,5 cm).",
    }
  }

  const bmi = weightKg / (heightM * heightM)
  if (!Number.isFinite(bmi) || bmi < BMI_MIN_PLAUSIBLE || bmi > BMI_MAX_PLAUSIBLE) {
    return {
      ok: false,
      reason:
        "O IMC calculado ficou fora do intervalo plausível em pediatria — provavelmente altura e peso foram lidos na ordem errada (ex.: perímetro confundido com comprimento). Informe explicitamente: peso X kg e comprimento ou altura Y cm.",
    }
  }

  return { ok: true, bmi }
}
