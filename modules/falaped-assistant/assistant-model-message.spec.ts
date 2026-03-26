import test from "node:test"
import assert from "node:assert/strict"
import { assistantMessageToModelText } from "@/modules/falaped-assistant/assistant-model-message"

test("assistantMessageToModelText returns plain text as-is", () => {
  assert.equal(assistantMessageToModelText("Registrado."), "Registrado.")
})

test("assistantMessageToModelText compresses BMI block", () => {
  const input = "IMC estimado: 20.4\nFórmula: peso/altura²\nDados..."
  const result = assistantMessageToModelText(input)
  assert.ok(result.startsWith("[IMC já calculado no fio:"))
})

test("assistantMessageToModelText extracts content from JSON payload", () => {
  const payload = `__FALAPED_JSON__${JSON.stringify({
    content: "Anamnese registrada com sucesso.",
  })}`
  assert.equal(assistantMessageToModelText(payload), "Anamnese registrada com sucesso.")
})

test("assistantMessageToModelText handles report type", () => {
  const payload = `__FALAPED_JSON__${JSON.stringify({
    type: "assistant_report_file",
    content: "Relatório do caso XYZ",
  })}`
  assert.equal(assistantMessageToModelText(payload), "Relatório do caso XYZ")
})

test("assistantMessageToModelText handles structured clinical note", () => {
  const payload = `__FALAPED_JSON__${JSON.stringify({
    content: "Dados anotados",
    structuredClinicalNote: "Exame físico sem alterações.",
  })}`
  assert.equal(assistantMessageToModelText(payload), "Exame físico sem alterações.")
})

test("assistantMessageToModelText truncates on invalid JSON", () => {
  const result = assistantMessageToModelText("__FALAPED_JSON__invalid json")
  assert.ok(result.startsWith("__FALAPED_JSON__"))
  assert.ok(result.length <= 2000)
})
