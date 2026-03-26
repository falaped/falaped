import test from "node:test"
import assert from "node:assert/strict"
import {
  isCommandLikeMessage,
  isQuestionLikeMessage,
  isLikelyDictationMessage,
  isBmiConfirmationMessage,
  isGuardianAlertConfirmOrDeclineMessage,
  isConfirmationOrCancellationMessage,
  isCancelPendingFlowMessage,
  isQueueControlMessage,
  isLikelyVaccineOrientationMessage,
  isPatientDataAccessQuestion,
  messageRequestsBmi,
} from "@/modules/falaped-assistant/lib/message-classification"

test("isCommandLikeMessage recognizes slash commands", () => {
  assert.equal(isCommandLikeMessage("/resumo"), true)
  assert.equal(isCommandLikeMessage("/imc"), true)
  assert.equal(isCommandLikeMessage("/relatorio"), true)
  assert.equal(isCommandLikeMessage("/encerrar"), true)
  assert.equal(isCommandLikeMessage("/atestado"), true)
  assert.equal(isCommandLikeMessage("/receita"), true)
})

test("isCommandLikeMessage recognizes text commands", () => {
  assert.equal(isCommandLikeMessage("gerar relatorio"), true)
  assert.equal(isCommandLikeMessage("encerrar caso"), true)
  assert.equal(isCommandLikeMessage("cancelar ação"), true)
})

test("isCommandLikeMessage returns false for clinical dictation", () => {
  assert.equal(isCommandLikeMessage("paciente com febre há 2 dias, tosse seca"), false)
  assert.equal(isCommandLikeMessage("peso 5kg altura 51cm"), false)
})

test("isQuestionLikeMessage detects question marks", () => {
  assert.equal(isQuestionLikeMessage("qual a dose?"), true)
  assert.equal(isQuestionLikeMessage("como tratar?"), true)
})

test("isQuestionLikeMessage detects question keywords without question mark", () => {
  assert.equal(isQuestionLikeMessage("qual estrategia usar"), true)
  assert.equal(isQuestionLikeMessage("como devo proceder"), true)
})

test("isQuestionLikeMessage returns false for plain text", () => {
  assert.equal(isQuestionLikeMessage("peso 5kg"), false)
})

test("isLikelyDictationMessage detects long non-command text", () => {
  assert.equal(isLikelyDictationMessage("paciente com febre há dois dias sem outros sintomas"), true)
})

test("isLikelyDictationMessage returns false for short text", () => {
  assert.equal(isLikelyDictationMessage("ok"), false)
})

test("isLikelyDictationMessage returns false for questions", () => {
  assert.equal(isLikelyDictationMessage("como devo tratar esse paciente?"), false)
})

test("isLikelyDictationMessage returns false for command-like text", () => {
  assert.equal(isLikelyDictationMessage("gerar relatorio do caso agora"), false)
})

test("isBmiConfirmationMessage matches confirmation patterns", () => {
  assert.equal(isBmiConfirmationMessage("IMC confirmado"), true)
  assert.equal(isBmiConfirmationMessage("confirmo o IMC"), true)
  assert.equal(isBmiConfirmationMessage("pode confirmar o IMC"), true)
})

test("isBmiConfirmationMessage returns false without imc keyword", () => {
  assert.equal(isBmiConfirmationMessage("confirmado"), false)
})

test("isGuardianAlertConfirmOrDeclineMessage matches alert actions", () => {
  assert.equal(isGuardianAlertConfirmOrDeclineMessage("salvar alerta para resumo e relatório"), true)
  assert.equal(isGuardianAlertConfirmOrDeclineMessage("confirmar armazenamento de alerta"), true)
  assert.equal(isGuardianAlertConfirmOrDeclineMessage("não armazenar alerta"), true)
})

test("isConfirmationOrCancellationMessage matches confirm and cancel", () => {
  assert.equal(isConfirmationOrCancellationMessage("confirmar"), true)
  assert.equal(isConfirmationOrCancellationMessage("cancelar"), true)
  assert.equal(isConfirmationOrCancellationMessage("manter valores anteriores"), true)
})

test("isConfirmationOrCancellationMessage returns false for clinical text", () => {
  assert.equal(isConfirmationOrCancellationMessage("paciente estável"), false)
})

test("isCancelPendingFlowMessage matches cancel patterns", () => {
  assert.equal(isCancelPendingFlowMessage("cancelar ação"), true)
  assert.equal(isCancelPendingFlowMessage("cancelar acao"), true)
  assert.equal(isCancelPendingFlowMessage("cancelar"), true)
})

test("isCancelPendingFlowMessage returns false for non-cancel messages", () => {
  assert.equal(isCancelPendingFlowMessage("confirmar"), false)
})

test("isQueueControlMessage detects queue control patterns", () => {
  assert.equal(isQueueControlMessage("confirmar"), true)
  assert.equal(isQueueControlMessage("cancelar"), true)
  assert.equal(isQueueControlMessage("manter valores anteriores"), true)
  assert.equal(isQueueControlMessage("usar novos dados antropometricos"), true)
})

test("isLikelyVaccineOrientationMessage detects vaccine orientation", () => {
  assert.equal(isLikelyVaccineOrientationMessage("orientações: vacinas pentavalente e BCG"), true)
  assert.equal(isLikelyVaccineOrientationMessage("orientação sobre vacinação"), true)
})

test("isLikelyVaccineOrientationMessage returns false for non-vaccine text", () => {
  assert.equal(isLikelyVaccineOrientationMessage("orientações sobre alimentação"), false)
})

test("isPatientDataAccessQuestion detects data access questions", () => {
  assert.equal(isPatientDataAccessQuestion("quais dados do paciente você tem acesso?"), true)
})

test("isPatientDataAccessQuestion returns false for unrelated questions", () => {
  assert.equal(isPatientDataAccessQuestion("qual a dose de amoxicilina?"), false)
})

test("messageRequestsBmi detects BMI requests", () => {
  assert.equal(messageRequestsBmi("/imc"), true)
  assert.equal(messageRequestsBmi("calcular imc"), true)
  assert.equal(messageRequestsBmi("qual o IMC?"), true)
  assert.equal(messageRequestsBmi("índice de massa corporal"), true)
})

test("messageRequestsBmi returns false for non-BMI messages", () => {
  assert.equal(messageRequestsBmi("peso 5kg"), false)
})
