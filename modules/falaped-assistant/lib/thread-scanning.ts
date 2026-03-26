import type { CaseMessage } from "@/modules/cases/get-case-by-id"
import { normalizeText, normalizeForNearDuplicate } from "@/modules/falaped-assistant/lib/normalize-text"
import { parseNumericValue } from "@/modules/falaped-assistant/lib/patient-profile-parsers"
import { isCommandLikeMessage, isGuardianAlertConfirmOrDeclineMessage } from "@/modules/falaped-assistant/lib/message-classification"
import { assistantMessageToModelText } from "@/modules/falaped-assistant/assistant-model-message"
import {
  hasExplicitGuardianQuotedOrShoutSignal,
} from "@/modules/falaped-assistant/clinical-alert-from-user-message"
import {
  parseWeightHeightForBmi,
  stripNeonatalBirthMeasuresFromParsedAnthropometrics,
} from "@/lib/parse-anthropometrics-for-bmi"

import type { ClinicalSyncMode } from "@/modules/groq/assistant-case-chat"
export type { ClinicalSyncMode }

const ASSISTANT_PAYLOAD_PREFIX = "__FALAPED_JSON__"

type AssistantStoredDataPayloadItem = {
  section: string
  label: string
  value: string
  status: string
}

type AssistantPayloadLite = {
  content: string
  storedData?: {
    items: AssistantStoredDataPayloadItem[]
  }
  actions?: Array<{ id?: string }>
  clinicalAlertItems?: Array<unknown>
  showAlertCompact?: boolean
}

function parseAssistantPayloadLite(rawContent: string): AssistantPayloadLite | null {
  const raw = rawContent.trim()
  if (!raw.startsWith(ASSISTANT_PAYLOAD_PREFIX)) return null
  try {
    const parsed = JSON.parse(raw.slice(ASSISTANT_PAYLOAD_PREFIX.length)) as AssistantPayloadLite
    if (!parsed || typeof parsed !== "object") return null
    if (typeof parsed.content !== "string") return null
    return parsed
  } catch {
    return null
  }
}

function assistantPayloadPromptedAlertStorage(rawContent: string): boolean {
  const raw = rawContent.trim()
  if (!raw.startsWith(ASSISTANT_PAYLOAD_PREFIX)) return false
  try {
    const parsed = JSON.parse(raw.slice(ASSISTANT_PAYLOAD_PREFIX.length)) as AssistantPayloadLite
    if (parsed.actions?.some((action) => action.id === "confirm_guardian_alert_storage")) {
      return true
    }
    if (Array.isArray(parsed.clinicalAlertItems) && parsed.clinicalAlertItems.length > 0) {
      return true
    }
    const main = normalizeText(parsed.content ?? "")
    if (main.includes("armazenar") && main.includes("alerta")) return true
    return parsed.showAlertCompact === true
  } catch {
    return false
  }
}

export function getLatestPendingBmiFromAssistantMessages(messages: CaseMessage[]): {
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
      (item) => normalizeText(item.label) === "peso" && item.status === "confirmado",
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

export function getLatestConfirmedAnthropometricsFromAssistantMessages(messages: CaseMessage[]): {
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

export function getLatestAnthropometricsFromUserMessages(messages: CaseMessage[]): {
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

export function findLatestUserTurnTextForAlertSave(messages: CaseMessage[]): string | null {
  for (let assistantIndex = messages.length - 1; assistantIndex >= 0; assistantIndex -= 1) {
    const assistantMessage = messages[assistantIndex]
    if (assistantMessage.role !== "assistant") continue
    if (!assistantPayloadPromptedAlertStorage(assistantMessage.content)) continue

    for (let userIndex = assistantIndex - 1; userIndex >= 0; userIndex -= 1) {
      const userMessage = messages[userIndex]
      if (userMessage.role !== "user") continue
      const body = userMessage.content.trim()
      if (body.length < 8) continue
      if (isCommandLikeMessage(body)) continue
      if (isGuardianAlertConfirmOrDeclineMessage(body)) continue
      return body.replace(/\s+/g, " ").trim()
    }
    return null
  }
  return null
}

export function extractExplicitGuardianAlertsHint(messages: CaseMessage[]): string | null {
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
    if (!hasExplicitGuardianQuotedOrShoutSignal(content)) continue
    const singleLine = content.replace(/\s+/g, " ").trim()
    if (singleLine.length === 0) continue
    alerts.push(singleLine)
  }

  const uniqueAlerts = Array.from(new Set(alerts)).slice(-3)
  if (uniqueAlerts.length === 0) return null
  return uniqueAlerts.map((item) => `- ${item}`).join("\n")
}

export function hasIdenticalConfirmedClinicalAlertInThread(
  messages: CaseMessage[],
  candidateValue: string,
): boolean {
  const target = normalizeForNearDuplicate(candidateValue)
  if (!target || target.length < 12) return false

  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const entry = messages[messageIndex]
    if (entry.role !== "assistant") continue
    const payload = parseAssistantPayloadLite(entry.content)
    const items = payload?.storedData?.items ?? []
    for (const item of items) {
      if (item.section !== "ALERTAS_CLINICOS" || item.status !== "confirmado") continue
      if (normalizeForNearDuplicate(item.value) === target) return true
    }
  }
  return false
}

export function listRecentAssistantReplies(messages: CaseMessage[], limit = 2): string[] {
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

export function substantiveUserMessageCount(messages: CaseMessage[]): number {
  return messages.filter(
    (message) => message.role === "user" && !isCommandLikeMessage(message.content),
  ).length
}

export function hasRecentPatientProfileUpdateConfirmation(messages: CaseMessage[]): boolean {
  const confirmationMarkers = [
    "vou atualizar os dados do paciente com as informacoes confirmadas",
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

export function resolveSummaryAnthropometrics(params: {
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

export function formatLatestAnthropometricsHint(params: {
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

export function detectAnthropometricReferenceChange(params: {
  userMessage: string
  patientMetrics?: { weight: number | null; height: number | null }
}): { hasChange: boolean; weightKg: number | null; heightM: number | null } {
  const parsed = stripNeonatalBirthMeasuresFromParsedAnthropometrics(
    params.userMessage,
    parseWeightHeightForBmi(params.userMessage),
  )
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

export function resolveClinicalSyncMode(userMessage: string): ClinicalSyncMode {
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

export function buildThreadTextForAuxiliaryModel(messages: CaseMessage[]): string {
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

export function buildMessagesForModel(
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
