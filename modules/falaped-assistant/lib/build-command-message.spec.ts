import test from "node:test"
import assert from "node:assert/strict"
import { buildCommandMessage } from "@/modules/falaped-assistant/lib/build-command-message"

test("buildCommandMessage maps SUMMARY to /resumo", () => {
  assert.equal(buildCommandMessage("SUMMARY", "resumir pontos"), "/resumo")
})

test("buildCommandMessage maps SUGGEST_GUARDIAN_QUESTIONS", () => {
  assert.equal(
    buildCommandMessage("SUGGEST_GUARDIAN_QUESTIONS", "perguntas"),
    "sugerir perguntas para o responsavel",
  )
})

test("buildCommandMessage maps GENERATE_REPORT", () => {
  assert.equal(buildCommandMessage("GENERATE_REPORT", "rel"), "gerar relatorio")
})

test("buildCommandMessage maps GENERATE_MEDICAL_CERTIFICATE", () => {
  assert.equal(buildCommandMessage("GENERATE_MEDICAL_CERTIFICATE", "att"), "gerar atestado")
})

test("buildCommandMessage maps GENERATE_PRESCRIPTION", () => {
  assert.equal(buildCommandMessage("GENERATE_PRESCRIPTION", "rec"), "gerar receita")
})

test("buildCommandMessage maps CLOSE_CASE", () => {
  assert.equal(buildCommandMessage("CLOSE_CASE", "fechar"), "encerrar caso")
})

test("buildCommandMessage passes through CALCULATE_BMI with user message", () => {
  assert.equal(buildCommandMessage("CALCULATE_BMI", "peso 5kg altura 51cm"), "peso 5kg altura 51cm")
})

test("buildCommandMessage passes through CHAT with user message", () => {
  assert.equal(buildCommandMessage("CHAT", "paciente com febre"), "paciente com febre")
})

test("buildCommandMessage passes through QUESTION with user message", () => {
  assert.equal(buildCommandMessage("QUESTION", "qual a dose?"), "qual a dose?")
})

test("buildCommandMessage preserves control messages (confirmar)", () => {
  assert.equal(buildCommandMessage("SUMMARY", "confirmar geração de relatório"), "confirmar geração de relatório")
})

test("buildCommandMessage preserves control messages (cancelar)", () => {
  assert.equal(buildCommandMessage("CLOSE_CASE", "cancelar ação"), "cancelar ação")
})
