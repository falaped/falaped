import type { CaseMessage } from "@/modules/cases/get-case-by-id"
import {
  computePediatricBmi,
  parseWeightHeightForBmi,
} from "@/lib/parse-anthropometrics-for-bmi"
import { stripImcCalculationTemplatePrefix } from "@/lib/strip-imc-calculation-template-prefix"
import { assistantMessageToModelText } from "@/modules/dashboard-assistant/assistant-model-message"
import {
  classifyQuestionIntentByAi,
  generateAssistantCaseChat,
  generateCaseClinicalSummary,
  generateGuardianQuestionSuggestions,
  type ClinicalSyncMode,
} from "@/modules/groq/assistant-case-chat"

export type DashboardAssistantIntent =
  | "CHAT"
  | "QUESTION"
  | "SUMMARY"
  | "CALCULATE_BMI"
  | "REVIEW_PATIENT_PROFILE_UPDATE"
  | "REVIEW_ANTHROPOMETRIC_REFERENCE"
  | "REVIEW_GUARDIAN_ALERT"
  | "SUGGEST_GUARDIAN_QUESTIONS"
  | "GENERATE_REPORT"
  | "GENERATE_MEDICAL_CERTIFICATE"
  | "GENERATE_PRESCRIPTION"
  | "CLOSE_CASE"

export type AssistantAction =
  | "none"
  | "confirm_close_case"
  | "confirm_generate_report"
  | "confirm_generate_medical_certificate"
  | "confirm_generate_prescription"
  | "confirm_update_patient_profile"
  | "confirm_anthropometric_reference"
  | "confirm_guardian_alert_storage"

export type StoredDataItem = {
  section:
    | "CONDUTA"
    | "DADOS_ANTROPOMETRICOS"
    | "ALERTAS_CLINICOS"
    | "CALCULO_IMC"
  label: string
  value: string
  status: "confirmado" | "pendente_de_confirmacao"
}

export type RoutedAssistantTurn = {
  intent: DashboardAssistantIntent
  reply: string
  action: AssistantAction
  showStructuredCard: boolean
  showAlert: boolean
  storedData: StoredDataItem[]
  patientProfileUpdatePayload?: PatientProfileUpdatePayload
  /** When true, UI shows confirm/decline for profile update (prompt only; not after confirm/decline). */
  showPatientProfileUpdateActions?: boolean
}

type PatientProfileSnapshot = {
  id: string
  name: string | null
  birth_date: string | null
  responsible: string | null
  contact_phone: string | null
  sex: string | null
  legal_guardian: string | null
  blood_type: string | null
  weight: string | null
  height: string | null
  head_circumference: string | null
  allergies: string | null
  current_medications: string | null
  medical_history: string | null
}

type PatientProfileUpdatePayload = {
  name?: string
  birth_date?: string | null
  responsible?: string | null
  contact_phone?: string | null
  sex?: string | null
  legal_guardian?: string | null
  blood_type?: string | null
  weight?: string | null
  height?: string | null
  head_circumference?: string | null
  allergies?: string | null
  current_medications?: string | null
  medical_history?: string | null
}

const ASSISTANT_PAYLOAD_PREFIX = "__FALAPED_JSON__"

type AssistantStoredDataPayloadItem = {
  section: string
  label: string
  value: string
  status: "confirmado" | "pendente_de_confirmacao"
}

type AssistantPayloadLite = {
  content: string
  storedData?: {
    items: AssistantStoredDataPayloadItem[]
  }
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function isQuestionLikeMessage(message: string): boolean {
  const n = normalizeText(message)
  return (
    message.includes("?") ||
    /\b(como|qual|quais|quando|devo|deveria|deveriamos|estrategia|o que|por que|porque)\b/.test(
      n,
    )
  )
}

/** Same criteria as CALCULATE_BMI intent (user explicitly asked for BMI this turn). */
function messageRequestsBmi(userMessage: string): boolean {
  const n = normalizeText(userMessage)
  return (
    n.includes("/imc") ||
    n.includes("calcular imc") ||
    /\bimc\b/.test(n) ||
    /\bindice\s+de\s+massa(\s+corporal)?\b/.test(n)
  )
}

function hasExplicitGuardianAlertSignal(message: string): boolean {
  const content = message.trim()
  const normalized = normalizeText(content)
  const hasPriorityTerms =
    /\bqueixa da mae\b|\bqueixa do responsavel\b|\bengasg|\bnao mama\b|\brecusa\b|\bfebre\b|\bletarg/.test(
      normalized,
    )

  const lettersOnly = content.replace(/[^A-Za-zÀ-ÿ]/g, "")
  const upperOnly = lettersOnly.replace(/[^A-ZÀ-Ý]/g, "")
  const upperRatio = lettersOnly.length > 0 ? upperOnly.length / lettersOnly.length : 0
  const hasShoutSignal = upperRatio >= 0.55 && lettersOnly.length >= 12
  return hasPriorityTerms || hasShoutSignal
}

function replyStartsWithBmiBlock(reply: string): boolean {
  return /^IMC estimado:/i.test(reply.trim())
}

function refineChatReplyAfterModel(userMessage: string, reply: string): string {
  if (messageRequestsBmi(userMessage)) return reply
  return stripImcCalculationTemplatePrefix(reply)
}

/** User dictation that should get CONDUTA on vaccines, not IMC echo or empty strip. */
function isLikelyVaccineOrientationMessage(userMessage: string): boolean {
  const n = normalizeText(userMessage)
  if (/^orientacoes\s*:/.test(n) || /^orientacao\s*:/.test(n)) return true
  const hasOrientation = /\borientac(oes|ao)\b/.test(n)
  const hasVaccine =
    /\b(vacinas?|vacinacao|imuniz|calendario|pentavalente|hexavalente|pneumococica|rotavirus|\bvip\b|bcg|nirsevimabe)\b/.test(
      n,
    )
  if (hasOrientation && hasVaccine) return true
  if (/\bvacinas?\s+de\s+/.test(n) && hasVaccine) return true
  return false
}

function needsAntiBmiEchoRecovery(userMessage: string, reply: string): boolean {
  if (messageRequestsBmi(userMessage)) return false
  const trimmed = reply.trim()
  if (trimmed.length === 0) return true
  if (replyStartsWithBmiBlock(trimmed)) return true
  return false
}

function vaccineReplyHasCondutaLead(reply: string): boolean {
  const t = reply.trim()
  if (t.length === 0) return false
  return /^\s*CONDUTA\s*:/i.test(t)
}

/** On vaccine-only path, accept only a CONDUTA-led reply (no ANAMNESE dump, no plain filler). */
function vaccineReplyViolatesCondutaOnly(reply: string): boolean {
  if (reply.trim().length === 0) return true
  return !vaccineReplyHasCondutaLead(reply)
}

function parseAssistantPayloadLite(rawContent: string): AssistantPayloadLite | null {
  const raw = rawContent.trim()
  if (!raw.startsWith(ASSISTANT_PAYLOAD_PREFIX)) return null
  const jsonPayload = raw.slice(ASSISTANT_PAYLOAD_PREFIX.length)
  try {
    const parsed = JSON.parse(jsonPayload) as AssistantPayloadLite
    if (!parsed || typeof parsed !== "object") return null
    if (typeof parsed.content !== "string") return null
    return parsed
  } catch {
    return null
  }
}

function listRecentAssistantReplies(messages: CaseMessage[], limit = 2): string[] {
  const replies: string[] = []
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message.role !== "assistant") continue
    const displayText = assistantMessageToModelText(message.content).trim()
    if (displayText.length === 0) continue
    replies.push(displayText)
    if (replies.length >= limit) break
  }
  return replies
}

