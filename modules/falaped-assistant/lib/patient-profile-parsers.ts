import type { CaseMessage } from "@/modules/cases/get-case-by-id"
import type {
  PatientProfileSnapshot,
  PatientProfileUpdatePayload,
} from "@/modules/falaped-assistant/contracts/assistant-types"
import type { PatientSex } from "@/modules/patients/patient-sex"
import { normalizeText } from "@/modules/falaped-assistant/lib/normalize-text"
import { parseWeightHeightForBmi } from "@/lib/parse-anthropometrics-for-bmi"

export function parseNumericValue(labelValue: string): number | null {
  const match = labelValue.replace(",", ".").match(/(\d+(?:\.\d+)?)/)
  if (!match) return null
  return Number(match[1])
}

export function normalizeComparableText(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = normalizeText(value).replace(/\s+/g, " ").trim()
  return normalized.length > 0 ? normalized : null
}

export function normalizePatientHeightToCm(value: string | null | undefined): number | null {
  if (!value) return null
  const numeric = parseNumericValue(value)
  if (numeric == null) return null
  return numeric <= 3 ? numeric * 100 : numeric
}

export function parseHeadCircumferenceCmFromMessage(userMessage: string): number | null {
  const normalized = normalizeText(userMessage).replace(",", ".")
  const directMatch = normalized.match(
    /\b(pc|perimetro\s+cefalico(?:\s+atual)?)\s*(?:[:=]|\s(?:para|de|em)\s)?\s*(\d+(?:\.\d+)?)(?:\s*cm)?\b/i,
  )
  if (directMatch) {
    const value = Number(directMatch[2])
    if (Number.isFinite(value) && value >= 20 && value <= 70) return value
  }
  return null
}

export function parseBloodTypeFromMessage(userMessage: string): string | null {
  const normalized = normalizeText(userMessage)
  const simple = normalized.match(/\b([aboab]{1,2})\s*(positivo|negativo)\b/i)
  if (simple) {
    const abo = simple[1].toUpperCase().replace(/[^ABO]/g, "")
    const rh = /positivo/i.test(simple[2]) ? "+" : "-"
    if (abo.length >= 1 && abo.length <= 2) return `${abo}${rh}`
  }
  const symbol = normalized.match(/\b([abio]{1,2})\s*([+-])/i)
  if (symbol) {
    const abo = symbol[1].toUpperCase().replace(/[^ABO]/g, "")
    const rh = symbol[2]
    if (abo.length >= 1 && abo.length <= 2) return `${abo}${rh}`
  }
  return null
}

export function parseLabeledTextValue(
  userMessage: string,
  labels: string[],
): string | null {
  const normalized = userMessage
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")

  for (const label of labels) {
    const regex = new RegExp(`${label}\\s*[:=]\\s*([^\\n]+)`, "i")
    const match = normalized.match(regex)
    if (!match) continue
    const value = match[1].trim()
    if (value.length === 0) continue
    return value
  }

  return null
}

/**
 * Pedido explícito para acrescentar uma alergia ("adicionar alergia amendoim",
 * "incluir alergia a dipirona"). Só com verbo de comando: ditado como "nega
 * alergias" não vira atualização da ficha.
 */
export function parseAllergyAddition(userMessage: string): string | null {
  const match = userMessage.match(
    /\b(?:adicion|acrescent|inclu|registr|anot|cadastr|coloc)\w*\s+(?:uma\s+|a\s+)?alergias?(?:\s*[:=]|\s+(?:a|ao|aos|à|às|as|de|do|da)(?=\s))?\s*([^\n.;]+)/i,
  )
  const value = match?.[1]?.trim()
  return value ? value : null
}

export function parseContactPhoneFromMessage(userMessage: string): string | null {
  const labeled = parseLabeledTextValue(userMessage, [
    "telefone",
    "telefone de contato",
    "contato",
    "whatsapp",
  ])
  if (labeled) {
    const digits = labeled.replace(/\D/g, "")
    if (digits.length >= 10) return digits
  }
  return null
}

