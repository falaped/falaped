import type { CaseMessage } from "@/modules/cases/get-case-by-id"
import type {
  PatientProfileSnapshot,
  PatientProfileUpdatePayload,
} from "@/modules/falaped-assistant/contracts/assistant-types"
import type { PatientSex } from "@/modules/patients/patient-sex"
import {
  normalizePatientSexFromDb,
  PATIENT_SEX_LABELS,
} from "@/modules/patients/patient-sex"
import { normalizeText } from "@/modules/falaped-assistant/lib/normalize-text"
import {
  parseWeightHeightForBmi,
  stripNeonatalBirthMeasuresFromParsedAnthropometrics,
} from "@/lib/parse-anthropometrics-for-bmi"

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
    /\b(pc|perimetro\s+cefalico(?:\s+atual)?)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*cm?\b/i,
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

  const parsedAnthro = stripNeonatalBirthMeasuresFromParsedAnthropometrics(
    params.userMessage,
    parseWeightHeightForBmi(params.userMessage),
  )
  if (parsedAnthro.weightKg != null) {
    const nextWeight = parsedAnthro.weightKg.toFixed(3).replace(/\.?0+$/, "")
    const currentWeight = profile.weight ? parseNumericValue(profile.weight) : null
    if (currentWeight == null || Math.abs(parsedAnthro.weightKg - currentWeight) >= 0.01) {
      updates.weight = nextWeight
      summaryLines.push(`Peso: ${nextWeight} kg`)
    }
  }

  if (parsedAnthro.heightM != null) {
    const nextHeightCm = parsedAnthro.heightM * 100
    const nextHeight = nextHeightCm.toFixed(1).replace(/\.0$/, "")
    const currentHeightCm = normalizePatientHeightToCm(profile.height)
    if (currentHeightCm == null || Math.abs(nextHeightCm - currentHeightCm) >= 0.1) {
      updates.height = nextHeight
      summaryLines.push(`Comprimento/altura: ${nextHeight} cm`)
    }
  }

  const nextHeadCircumferenceCm = parseHeadCircumferenceCmFromMessage(params.userMessage)
  if (nextHeadCircumferenceCm != null) {
    const nextHead = nextHeadCircumferenceCm.toFixed(1).replace(/\.0$/, "")
    const currentHeadCm = normalizePatientHeightToCm(profile.head_circumference)
    if (currentHeadCm == null || Math.abs(nextHeadCircumferenceCm - currentHeadCm) >= 0.1) {
      updates.head_circumference = nextHead
      summaryLines.push(`Perímetro cefálico: ${nextHead} cm`)
    }
  }

  const nextBloodType = parseBloodTypeFromMessage(params.userMessage)
  if (nextBloodType != null) {
    const currentBloodType = profile.blood_type?.trim().toUpperCase() ?? null
    if (currentBloodType == null || currentBloodType !== nextBloodType) {
      updates.blood_type = nextBloodType
      summaryLines.push(`Tipo sanguíneo: ${nextBloodType}`)
    }
  }

  const nextName = parseLabeledTextValue(params.userMessage, ["nome do paciente", "paciente"])
  if (nextName) {
    const current = normalizeComparableText(profile.name)
    const next = normalizeComparableText(nextName)
    if (next && current !== next) {
      updates.name = nextName.trim()
      summaryLines.push(`Nome: ${nextName.trim()}`)
    }
  }

  const nextBirthDate = parseBirthDateFromMessage(params.userMessage)
  if (nextBirthDate) {
    if (profile.birth_date !== nextBirthDate) {
      updates.birth_date = nextBirthDate
      summaryLines.push(`Data de nascimento: ${nextBirthDate}`)
    }
  }

  const nextResponsible = parseLabeledTextValue(params.userMessage, [
    "responsavel",
    "nome do responsavel",
  ])
  if (nextResponsible) {
    const current = normalizeComparableText(profile.responsible)
    const next = normalizeComparableText(nextResponsible)
    if (next && current !== next) {
      updates.responsible = nextResponsible.trim()
      summaryLines.push(`Responsável: ${nextResponsible.trim()}`)
    }
  }

  const nextContactPhone = parseContactPhoneFromMessage(params.userMessage)
  if (nextContactPhone) {
    const currentDigits = profile.contact_phone?.replace(/\D/g, "") ?? null
    if (currentDigits !== nextContactPhone) {
      updates.contact_phone = nextContactPhone
      summaryLines.push(`Telefone de contato: ${nextContactPhone}`)
    }
  }

  const nextSex = parseSexFromMessage(params.userMessage)
  if (nextSex) {
    const currentKey = normalizePatientSexFromDb(profile.sex)
    if (currentKey !== nextSex) {
      updates.sex = nextSex
      summaryLines.push(`Sexo: ${PATIENT_SEX_LABELS[nextSex]}`)
    }
  }

  const nextLegalGuardian = parseLabeledTextValue(params.userMessage, [
    "responsavel legal",
    "guardiao legal",
    "legal guardian",
  ])
  if (nextLegalGuardian) {
    const current = normalizeComparableText(profile.legal_guardian)
    const next = normalizeComparableText(nextLegalGuardian)
    if (next && current !== next) {
      updates.legal_guardian = nextLegalGuardian.trim()
      summaryLines.push(`Responsável legal: ${nextLegalGuardian.trim()}`)
    }
  }

  const nextAllergies = parseLabeledTextValue(params.userMessage, ["alergias", "alergia"])
  if (nextAllergies) {
    const current = normalizeComparableText(profile.allergies)
    const next = normalizeComparableText(nextAllergies)
    if (next && current !== next) {
      updates.allergies = nextAllergies.trim()
      summaryLines.push(`Alergias: ${nextAllergies.trim()}`)
    }
  }

  const nextCurrentMeds = parseLabeledTextValue(params.userMessage, [
    "medicacoes em uso",
    "medicacao em uso",
    "medicamentos em uso",
    "medicamento em uso",
  ])
  if (nextCurrentMeds) {
    const current = normalizeComparableText(profile.current_medications)
    const next = normalizeComparableText(nextCurrentMeds)
    if (next && current !== next) {
      updates.current_medications = nextCurrentMeds.trim()
      summaryLines.push(`Medicações em uso: ${nextCurrentMeds.trim()}`)
    }
  }

  const nextMedicalHistory = parseLabeledTextValue(params.userMessage, [
    "historico medico",
    "historia pregressa",
    "antecedentes",
  ])
  if (nextMedicalHistory) {
    const current = normalizeComparableText(profile.medical_history)
    const next = normalizeComparableText(nextMedicalHistory)
    if (next && current !== next) {
      updates.medical_history = nextMedicalHistory.trim()
      summaryLines.push(`Histórico médico: ${nextMedicalHistory.trim()}`)
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