function normalizeForNearDuplicate(value: string): string {
  return normalizeText(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function areNearDuplicateReplies(candidate: string, previous: string): boolean {
  const a = normalizeForNearDuplicate(candidate)
  const b = normalizeForNearDuplicate(previous)
  if (!a || !b) return false
  if (a === b) return true
  if (a.length >= 24 && b.includes(a)) return true
  if (b.length >= 24 && a.includes(b)) return true
  return false
}

function isReplyEchoingUserMessage(reply: string, userMessage: string): boolean {
  const replyNormalized = normalizeForNearDuplicate(reply)
  const userNormalized = normalizeForNearDuplicate(userMessage)
  if (!replyNormalized || !userNormalized) return false
  if (replyNormalized === userNormalized) return true
  if (replyNormalized.length >= 24 && userNormalized.includes(replyNormalized)) return true
  if (userNormalized.length >= 24 && replyNormalized.includes(userNormalized)) return true
  return false
}

function isDryAcknowledgementReply(reply: string): boolean {
  const normalized = normalizeText(reply).replace(/\s+/g, " ")
  return (
    normalized === "registrado." ||
    normalized === "anotado." ||
    normalized === "recebido." ||
    normalized === "prosseguindo." ||
    normalized === "registro realizado com sucesso." ||
    normalized === "anotacao clinica registrada no caso."
  )
}

function isLikelyDictationMessage(userMessage: string): boolean {
  const n = normalizeText(userMessage)
  if (n.includes("?")) return false
  if (
    /\b(resumir|calcular|gerar|encerrar|fechar|sugerir perguntas|analise|analisar)\b/.test(
      n,
    )
  ) {
    return false
  }
  return userMessage.trim().length >= 20
}

function detectAcknowledgementTopic(
  userMessage: string,
): "anamnese" | "exame" | "hipoteses" | "conduta" | "orientacoes" | "registro" {
  const n = normalizeText(userMessage)

  if (/\bhipotese\b|\bhipoteses\b|\bdiagnostic/.test(n)) return "hipoteses"
  if (
    /\borientacoes?\b/.test(n) &&
    /\b(vacina|sus|particular|responsavel|engasg|amament|aleitamento)\b/.test(n)
  ) {
    return "orientacoes"
  }
  if (
    /\b(conduta|prescrev|monitorar|manter|avaliar necessidade|iniciar|inicio|ajustar)\b/.test(
      n,
    )
  ) {
    return "conduta"
  }
  if (
    /\b(exame|acv|abd|ar:|neurologic|ortolani|barlow|fontanela|murmurio|bulhas)\b/.test(
      n,
    )
  ) {
    return "exame"
  }
  if (
    /\b(anamnese|historic|gestacao|nascimento|familia|queixa principal|episodio|fungor|nasal|sintoma|triagem)\b/.test(
      n,
    )
  ) {
    return "anamnese"
  }
  return "registro"
}

function topicAcknowledgementTemplates(
  topic: "anamnese" | "exame" | "hipoteses" | "conduta" | "orientacoes" | "registro",
): string[] {
  if (topic === "anamnese") {
    return [
      "Anamnese registrada com sucesso.",
      "Perfeito, histórico clínico anotado. Pode seguir com exame quando desejar.",
      "Registro concluído para anamnese. Quer um resumo parcial até aqui?",
    ]
  }
  if (topic === "exame") {
    return [
      "Exame físico registrado no caso.",
      "Perfeito, achados de exame anotados. Pode seguir com hipóteses e conduta.",
      "Exame documentado com sucesso. Se quiser, eu organizo um resumo parcial.",
    ]
  }
  if (topic === "hipoteses") {
    return [
      "Hipóteses diagnósticas registradas.",
      "Perfeito, hipóteses anotadas no prontuário do caso.",
      "Hipóteses registradas. Quer que eu já consolide conduta e orientações em seguida?",
    ]
  }
  if (topic === "conduta") {
    return [
      "Conduta registrada com sucesso.",
      "Perfeito, conduta anotada no caso.",
      "Conduta registrada. Se quiser, eu já preparo um resumo final do atendimento.",
    ]
  }
  if (topic === "orientacoes") {
    return [
      "Orientações registradas no caso.",
      "Perfeito, orientações ao responsável anotadas com sucesso.",
      "Orientações registradas. Quer que eu resuma os pontos para o responsável?",
    ]
  }
  return [
    "Anotação clínica registrada no caso.",
    "Perfeito, atualização clínica salva no prontuário.",
    "Registro clínico concluído. Se quiser, eu organizo um resumo parcial.",
  ]
}

function buildDeterministicAcknowledgement(
  userMessage: string,
  messages: CaseMessage[],
): string {
  const topic = detectAcknowledgementTopic(userMessage)
  const templates = topicAcknowledgementTemplates(topic)
  const recentReplies = listRecentAssistantReplies(messages, 2)

  for (const template of templates) {
    const repeats = recentReplies.some((previous) =>
      areNearDuplicateReplies(template, previous),
    )
    if (!repeats) return template
  }

  return templates[0]
}

function enforceReplyVariation(
  userMessage: string,
  reply: string,
  messages: CaseMessage[],
): string {
  const recentReplies = listRecentAssistantReplies(messages, 2)
  const isRepeated = recentReplies.some((previous) =>
    areNearDuplicateReplies(reply, previous),
  )
  if (!isRepeated) return reply
  if (!isLikelyDictationMessage(userMessage)) return reply
  return buildDeterministicAcknowledgement(userMessage, messages)
}

function parseNumericValue(labelValue: string): number | null {
  const match = labelValue.replace(",", ".").match(/(\d+(?:\.\d+)?)/)
  if (!match) return null
  return Number(match[1])
}

function parseHeadCircumferenceCmFromMessage(userMessage: string): number | null {
  const normalized = normalizeText(userMessage).replace(",", ".")
  const directMatch = normalized.match(/\b(pc|perimetro cefalico)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*cm?\b/i)
  if (directMatch) {
    const value = Number(directMatch[2])
    if (Number.isFinite(value) && value >= 20 && value <= 70) return value
  }
  return null
}

function parseBloodTypeFromMessage(userMessage: string): string | null {
  const normalized = normalizeText(userMessage)
  const simple = normalized.match(/\b([aboab]{1,2})\s*(positivo|negativo)\b/i)
  if (simple) {
    const abo = simple[1].toUpperCase().replace(/[^ABO]/g, "")
    const rh = /positivo/i.test(simple[2]) ? "+" : "-"
    if (abo.length >= 1 && abo.length <= 2) return `${abo}${rh}`
  }
  const symbol = normalized.match(/\b([abio]{1,2})\s*([+-])\b/i)
  if (symbol) {
    const abo = symbol[1].toUpperCase().replace(/[^ABO]/g, "")
    const rh = symbol[2]
    if (abo.length >= 1 && abo.length <= 2) return `${abo}${rh}`
  }
  return null
}

function parseLabeledTextValue(
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

function parseContactPhoneFromMessage(userMessage: string): string | null {
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

function parseBirthDateFromMessage(userMessage: string): string | null {
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

function parseSexFromMessage(userMessage: string): string | null {
  const n = normalizeText(userMessage)
  if (/\bsexo\s*[:=]?\s*masculino\b|\btipicamente masculina\b/.test(n)) return "male"
  if (/\bsexo\s*[:=]?\s*feminino\b|\btipicamente feminina\b/.test(n)) return "female"
  return null
}

function normalizeComparableText(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = normalizeText(value).replace(/\s+/g, " ").trim()
  return normalized.length > 0 ? normalized : null
}

function normalizePatientHeightToCm(value: string | null | undefined): number | null {
  if (!value) return null
  const numeric = parseNumericValue(value)
  if (numeric == null) return null
  return numeric <= 3 ? numeric * 100 : numeric
}

function detectPatientProfileUpdateCandidate(params: {
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

  const parsedAnthro = parseWeightHeightForBmi(params.userMessage)
  if (parsedAnthro.weightKg != null) {
    const nextWeight = parsedAnthro.weightKg.toFixed(3).replace(/\.?0+$/, "")
    const currentWeight = profile.weight ? Number(profile.weight.replace(",", ".")) : null
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
    const current = profile.sex?.trim().toLowerCase() ?? null
    if (current !== nextSex) {
      updates.sex = nextSex
      summaryLines.push(`Sexo: ${nextSex === "male" ? "Masculino" : "Feminino"}`)
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

  const nextAllergies = parseLabeledTextValue(params.userMessage, [
    "alergias",
    "alergia",
  ])
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

/** User message that likely carries anthropometrics / profile fields (not a bare confirm/cancel). */
function looksLikePatientProfileDictation(userMessage: string): boolean {
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

function findLatestPatientProfileUpdateCandidateFromThread(params: {
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
    if (looksLikePatientProfileDictation(message.content)) {
      return null
    }
  }
  return null
}

function hasRecentPatientProfileUpdateConfirmation(messages: CaseMessage[]): boolean {
  const confirmationMarkers = [
    "vou atualizar os dados do paciente com as informações confirmadas",
    "dados do paciente atualizados com sucesso",
    "perfil do paciente atualizado",
  ]

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message.role !== "assistant") continue
    const normalizedContent = normalizeText(message.content)
    if (confirmationMarkers.some((marker) => normalizedContent.includes(marker))) {
      return true
    }
  }

  return false
}

function formatBmiConfirmationReply(params: {
  bmiValue: string
  weightValue: string | null
  heightValue: string | null
}): string {
  const weightNumber = params.weightValue ? parseNumericValue(params.weightValue) : null
  const heightNumber = params.heightValue ? parseNumericValue(params.heightValue) : null
  const weightText = weightNumber != null ? `${weightNumber.toFixed(3).replace(/\.?0+$/, "")} kg` : null
  const heightText = heightNumber != null ? `${heightNumber.toFixed(1)} cm` : null

  if (weightText && heightText) {
    return `IMC confirmado: ${params.bmiValue}. Mantive o registro com peso ${weightText} e comprimento/altura ${heightText}.`
  }
  return `IMC confirmado: ${params.bmiValue}.`
}

function isBmiConfirmationMessage(userMessage: string): boolean {
  const n = normalizeText(userMessage)
  return (
    /\bimc\b/.test(n) &&
    (/confirmad/.test(n) || /\bconfirmo\b/.test(n) || /\bpode confirmar\b/.test(n))
  )
}

function getLatestPendingBmiFromAssistantMessages(messages: CaseMessage[]): {
  bmiValue: string
  weightValue: string | null
  heightValue: string | null
} | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message.role !== "assistant") continue
    const payload = parseAssistantPayloadLite(message.content)
    const items = payload?.storedData?.items
    if (!items || items.length === 0) continue

    const pendingBmi = items.find(
      (item) =>
        normalizeText(item.label).includes("imc") &&
        item.status === "pendente_de_confirmacao",
    )
    if (!pendingBmi) continue

    const weightItem = items.find(
      (item) =>
        normalizeText(item.label) === "peso" && item.status === "confirmado",
    )
    const heightItem = items.find(
      (item) =>
        normalizeText(item.label).includes("comprimento / altura") &&
        item.status === "confirmado",
    )

    return {
      bmiValue: pendingBmi.value,
      weightValue: weightItem?.value ?? null,
      heightValue: heightItem?.value ?? null,
    }
  }
  return null
}

function getLatestConfirmedAnthropometricsFromAssistantMessages(messages: CaseMessage[]): {
  weightKg: number | null
  heightM: number | null
} {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message.role !== "assistant") continue
    const payload = parseAssistantPayloadLite(message.content)
    const items = payload?.storedData?.items
    if (!items || items.length === 0) continue

    const weightItem = items.find(
      (item) => normalizeText(item.label) === "peso" && item.status === "confirmado",
    )
    const heightItem = items.find(
      (item) =>
        normalizeText(item.label).includes("comprimento / altura") &&
        item.status === "confirmado",
    )

    const weightValue = weightItem ? parseNumericValue(weightItem.value) : null
    const heightCm = heightItem ? parseNumericValue(heightItem.value) : null
    const heightValue = heightCm != null ? heightCm / 100 : null

    if (weightValue != null || heightValue != null) {
      return { weightKg: weightValue, heightM: heightValue }
    }
  }

  return { weightKg: null, heightM: null }
}

/**
 * Last weight/height from user dictation in the thread (not necessarily confirmed in assistant storedData).
 * Scans newest user messages first; fills missing side from older user messages when needed.
 */
function getLatestAnthropometricsFromUserMessages(messages: CaseMessage[]): {
  weightKg: number | null
  heightM: number | null
} {
  let weightKg: number | null = null
  let heightM: number | null = null
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message.role !== "user") continue
    if (isCommandLikeMessage(message.content)) continue
    const parsed = parseWeightHeightForBmi(message.content)
    if (weightKg == null && parsed.weightKg != null) weightKg = parsed.weightKg
    if (heightM == null && parsed.heightM != null) heightM = parsed.heightM
    if (weightKg != null && heightM != null) break
  }
  return { weightKg, heightM }
}

function extractExplicitGuardianAlertsHint(messages: CaseMessage[]): string | null {
  const confirmedAlerts: string[] = []

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message.role !== "assistant") continue
    const payload = parseAssistantPayloadLite(message.content)
    const items = payload?.storedData?.items ?? []
    for (const item of items) {
      if (
        item.section === "ALERTAS_CLINICOS" &&
        item.status === "confirmado" &&
        item.value.trim().length > 0
      ) {
        confirmedAlerts.push(item.value.trim())
      }
    }
  }

  const uniqueConfirmed = Array.from(new Set(confirmedAlerts)).slice(0, 3)
  if (uniqueConfirmed.length > 0) {
    return uniqueConfirmed.map((item) => `- ${item}`).join("\n")
  }

  const alerts: string[] = []

  for (const message of messages) {
    if (message.role !== "user") continue
    if (isCommandLikeMessage(message.content)) continue
    const content = message.content.trim()
    if (content.length < 8) continue
    if (!hasExplicitGuardianAlertSignal(content)) continue

    const singleLine = content.replace(/\s+/g, " ").trim()
    if (singleLine.length === 0) continue
    alerts.push(singleLine)
  }

  const uniqueAlerts = Array.from(new Set(alerts)).slice(-3)
  if (uniqueAlerts.length === 0) return null
  return uniqueAlerts.map((item) => `- ${item}`).join("\n")
}