export function parseBirthDateFromMessage(userMessage: string): string | null {
  const labeled = parseLabeledTextValue(userMessage, [
    "data de nascimento",
    "nascimento",
    "dn",
  ])
  if (!labeled) return null
  const normalized = labeled.trim()
  const isoMatch = normalized.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
  const brMatch = normalized.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/)
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`
  return null
}

/**
 * Parses user dictation into canonical DB enum keys (`masculino` | `feminino`).
 */
export function parseSexFromMessage(userMessage: string): PatientSex | null {
  const n = normalizeText(userMessage)
  if (/\bsexo\s*[:=]?\s*masculino\b|\btipicamente masculina\b/.test(n)) {
    return "masculino"
  }
  if (/\bsexo\s*[:=]?\s*feminino\b|\btipicamente feminina\b/.test(n)) {
    return "feminino"
  }
  return null
}

export function detectPatientProfileUpdateCandidate(params: {
  userMessage: string
  patientProfile?: PatientProfileSnapshot
}): {
  updates: PatientProfileUpdatePayload
  summaryLines: string[]
} | null {
  const profile = params.patientProfile
  if (!profile?.id) return null

  const updates: PatientProfileUpdatePayload = {}
  const summaryLines: string[] = []

  // O chat só altera alergias e tipo sanguíneo. Peso, estatura e PC viram medida da
  // consulta (revisão própria); nome, nascimento, responsáveis, telefone, sexo,
  // medicações em uso e histórico só pela ficha.
  const nextBloodType = parseBloodTypeFromMessage(params.userMessage)
  if (nextBloodType != null) {
    const currentBloodType = profile.blood_type?.trim().toUpperCase() ?? null
    if (currentBloodType == null || currentBloodType !== nextBloodType) {
      updates.blood_type = nextBloodType
      summaryLines.push(`Tipo sanguíneo: ${nextBloodType}`)
    }
  }

  const labeledAllergies = parseLabeledTextValue(params.userMessage, ["alergias", "alergia"])
  const addedAllergy = labeledAllergies ? null : parseAllergyAddition(params.userMessage)
  // "Adicionar" soma à lista da ficha; "alergias: X" substitui, como antes.
  const nextAllergies =
    addedAllergy && profile.allergies?.trim()
      ? (normalizeComparableText(profile.allergies) ?? "").includes(normalizeComparableText(addedAllergy) ?? "")
        ? profile.allergies.trim()
        : `${profile.allergies.trim()}, ${addedAllergy}`
      : (labeledAllergies ?? addedAllergy)
  if (nextAllergies) {
    const current = normalizeComparableText(profile.allergies)
    const next = normalizeComparableText(nextAllergies)
    if (next && current !== next) {
      updates.allergies = nextAllergies.trim()
      summaryLines.push(`Alergias: ${nextAllergies.trim()}`)
    }
  }

  if (summaryLines.length === 0) return null
  return { updates, summaryLines }
}

export function looksLikePatientProfileDictation(userMessage: string): boolean {
  const parsed = parseWeightHeightForBmi(userMessage)
  if (parsed.weightKg != null || parsed.heightM != null) return true
  if (parseHeadCircumferenceCmFromMessage(userMessage) != null) return true
  if (parseBloodTypeFromMessage(userMessage) != null) return true
  if (parseSexFromMessage(userMessage) != null) return true
  if (parseContactPhoneFromMessage(userMessage) != null) return true
  if (parseBirthDateFromMessage(userMessage) != null) return true
  if (parseLabeledTextValue(userMessage, ["nome do paciente", "paciente"])) return true
  return false
}

export function findLatestPatientProfileUpdateCandidateFromThread(params: {
  messages: CaseMessage[]
  patientProfile?: PatientProfileSnapshot
}): {
  updates: PatientProfileUpdatePayload
  summaryLines: string[]
} | null {
  for (let i = params.messages.length - 1; i >= 0; i -= 1) {
    const message = params.messages[i]
    if (message.role !== "user") continue
    const candidate = detectPatientProfileUpdateCandidate({
      userMessage: message.content,
      patientProfile: params.patientProfile,
    })
    if (candidate) return candidate
    if (looksLikePatientProfileDictation(message.content)) return null
  }
  return null
}
