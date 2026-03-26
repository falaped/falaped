import test from "node:test"
import assert from "node:assert/strict"
import { detectAssistantIntent } from "@/modules/falaped-assistant/lib/intent-detection"

test("detectAssistantIntent returns SUMMARY for /resumo", () => {
  assert.equal(detectAssistantIntent("/resumo"), "SUMMARY")
})

test("detectAssistantIntent returns SUMMARY for resumir principais pontos", () => {
  assert.equal(detectAssistantIntent("resumir principais pontos do caso"), "SUMMARY")
})

test("detectAssistantIntent returns CALCULATE_BMI for /imc", () => {
  assert.equal(detectAssistantIntent("/imc"), "CALCULATE_BMI")
})

test("detectAssistantIntent returns CALCULATE_BMI for calcular imc", () => {
  assert.equal(detectAssistantIntent("calcular imc"), "CALCULATE_BMI")
})

test("detectAssistantIntent returns CALCULATE_BMI for IMC keyword", () => {
  assert.equal(detectAssistantIntent("qual o IMC?"), "CALCULATE_BMI")
})

test("detectAssistantIntent returns CALCULATE_BMI for indice de massa corporal", () => {
  assert.equal(detectAssistantIntent("índice de massa corporal"), "CALCULATE_BMI")
})

test("detectAssistantIntent returns SUGGEST_GUARDIAN_QUESTIONS", () => {
  assert.equal(detectAssistantIntent("sugerir perguntas para o responsavel"), "SUGGEST_GUARDIAN_QUESTIONS")
  assert.equal(detectAssistantIntent("sugerir perguntas ao responsavel"), "SUGGEST_GUARDIAN_QUESTIONS")
})

test("detectAssistantIntent returns GENERATE_REPORT for /relatorio", () => {
  assert.equal(detectAssistantIntent("/relatorio"), "GENERATE_REPORT")
  assert.equal(detectAssistantIntent("gerar relatorio"), "GENERATE_REPORT")
})

test("detectAssistantIntent returns GENERATE_MEDICAL_CERTIFICATE", () => {
  assert.equal(detectAssistantIntent("/atestado"), "GENERATE_MEDICAL_CERTIFICATE")
  assert.equal(detectAssistantIntent("gerar atestado"), "GENERATE_MEDICAL_CERTIFICATE")
})

test("detectAssistantIntent returns GENERATE_PRESCRIPTION", () => {
  assert.equal(detectAssistantIntent("/receita"), "GENERATE_PRESCRIPTION")
  assert.equal(detectAssistantIntent("gerar receita"), "GENERATE_PRESCRIPTION")
})

test("detectAssistantIntent returns CLOSE_CASE", () => {
  assert.equal(detectAssistantIntent("/encerrar"), "CLOSE_CASE")
  assert.equal(detectAssistantIntent("encerrar caso"), "CLOSE_CASE")
  assert.equal(detectAssistantIntent("fechar caso"), "CLOSE_CASE")
})

test("detectAssistantIntent returns QUESTION for question-like messages", () => {
  assert.equal(detectAssistantIntent("qual a dose recomendada?"), "QUESTION")
  assert.equal(detectAssistantIntent("como devo tratar"), "QUESTION")
})

test("detectAssistantIntent returns CHAT as default for clinical dictation", () => {
  assert.equal(detectAssistantIntent("paciente com febre há dois dias"), "CHAT")
  assert.equal(detectAssistantIntent("peso 5kg altura 51cm"), "CHAT")
})