function formatPtDecimal(value: number, fractionDigits = 1): string {
  return value.toFixed(fractionDigits).replace(".", ",")
}

function buildAnthropometrySummaryLine(params: {
  weightKg: number | null
  heightM: number | null
}): string | null {
  if (params.weightKg == null && params.heightM == null) return null
  const parts: string[] = []
  if (params.weightKg != null) {
    parts.push(`peso ${params.weightKg.toFixed(3).replace(/\.?0+$/, "")} kg`)
  }
  if (params.heightM != null) {
    parts.push(`comprimento ${formatPtDecimal(params.heightM * 100, 1)} cm`)
  }
  if (params.weightKg != null && params.heightM != null) {
    const bmiResult = computePediatricBmi(params.weightKg, params.heightM)
    if (bmiResult.ok) {
      parts.push(`IMC ≈ ${formatPtDecimal(bmiResult.bmi, 1)}`)
    }
  }
  return `• Dados antropométricos: ${parts.join(", ")}.`
}

function enforceAnthropometrySourceOfTruthInSummary(
  summaryReply: string,
  latestMetrics: { weightKg: number | null; heightM: number | null },
): string {
  const line = buildAnthropometrySummaryLine(latestMetrics)
  if (!line) return summaryReply

  const lines = summaryReply.split("\n")
  const anthropometricLineIndex = lines.findIndex((current) =>
    /\bdados\s+antropometric/i.test(normalizeText(current)),
  )

  if (anthropometricLineIndex >= 0) {
    lines[anthropometricLineIndex] = line
    return lines.join("\n")
  }

  const firstBulletIndex = lines.findIndex((current) => current.trim().startsWith("• "))
  if (firstBulletIndex >= 0) {
    lines.splice(firstBulletIndex + 1, 0, line)
    return lines.join("\n")
  }

  return `${line}\n${summaryReply}`
}

