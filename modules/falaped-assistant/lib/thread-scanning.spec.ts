import test from "node:test"
import assert from "node:assert/strict"
import type { CaseMessage } from "@/modules/cases/get-case-by-id"
import {
  getLatestPendingBmiFromAssistantMessages,
  getLatestConfirmedAnthropometricsFromAssistantMessages,
  getLatestAnthropometricsFromUserMessages,
  listRecentAssistantReplies,
  substantiveUserMessageCount,
  hasRecentPatientProfileUpdateConfirmation,
  resolveSummaryAnthropometrics,
  resolveClinicalSyncMode,
  detectAnthropometricReferenceChange,
  buildMessagesForModel,
  buildThreadTextForAuxiliaryModel,
} from "@/modules/falaped-assistant/lib/thread-scanning"

function buildCaseMessage(overrides: Partial<CaseMessage> & { content: string }): CaseMessage {
  return {
    id: `msg-${Math.random().toString(36).slice(2, 8)}`,
    role: "user",
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

const BMI_STORED_DATA_PAYLOAD = `__FALAPED_JSON__${JSON.stringify({
  content: "IMC estimado: 20.4",
  storedData: {
    items: [
      { section: "DADOS_ANTROPOMETRICOS", label: "Peso", value: "5.3 kg", status: "confirmado" },
      { section: "DADOS_ANTROPOMETRICOS", label: "Comprimento / altura", value: "51.0 cm", status: "confirmado" },
      { section: "DADOS_ANTROPOMETRICOS", label: "IMC estimado", value: "20.4", status: "pendente_de_confirmacao" },
    ],
  },
})}`

test("getLatestPendingBmiFromAssistantMessages finds pending BMI", () => {
  const messages = [
    buildCaseMessage({ content: "peso 5.3kg", role: "user" }),
    buildCaseMessage({ content: BMI_STORED_DATA_PAYLOAD, role: "assistant" }),
  ]
  const result = getLatestPendingBmiFromAssistantMessages(messages)
  assert.ok(result)
  assert.equal(result.bmiValue, "20.4")
  assert.equal(result.weightValue, "5.3 kg")
})

test("getLatestPendingBmiFromAssistantMessages returns null when no pending BMI", () => {
  const messages = [
    buildCaseMessage({ content: "olá", role: "user" }),
    buildCaseMessage({ content: "oi, como posso ajudar?", role: "assistant" }),
  ]
  assert.equal(getLatestPendingBmiFromAssistantMessages(messages), null)
})

test("getLatestConfirmedAnthropometricsFromAssistantMessages extracts weight and height", () => {
  const messages = [
    buildCaseMessage({ content: BMI_STORED_DATA_PAYLOAD, role: "assistant" }),
  ]
  const result = getLatestConfirmedAnthropometricsFromAssistantMessages(messages)
  assert.equal(result.weightKg, 5.3)
  assert.ok(result.heightM != null && Math.abs(result.heightM - 0.51) < 0.001)
})

test("getLatestConfirmedAnthropometricsFromAssistantMessages returns nulls when no data", () => {
  const result = getLatestConfirmedAnthropometricsFromAssistantMessages([])
  assert.equal(result.weightKg, null)
  assert.equal(result.heightM, null)
})

test("getLatestAnthropometricsFromUserMessages extracts from user messages", () => {
  const messages = [
    buildCaseMessage({ content: "peso 5kg", role: "user" }),
    buildCaseMessage({ content: "altura 51cm", role: "user" }),
  ]
  const result = getLatestAnthropometricsFromUserMessages(messages)
  assert.ok(result.weightKg != null)
  assert.ok(result.heightM != null)
})

test("getLatestAnthropometricsFromUserMessages skips commands", () => {
  const messages = [
    buildCaseMessage({ content: "/resumo", role: "user" }),
  ]
  const result = getLatestAnthropometricsFromUserMessages(messages)
  assert.equal(result.weightKg, null)
  assert.equal(result.heightM, null)
})

test("listRecentAssistantReplies returns plain text replies", () => {
  const messages = [
    buildCaseMessage({ content: "olá", role: "user" }),
    buildCaseMessage({ content: "Olá, como posso ajudar?", role: "assistant" }),
    buildCaseMessage({ content: "ok", role: "user" }),
    buildCaseMessage({ content: "Registrado.", role: "assistant" }),
  ]
  const replies = listRecentAssistantReplies(messages, 2)
  assert.equal(replies.length, 2)
  assert.equal(replies[0], "Registrado.")
  assert.equal(replies[1], "Olá, como posso ajudar?")
})

test("substantiveUserMessageCount counts non-command messages", () => {
  const messages = [
    buildCaseMessage({ content: "peso 5kg", role: "user" }),
    buildCaseMessage({ content: "/resumo", role: "user" }),
    buildCaseMessage({ content: "paciente com febre", role: "user" }),
  ]
  assert.equal(substantiveUserMessageCount(messages), 2)
})

test("hasRecentPatientProfileUpdateConfirmation detects confirmation", () => {
  const messages = [
    buildCaseMessage({
      content: "Vou atualizar os dados do paciente com as informações confirmadas.",
      role: "assistant",
    }),
  ]
  assert.equal(hasRecentPatientProfileUpdateConfirmation(messages), true)
})

test("hasRecentPatientProfileUpdateConfirmation returns false without confirmation", () => {
  const messages = [
    buildCaseMessage({ content: "Registrado.", role: "assistant" }),
  ]
  assert.equal(hasRecentPatientProfileUpdateConfirmation(messages), false)
})

test("resolveSummaryAnthropometrics prefers thread data over patient metrics", () => {
  const messages = [
    buildCaseMessage({ content: BMI_STORED_DATA_PAYLOAD, role: "assistant" }),
  ]
  const result = resolveSummaryAnthropometrics({
    messages,
    patientMetrics: { weight: 10, height: 0.8 },
  })
  assert.equal(result.weightKg, 5.3)
})

test("resolveSummaryAnthropometrics falls back to patient metrics", () => {
  const result = resolveSummaryAnthropometrics({
    messages: [],
    patientMetrics: { weight: 10, height: 0.8 },
  })
  assert.equal(result.weightKg, 10)
  assert.equal(result.heightM, 0.8)
})

test("resolveClinicalSyncMode returns single_turn for short messages", () => {
  assert.equal(resolveClinicalSyncMode("peso 5kg"), "single_turn")
})

test("resolveClinicalSyncMode returns global_update for global keywords", () => {
  assert.equal(resolveClinicalSyncMode("resumo global do caso"), "global_update")
  assert.equal(resolveClinicalSyncMode("visão geral do atendimento"), "global_update")
})

test("detectAnthropometricReferenceChange detects weight change", () => {
  const result = detectAnthropometricReferenceChange({
    userMessage: "peso 6kg",
    patientMetrics: { weight: 5, height: null },
  })
  assert.equal(result.hasChange, true)
  assert.ok(result.weightKg != null)
})

test("detectAnthropometricReferenceChange returns no change without metrics", () => {
  const result = detectAnthropometricReferenceChange({
    userMessage: "boa tarde",
    patientMetrics: undefined,
  })
  assert.equal(result.hasChange, false)
})

test("buildMessagesForModel appends user message if not already last", () => {
  const messages = [
    buildCaseMessage({ content: "olá", role: "user" }),
    buildCaseMessage({ content: "oi!", role: "assistant" }),
  ]
  const result = buildMessagesForModel(messages, "como tratar?")
  assert.equal(result[result.length - 1].content, "como tratar?")
  assert.equal(result[result.length - 1].role, "user")
})

test("buildMessagesForModel does not duplicate if last message matches", () => {
  const messages = [
    buildCaseMessage({ content: "como tratar?", role: "user" }),
  ]
  const result = buildMessagesForModel(messages, "como tratar?")
  assert.equal(result.length, 1)
})

test("buildThreadTextForAuxiliaryModel skips command messages", () => {
  const messages = [
    buildCaseMessage({ content: "paciente com febre", role: "user" }),
    buildCaseMessage({ content: "/resumo", role: "user" }),
    buildCaseMessage({ content: "Aqui está o resumo", role: "assistant" }),
  ]
  const result = buildThreadTextForAuxiliaryModel(messages)
  assert.ok(result.includes("paciente com febre"))
  assert.ok(!result.includes("/resumo"))
})