function resolveSummaryAnthropometrics(params: {
  messages: CaseMessage[]
  patientMetrics?: { weight: number | null; height: number | null }
}): { weightKg: number | null; heightM: number | null } {
  const fromThread = getLatestConfirmedAnthropometricsFromAssistantMessages(params.messages)
  const hasThreadWeight = fromThread.weightKg != null
  const hasThreadHeight = fromThread.heightM != null

  if (hasThreadWeight || hasThreadHeight) {
    return {
      weightKg: fromThread.weightKg,
      heightM: fromThread.heightM,
    }
  }

  return {
    weightKg: params.patientMetrics?.weight ?? null,
    heightM: params.patientMetrics?.height ?? null,
  }
}

/** Scopes structured clinical blocks: last user turn only vs full thread consolidation. */
function resolveClinicalSyncMode(userMessage: string): ClinicalSyncMode {
  const n = normalizeText(userMessage)
  if (
    /\bresumo\s+global\b/.test(n) ||
    /\bvisao\s+geral\b/.test(n) ||
    /\bconsolidar\b.*\batendimento\b/.test(n) ||
    /\batualizar\s+resumo\b/.test(n) ||
    /\bsintese\s+do\s+caso\b/.test(n) ||
    /\bpanorama\s+clinico\b/.test(n)
  ) {
    return "global_update"
  }
  if (/\bhipotese/.test(n) || /\bhipoteses\b/.test(n)) {
    return "single_turn"
  }
  if (userMessage.length < 2400) {
    return "single_turn"
  }
  return "balanced"
}

export function detectDashboardAssistantIntent(message: string): DashboardAssistantIntent {
  const normalized = normalizeText(message)

  if (normalized.includes("/resumo") || normalized.includes("resumir principais pontos")) {
    return "SUMMARY"
  }
  if (
    normalized.includes("/imc") ||
    normalized.includes("calcular imc") ||
    /\bimc\b/.test(normalized) ||
    /\bindice\s+de\s+massa(\s+corporal)?\b/.test(normalized)
  ) {
    return "CALCULATE_BMI"
  }
  if (
    normalized.includes("sugerir perguntas para o responsavel") ||
    normalized.includes("sugererir perguntas ao responsavel") ||
    normalized.includes("sugerir perguntas ao responsavel")
  ) {
    return "SUGGEST_GUARDIAN_QUESTIONS"
  }
  if (normalized.includes("/relatorio") || normalized.includes("gerar relatorio")) {
    return "GENERATE_REPORT"
  }
  if (normalized.includes("/atestado") || normalized.includes("gerar atestado")) {
    return "GENERATE_MEDICAL_CERTIFICATE"
  }
  if (normalized.includes("/receita") || normalized.includes("gerar receita")) {
    return "GENERATE_PRESCRIPTION"
  }
  if (
    normalized.includes("/encerrar") ||
    normalized.includes("encerrar caso") ||
    normalized.includes("fechar caso")
  ) {
    return "CLOSE_CASE"
  }

  if (isQuestionLikeMessage(message)) {
    return "QUESTION"
  }

  return "CHAT"
}

function isCommandLikeMessage(content: string): boolean {
  const normalized = normalizeText(content)
  return (
    normalized.includes("/resumo") ||
    normalized.includes("/imc") ||
    /\bimc\b/.test(normalized) ||
    normalized.includes("/relatorio") ||
    normalized.includes("/encerrar") ||
    normalized.includes("/atestado") ||
    normalized.includes("/receita") ||
    normalized.includes("resumir principais pontos") ||
    normalized.includes("calcular imc") ||
    normalized.includes("sugerir perguntas para o responsavel") ||
    normalized.includes("sugererir perguntas ao responsavel") ||
    normalized.includes("sugerir perguntas ao responsavel") ||
    normalized.includes("gerar relatorio") ||
    normalized.includes("encerrar caso") ||
    normalized.includes("gerar atestado") ||
    normalized.includes("gerar receita") ||
    normalized.includes("confirmar geracao de relatorio") ||
    normalized.includes("confirmar geracao de atestado") ||
    normalized.includes("confirmar geracao de receita") ||
    normalized.includes("confirmar atualização dos dados do paciente") ||
    normalized.includes("confirmar atualizacao dos dados do paciente") ||
    normalized.includes("não atualizar dados do paciente") ||
    normalized.includes("nao atualizar dados do paciente") ||
    normalized.includes("confirmar novos dados antropometricos") ||
    normalized.includes("usar novos dados antropometricos") ||
    normalized.includes("manter valores anteriores") ||
    normalized.includes("manter dados anteriores") ||
    normalized.includes("salvar alerta para resumo e relatorio") ||
    normalized.includes("confirmar armazenamento de alerta") ||
    normalized.includes("nao armazenar alerta") ||
    normalized.includes("não armazenar alerta") ||
    normalized.includes("cancelar acao") ||
    normalized.includes("cancelar ação")
  )
}

function substantiveUserMessageCount(messages: CaseMessage[]): number {
  return messages.filter(
    (message) => message.role === "user" && !isCommandLikeMessage(message.content),
  ).length
}

function buildThreadTextForAuxiliaryModel(messages: CaseMessage[]): string {
  const lines: string[] = []
  for (const message of messages) {
    if (message.role === "user" && isCommandLikeMessage(message.content)) {
      continue
    }
    const label = message.role === "user" ? "Médico" : "Falaped"
    const body =
      message.role === "assistant"
        ? assistantMessageToModelText(message.content)
        : message.content.trim()
    if (body.length > 0) {
      lines.push(`${label}: ${body}`)
    }
  }
  const joined = lines.join("\n\n")
  return joined.length > 14_000 ? joined.slice(-14_000) : joined
}

function buildMessagesForModel(
  messages: CaseMessage[],
  userMessage: string,
): Array<{ role: "user" | "assistant"; content: string }> {
  const mappedMessages = messages.map((message) => ({
    role: message.role,
    content:
      message.role === "assistant"
        ? assistantMessageToModelText(message.content)
        : message.content,
  }))

  const lastMessage = messages[messages.length - 1]
  const endsWithSameUser =
    lastMessage?.role === "user" && lastMessage.content.trim() === userMessage.trim()

  return endsWithSameUser
    ? mappedMessages
    : [...mappedMessages, { role: "user" as const, content: userMessage }]
}

function extractStoredData(message: string): StoredDataItem[] {
  const data: StoredDataItem[] = []
  const normalized = normalizeText(message).replace(",", ".")

  if (normalized.includes("conduta")) {
    data.push({
      section: "CONDUTA",
      label: "Conduta informada",
      value: message.trim(),
      status: "confirmado",
    })
  }

  const parsed = parseWeightHeightForBmi(message)
  if (parsed.weightKg) {
    data.push({
      section: "DADOS_ANTROPOMETRICOS",
      label: "Peso",
      value: `${parsed.weightKg.toFixed(3).replace(/\.?0+$/, "")} kg`,
      status: "confirmado",
    })
  }
  if (parsed.heightM) {
    data.push({
      section: "DADOS_ANTROPOMETRICOS",
      label: "Comprimento / altura",
      value: `${(parsed.heightM * 100).toFixed(1)} cm`,
      status: "confirmado",
    })
  }

  if (parsed.weightKg && parsed.heightM) {
    const bmiResult = computePediatricBmi(parsed.weightKg, parsed.heightM)
    if (bmiResult.ok) {
      data.push({
        section: "DADOS_ANTROPOMETRICOS",
        label: "IMC estimado",
        value: bmiResult.bmi.toFixed(1),
        status: "pendente_de_confirmacao",
      })
    }
  }

  return data
}

function buildBmiStoredData(params: {
  weightKg: number
  heightM: number
  bmi: number
}): StoredDataItem[] {
  const heightMetersRounded = params.heightM.toFixed(3)
  const heightSquared = (params.heightM * params.heightM).toFixed(5)
  const weightRounded = params.weightKg.toFixed(3)
  const heightCmDisplay = (params.heightM * 100).toFixed(1)

  const details = [
    "Fórmula: peso (kg) ÷ altura (m)².",
    `Conta: ${weightRounded} kg ÷ (${heightMetersRounded} m)² = ${weightRounded} ÷ ${heightSquared} ≈ ${params.bmi.toFixed(1)}.`,
    `Dados utilizados neste cálculo: peso ${weightRounded} kg e comprimento/altura ${heightCmDisplay} cm (altura em metros: ${heightMetersRounded} m).`,
    "Confirme se esses valores estão corretos antes de registrar.",
  ].join("\n")

  return [
    {
      section: "DADOS_ANTROPOMETRICOS",
      label: "Peso",
      value: `${weightRounded.replace(/\.?0+$/, "")} kg`,
      status: "confirmado",
    },
    {
      section: "DADOS_ANTROPOMETRICOS",
      label: "Comprimento / altura",
      value: `${heightCmDisplay} cm`,
      status: "confirmado",
    },
    {
      section: "DADOS_ANTROPOMETRICOS",
      label: "IMC estimado",
      value: params.bmi.toFixed(1),
      status: "pendente_de_confirmacao",
    },
    {
      section: "CALCULO_IMC",
      label: "Detalhes do cálculo",
      value: details,
      status: "confirmado",
    },
  ]
}

function detectAnthropometricReferenceChange(params: {
  userMessage: string
  patientMetrics?: { weight: number | null; height: number | null }
}): { hasChange: boolean; weightKg: number | null; heightM: number | null } {
  const parsed = parseWeightHeightForBmi(params.userMessage)
  const weightKg = parsed.weightKg ?? null
  const heightM = parsed.heightM ?? null
  if (weightKg == null && heightM == null) {
    return { hasChange: false, weightKg: null, heightM: null }
  }

  const currentWeight = params.patientMetrics?.weight ?? null
  const currentHeight = params.patientMetrics?.height ?? null

  const weightChanged =
    weightKg != null && currentWeight != null && Math.abs(weightKg - currentWeight) >= 0.05
  const heightChanged =
    heightM != null && currentHeight != null && Math.abs(heightM - currentHeight) >= 0.005

  return {
    hasChange: weightChanged || heightChanged,
    weightKg,
    heightM,
  }
}

/** Prioritize latest confirmed anthropometric values from thread, fallback to patient profile. */
function formatLatestAnthropometricsHint(params: {
  messages: CaseMessage[]
  patientMetrics?: { weight: number | null; height: number | null }
}): string | null {
  const resolved = resolveSummaryAnthropometrics(params)
  if (resolved.weightKg == null && resolved.heightM == null) return null

  const parts: string[] = []
  if (resolved.weightKg != null) {
    const weightLabel =
      Math.abs(resolved.weightKg - Math.round(resolved.weightKg)) < 1e-6
        ? String(resolved.weightKg)
        : resolved.weightKg.toFixed(3).replace(/\.?0+$/, "")
    parts.push(`peso ${weightLabel} kg`)
  }
  if (resolved.heightM != null) {
    parts.push(`comprimento/altura ${(resolved.heightM * 100).toFixed(1)} cm`)
  }

  return `Referência antropométrica mais recente para este caso: ${parts.join(", ")}.`
}

export async function routeDashboardCaseAssistantTurn(params: {
  userMessage: string
  messages: CaseMessage[]
  pendingAction: string | null
  patientContext: string | null
  conversationSummary: string | null
  patientMetrics?: { weight: number | null; height: number | null }
  patientProfile?: PatientProfileSnapshot
}): Promise<RoutedAssistantTurn> {
  const baseIntent = detectDashboardAssistantIntent(params.userMessage)
  const normalized = normalizeText(params.userMessage)
  const hasQuestionCue = /\?|\b(como|qual|quais|devo|deveria|estrategia|por que|porque)\b/.test(
    normalized,
  )
  const aiDetectedQuestionIntent =
    baseIntent === "CHAT" &&
    hasQuestionCue &&
    params.userMessage.trim().length >= 18 &&
    params.userMessage.trim().length <= 320
      ? await classifyQuestionIntentByAi({ userMessage: params.userMessage })
      : false
  const anthropometricChange = detectAnthropometricReferenceChange({
    userMessage: params.userMessage,
    patientMetrics: params.patientMetrics,
  })
  const hasGuardianAlertSignal = hasExplicitGuardianAlertSignal(params.userMessage)
  const patientUpdateCandidate = detectPatientProfileUpdateCandidate({
    userMessage: params.userMessage,
    patientProfile: params.patientProfile,
  })

  const baseIntentsThatBlockPatientProfileReview: DashboardAssistantIntent[] = [
    "CALCULATE_BMI",
    "SUMMARY",
    "GENERATE_REPORT",
    "GENERATE_MEDICAL_CERTIFICATE",
    "GENERATE_PRESCRIPTION",
    "CLOSE_CASE",
    "SUGGEST_GUARDIAN_QUESTIONS",
  ]
  const shouldPrioritizePatientProfileUpdate =
    Boolean(patientUpdateCandidate) &&
    !baseIntentsThatBlockPatientProfileReview.includes(baseIntent)

  const intent: DashboardAssistantIntent = shouldPrioritizePatientProfileUpdate
    ? "REVIEW_PATIENT_PROFILE_UPDATE"
    : (baseIntent === "QUESTION" || aiDetectedQuestionIntent)
      ? "QUESTION"
      : baseIntent === "CHAT" && anthropometricChange.hasChange
        ? "REVIEW_ANTHROPOMETRIC_REFERENCE"
        : baseIntent === "CHAT" && hasGuardianAlertSignal
          ? "REVIEW_GUARDIAN_ALERT"
          : baseIntent

  const confirmsReport = normalized.includes("confirmar geracao de relatorio")
  const confirmsMedicalCertificate = normalized.includes(
    "confirmar geracao de atestado",
  )
  const confirmsPrescription = normalized.includes("confirmar geracao de receita")
  const confirmsAnthropometricReference =
    normalized.includes("confirmar novos dados antropometricos") ||
    normalized.includes("usar novos dados antropometricos")
  const keepsPreviousAnthropometricReference =
    normalized.includes("manter valores anteriores") ||
    normalized.includes("manter dados anteriores")
  const confirmsGuardianAlertStorage =
    normalized.includes("confirmar armazenamento de alerta") ||
    normalized.includes("salvar alerta para resumo e relatorio")
  const declinesGuardianAlertStorage =
    normalized.includes("nao armazenar alerta") ||
    normalized.includes("não armazenar alerta")
  const confirmsPatientProfileUpdate =
    normalized.includes("confirmar atualização dos dados do paciente") ||
    normalized.includes("confirmar atualizacao dos dados do paciente")
  const declinesPatientProfileUpdate =
    normalized.includes("não atualizar dados do paciente") ||
    normalized.includes("nao atualizar dados do paciente")
  const cancelsAction =
    normalized.includes("cancelar acao") ||
    normalized.includes("cancelar ação") ||
    normalized === "cancelar"

  const confirms = [
    "confirmar",
    "sim, confirmar",
    "sim",
    "pode confirmar",
    "confirmar encerramento",
    "confirmar geracao",
  ]
  const userConfirmed = confirms.some((term) => normalized.includes(term))

  if (confirmsPatientProfileUpdate) {
    const fallbackCandidate = findLatestPatientProfileUpdateCandidateFromThread({
      messages: params.messages,
      patientProfile: params.patientProfile,
    })
    if (!fallbackCandidate) {
      const alreadyConfirmedInThread = hasRecentPatientProfileUpdateConfirmation(
        params.messages,
      )

      return {
        intent: "REVIEW_PATIENT_PROFILE_UPDATE",
        reply: alreadyConfirmedInThread
          ? "Os dados do paciente já foram confirmados e atualizados nesta conversa."
          : "Não encontrei dados recentes para atualizar no perfil do paciente. Envie novamente os valores que deseja salvar.",
        action: "none",
        showStructuredCard: false,
        showAlert: false,
        storedData: [],
      }
    }
    return {
      intent: "REVIEW_PATIENT_PROFILE_UPDATE",
      reply: "Perfeito. Vou atualizar os dados do paciente com as informações confirmadas.",
      action: "confirm_update_patient_profile",
      showStructuredCard: true,
      showAlert: false,
      storedData: [],
      patientProfileUpdatePayload: fallbackCandidate.updates,
    }
  }

  if (declinesPatientProfileUpdate) {
    return {
      intent: "REVIEW_PATIENT_PROFILE_UPDATE",
      reply: "Tudo bem, mantive os dados atuais do paciente sem alterações.",
      action: "none",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  if (confirmsAnthropometricReference) {
    const latestConfirmed = getLatestConfirmedAnthropometricsFromAssistantMessages(
      params.messages,
    )
    const parsed = parseWeightHeightForBmi(params.userMessage)
    const weight =
      parsed.weightKg ??
      latestConfirmed.weightKg ??
      anthropometricChange.weightKg ??
      params.patientMetrics?.weight ??
      null
    const height =
      parsed.heightM ??
      latestConfirmed.heightM ??
      anthropometricChange.heightM ??
      params.patientMetrics?.height ??
      null
    const storedData: StoredDataItem[] = []

    if (weight != null) {
      storedData.push({
        section: "DADOS_ANTROPOMETRICOS",
        label: "Peso (referência confirmada)",
        value: `${weight.toFixed(3).replace(/\.?0+$/, "")} kg`,
        status: "confirmado",
      })
    }
    if (height != null) {
      storedData.push({
        section: "DADOS_ANTROPOMETRICOS",
        label: "Comprimento / altura (referência confirmada)",
        value: `${(height * 100).toFixed(1)} cm`,
        status: "confirmado",
      })
    }

    return {
      intent: "REVIEW_ANTHROPOMETRIC_REFERENCE",
      reply:
        "Perfeito, novos dados antropométricos confirmados como referência para resumo e relatório.",
      action: "confirm_anthropometric_reference",
      showStructuredCard: true,
      showAlert: false,
      storedData,
    }
  }

  if (keepsPreviousAnthropometricReference) {
    return {
      intent: "REVIEW_ANTHROPOMETRIC_REFERENCE",
      reply:
        "Entendido. Mantive os valores anteriores como referência principal para resumo e relatório.",
      action: "none",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  if (confirmsGuardianAlertStorage) {
    const latestAlert = extractExplicitGuardianAlertsHint(params.messages)
    const alertValue =
      latestAlert?.split("\n").at(-1)?.replace(/^- /, "").trim() ??
      "Alerta clínico do responsável confirmado."

    return {
      intent: "REVIEW_GUARDIAN_ALERT",
      reply:
        "Alerta salvo com sucesso. Vou priorizar esse ponto nos próximos resumos e no relatório.",
      action: "confirm_guardian_alert_storage",
      showStructuredCard: true,
      showAlert: false,
      storedData: [
        {
          section: "ALERTAS_CLINICOS",
          label: "Alerta do responsável",
          value: alertValue,
          status: "confirmado",
        },
      ],
    }
  }

  if (declinesGuardianAlertStorage) {
    return {
      intent: "REVIEW_GUARDIAN_ALERT",
      reply:
        "Perfeito. O alerta não será destacado como item obrigatório no resumo ou relatório.",
      action: "none",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  if (cancelsAction) {
    return {
      intent: "CHAT",
      reply: "Ação cancelada. Pode continuar o registro clínico quando desejar.",
      action: "none",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  if (params.pendingAction === "close_case" && userConfirmed) {
    return {
      intent: "CLOSE_CASE",
      reply: "Confirmação recebida. Vou encerrar o caso agora.",
      action: "confirm_close_case",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  if (params.pendingAction === "generate_report" && userConfirmed) {
    return {
      intent: "GENERATE_REPORT",
      reply: "Confirmação recebida. Vou gerar o relatório deste caso agora.",
      action: "confirm_generate_report",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  if (params.pendingAction === "generate_medical_certificate" && userConfirmed) {
    return {
      intent: "GENERATE_MEDICAL_CERTIFICATE",
      reply: "Confirmação recebida. Vou iniciar a geração do atestado.",
      action: "confirm_generate_medical_certificate",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  if (params.pendingAction === "generate_prescription" && userConfirmed) {
    return {
      intent: "GENERATE_PRESCRIPTION",
      reply: "Confirmação recebida. Vou iniciar a geração da receita.",
      action: "confirm_generate_prescription",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  if (confirmsReport) {
    return {
      intent: "GENERATE_REPORT",
      reply: "Confirmação recebida. Vou gerar o relatório deste caso agora.",
      action: "confirm_generate_report",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  if (confirmsMedicalCertificate) {
    return {
      intent: "GENERATE_MEDICAL_CERTIFICATE",
      reply: "Confirmação recebida. Vou iniciar a geração do atestado.",
      action: "confirm_generate_medical_certificate",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  if (confirmsPrescription) {
    return {
      intent: "GENERATE_PRESCRIPTION",
      reply: "Confirmação recebida. Vou iniciar a geração da receita.",
      action: "confirm_generate_prescription",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  if (intent === "CLOSE_CASE") {
    return {
      intent,
      reply: "Para encerrar com segurança, confirme a intenção e depois a execução.",
      action: "none",
      showStructuredCard: true,
      showAlert: false,
      storedData: [],
    }
  }

  if (intent === "GENERATE_REPORT") {
    return {
      intent,
      reply:
        "Posso gerar o relatório no thread deste caso. Confirme para continuar com a geração.",
      action: "none",
      showStructuredCard: true,
      showAlert: false,
      storedData: [],
    }
  }

  if (intent === "GENERATE_MEDICAL_CERTIFICATE") {
    return {
      intent,
      reply:
        "Posso iniciar a geração do atestado com os dados atuais do caso. Confirme para continuar.",
      action: "none",
      showStructuredCard: true,
      showAlert: false,
      storedData: [],
    }
  }

  if (intent === "GENERATE_PRESCRIPTION") {
    return {
      intent,
      reply:
        "Posso iniciar a geração da receita com os dados clínicos atuais. Confirme para continuar.",
      action: "none",
      showStructuredCard: true,
      showAlert: false,
      storedData: [],
    }
  }

  if (intent === "REVIEW_PATIENT_PROFILE_UPDATE" && patientUpdateCandidate) {
    return {
      intent,
      reply: `Identifiquei dados clínicos que podem atualizar o cadastro do paciente:\n- ${patientUpdateCandidate.summaryLines.join("\n- ")}\n\nDeseja confirmar a atualização desses dados no perfil do paciente?`,
      action: "none",
      showStructuredCard: true,
      showAlert: false,
      storedData: [],
      patientProfileUpdatePayload: patientUpdateCandidate.updates,
      showPatientProfileUpdateActions: true,
    }
  }

  if (intent === "QUESTION") {
    const questionMessages = buildMessagesForModel(params.messages, params.userMessage)
    let questionReply = await generateAssistantCaseChat({
      patientContext: params.patientContext,
      conversationSummary: params.conversationSummary,
      messages: questionMessages,
      clinicalSyncMode: "balanced",
      forbidBmiInReply: !messageRequestsBmi(params.userMessage),
    })

    questionReply = refineChatReplyAfterModel(params.userMessage, questionReply)

    if (
      questionReply.trim().length === 0 ||
      isReplyEchoingUserMessage(questionReply, params.userMessage) ||
      isDryAcknowledgementReply(questionReply)
    ) {
      questionReply =
        "Entendi sua pergunta. Posso te ajudar melhor se você confirmar os dados clínicos principais (peso, idade e objetivo da conduta) para eu responder de forma objetiva."
    }

    return {
      intent,
      reply: questionReply,
      action: "none",
      showStructuredCard: true,
      showAlert: false,
      storedData: [],
    }
  }

  if (intent === "REVIEW_ANTHROPOMETRIC_REFERENCE") {
    const previousWeight = params.patientMetrics?.weight
    const previousHeight = params.patientMetrics?.height
    const nextWeight = anthropometricChange.weightKg
    const nextHeight = anthropometricChange.heightM

    const previousWeightText =
      previousWeight != null ? `${previousWeight.toFixed(3).replace(/\.?0+$/, "")} kg` : "não informado"
    const previousHeightText =
      previousHeight != null ? `${(previousHeight * 100).toFixed(1)} cm` : "não informado"
    const nextWeightText =
      nextWeight != null ? `${nextWeight.toFixed(3).replace(/\.?0+$/, "")} kg` : "não informado"
    const nextHeightText =
      nextHeight != null ? `${(nextHeight * 100).toFixed(1)} cm` : "não informado"

    return {
      intent,
      reply: `Detectei novos dados antropométricos neste registro.\n\nAtuais de referência: peso ${previousWeightText}, comprimento/altura ${previousHeightText}.\nNovos informados agora: peso ${nextWeightText}, comprimento/altura ${nextHeightText}.\n\nDeseja confirmar os novos valores como referência principal para resumo e relatório?`,
      action: "none",
      showStructuredCard: true,
      showAlert: false,
      storedData: extractStoredData(params.userMessage),
    }
  }

  if (intent === "REVIEW_GUARDIAN_ALERT") {
    return {
      intent,
      reply:
        "Identifiquei uma queixa importante do responsável nesta mensagem. Deseja armazenar esse alerta para priorizar nos próximos resumos e no relatório?",
      action: "none",
      showStructuredCard: true,
      showAlert: true,
      storedData: [],
    }
  }

  if (intent === "SUMMARY") {
    if (substantiveUserMessageCount(params.messages) === 0) {
      return {
        intent,
        reply:
          "Ainda não há conteúdo clínico suficiente para resumo. Registre sintomas, exame físico e conduta para continuar.",
        action: "none",
        showStructuredCard: false,
        showAlert: false,
        storedData: [],
      }
    }

    const threadText = buildThreadTextForAuxiliaryModel(params.messages)
    const summaryReplyRaw = await generateCaseClinicalSummary({
      clinicalThreadText: threadText,
      conversationSummary: params.conversationSummary,
      latestAnthropometricsHint: formatLatestAnthropometricsHint({
        messages: params.messages,
        patientMetrics: params.patientMetrics,
      }),
      explicitGuardianAlertsHint: extractExplicitGuardianAlertsHint(params.messages),
    })
    const latestAnthropometrics = resolveSummaryAnthropometrics({
      messages: params.messages,
      patientMetrics: params.patientMetrics,
    })
    const summaryReply = enforceAnthropometrySourceOfTruthInSummary(summaryReplyRaw, {
      weightKg: latestAnthropometrics.weightKg,
      heightM: latestAnthropometrics.heightM,
    })

    return {
      intent,
      reply: summaryReply,
      action: "none",
      showStructuredCard: true,
      showAlert: false,
      storedData: [],
    }
  }

  if (intent === "SUGGEST_GUARDIAN_QUESTIONS") {
    const threadText = buildThreadTextForAuxiliaryModel(params.messages)
    const guardianReply = await generateGuardianQuestionSuggestions({
      clinicalThreadText: threadText,
      conversationSummary: params.conversationSummary,
    })
    const replyText = guardianReply.trim().startsWith("Sugestões para o responsável")
      ? guardianReply
      : `Sugestões para o responsável:\n${guardianReply}`

    return {
      intent,
      reply: replyText,
      action: "none",
      showStructuredCard: true,
      showAlert: false,
      storedData: [],
    }
  }

  if (intent === "CALCULATE_BMI") {
    if (
      normalized.includes("nao confirmar imc") ||
      normalized.includes("não confirmar imc")
    ) {
      return {
        intent,
        reply:
          "Tudo bem. Não confirmei o IMC. Envie peso e comprimento/altura atualizados para recalcular.",
        action: "none",
        showStructuredCard: true,
        showAlert: false,
        storedData: [],
      }
    }

    if (isBmiConfirmationMessage(params.userMessage)) {
      const pendingBmi = getLatestPendingBmiFromAssistantMessages(params.messages)
      if (pendingBmi) {
        const confirmedStoredData: StoredDataItem[] = [
          {
            section: "DADOS_ANTROPOMETRICOS",
            label: "IMC estimado",
            value: pendingBmi.bmiValue,
            status: "confirmado",
          },
        ]

        return {
          intent,
          reply: formatBmiConfirmationReply(pendingBmi),
          action: "none",
          showStructuredCard: true,
          showAlert: false,
          storedData: confirmedStoredData,
        }
      }
    }

    const parsed = parseWeightHeightForBmi(params.userMessage)
    const latestConfirmedAnthropometrics = getLatestConfirmedAnthropometricsFromAssistantMessages(
      params.messages,
    )
    const latestFromUserMessages = getLatestAnthropometricsFromUserMessages(params.messages)
    const weight =
      parsed.weightKg ??
      latestConfirmedAnthropometrics.weightKg ??
      latestFromUserMessages.weightKg ??
      params.patientMetrics?.weight ??
      null
    const height =
      parsed.heightM ??
      latestConfirmedAnthropometrics.heightM ??
      latestFromUserMessages.heightM ??
      params.patientMetrics?.height ??
      null

    if (!weight || !height) {
      return {
        intent,
        reply:
          "Para calcular IMC, preciso de peso (kg) e comprimento ou altura (cm) na mensagem ou no cadastro. Use rótulos claros (ex.: peso 3,45 kg, comprimento 51,5 cm).",
        action: "none",
        showStructuredCard: false,
        showAlert: false,
        storedData: [],
      }
    }

    const bmiResult = computePediatricBmi(weight, height)
    if (!bmiResult.ok) {
      return {
        intent,
        reply: bmiResult.reason,
        action: "none",
        showStructuredCard: true,
        showAlert: false,
        storedData: extractStoredData(params.userMessage),
      }
    }

    const reply = `IMC estimado: ${bmiResult.bmi.toFixed(1)}. Abra o ícone de informação para ver a fórmula e confirme os valores.`

    return {
      intent,
      reply,
      action: "none",
      showStructuredCard: true,
      showAlert: false,
      storedData: buildBmiStoredData({
        weightKg: weight,
        heightM: height,
        bmi: bmiResult.bmi,
      }),
    }
  }

  const mappedMessages = params.messages.map((message) => ({
    role: message.role,
    content:
      message.role === "assistant"
        ? assistantMessageToModelText(message.content)
        : message.content,
  }))

  const lastMessage = params.messages[params.messages.length - 1]
  const endsWithSameUser =
    lastMessage?.role === "user" &&
    lastMessage.content.trim() === params.userMessage.trim()

  const messagesForModel = endsWithSameUser
    ? mappedMessages
    : [...mappedMessages, { role: "user" as const, content: params.userMessage }]

  const clinicalSyncMode = resolveClinicalSyncMode(params.userMessage)

  /** Avoid ANAMNESE/EXAME/IMC echo from long thread after a prior IMC turn. */
  const vaccineOnlyMessages = [
    { role: "user" as const, content: params.userMessage },
  ]

  let reply: string
  if (isLikelyVaccineOrientationMessage(params.userMessage)) {
    reply = await generateAssistantCaseChat({
      patientContext: params.patientContext,
      conversationSummary: params.conversationSummary,
      messages: vaccineOnlyMessages,
      clinicalSyncMode: "single_turn",
      forbidBmiInReply: true,
      focusedAcknowledgement: "vaccine_orientation",
    })
    reply = refineChatReplyAfterModel(params.userMessage, reply)

    if (
      needsAntiBmiEchoRecovery(params.userMessage, reply) ||
      vaccineReplyViolatesCondutaOnly(reply)
    ) {
      reply = await generateAssistantCaseChat({
        patientContext: params.patientContext,
        conversationSummary: params.conversationSummary,
        messages: vaccineOnlyMessages,
        clinicalSyncMode: "single_turn",
        forbidBmiInReply: true,
        focusedAcknowledgement: "vaccine_orientation",
      })
      reply = refineChatReplyAfterModel(params.userMessage, reply)
    }

    if (
      needsAntiBmiEchoRecovery(params.userMessage, reply) ||
      vaccineReplyViolatesCondutaOnly(reply)
    ) {
      reply = await generateAssistantCaseChat({
        patientContext: params.patientContext,
        conversationSummary: params.conversationSummary,
        messages: vaccineOnlyMessages,
        clinicalSyncMode: "single_turn",
        forbidBmiInReply: true,
        focusedAcknowledgement: "vaccine_orientation",
      })
      reply = refineChatReplyAfterModel(params.userMessage, reply)
    }

    if (
      needsAntiBmiEchoRecovery(params.userMessage, reply) ||
      vaccineReplyViolatesCondutaOnly(reply)
    ) {
      reply =
        "CONDUTA: Orientações de vacinação registradas (SUS e particular conforme o texto enviado). Confira calendário local e idade da criança para datas de doses."
    }
  } else if (isLikelyDictationMessage(params.userMessage)) {
    reply = buildDeterministicAcknowledgement(params.userMessage, params.messages)
  } else {
    reply = await generateAssistantCaseChat({
      patientContext: params.patientContext,
      conversationSummary: params.conversationSummary,
      messages: messagesForModel,
      clinicalSyncMode,
    })
    reply = refineChatReplyAfterModel(params.userMessage, reply)

    if (needsAntiBmiEchoRecovery(params.userMessage, reply)) {
      reply = await generateAssistantCaseChat({
        patientContext: params.patientContext,
        conversationSummary: params.conversationSummary,
        messages: messagesForModel,
        clinicalSyncMode,
        forbidBmiInReply: true,
      })
      reply = refineChatReplyAfterModel(params.userMessage, reply)
    }

    if (needsAntiBmiEchoRecovery(params.userMessage, reply)) {
      reply =
        "CONDUTA: Registro recebido. Revise o texto enviado para os detalhes; IMC não foi solicitado neste turno."
    }
  }

  if (isLikelyDictationMessage(params.userMessage) && isReplyEchoingUserMessage(reply, params.userMessage)) {
    reply = buildDeterministicAcknowledgement(params.userMessage, params.messages)
  }

  reply = enforceReplyVariation(params.userMessage, reply, params.messages)

  const showAlert = /alerta|urgencia|gravidade|risco/.test(normalized)
  const storedData = extractStoredData(params.userMessage)
  const showStructuredCard =
    storedData.length >= 2 ||
    /analise|resumo|conduta|exame|anamnese|hipotese|hipoteses/.test(normalized)

  return {
    intent,
    reply,
    action: "none",
    showStructuredCard,
    showAlert,
    storedData,
  }
}

