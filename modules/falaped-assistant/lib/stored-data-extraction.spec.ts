import test from "node:test"
import assert from "node:assert/strict"
import {
  extractStoredData,
  buildBmiStoredData,
} from "@/modules/falaped-assistant/lib/stored-data-extraction"

test("extractStoredData returns empty for plain text", () => {
  const result = extractStoredData("bom dia doutor")
  assert.equal(result.length, 0)
})

test("extractStoredData extracts conduta", () => {
  const result = extractStoredData("conduta: manter amamentação exclusiva")
  assert.ok(result.length >= 1)
  const conduta = result.find((item) => item.section === "CONDUTA")
  assert.ok(conduta)
  assert.equal(conduta.status, "confirmado")
})

test("extractStoredData extracts weight from message", () => {
  const result = extractStoredData("peso 5kg")
  const weight = result.find((item) => item.label === "Peso")
  assert.ok(weight)
  assert.ok(weight.value.includes("kg"))
  assert.equal(weight.status, "confirmado")
})

test("extractStoredData extracts weight and height and pending BMI", () => {
  const result = extractStoredData("peso 5kg altura 51cm")
  const weight = result.find((item) => item.label === "Peso")
  const height = result.find((item) => item.label === "Comprimento / altura")
  const bmi = result.find((item) => item.label === "IMC estimado")
  assert.ok(weight)
  assert.ok(height)
  assert.ok(bmi)
  assert.equal(bmi.status, "pendente_de_confirmacao")
})

test("extractStoredData returns empty for unrelated message", () => {
  const result = extractStoredData("qual a dose de amoxicilina?")
  assert.equal(result.length, 0)
})

test("buildBmiStoredData returns 4 items", () => {
  const result = buildBmiStoredData({ weightKg: 5.3, heightM: 0.51, bmi: 20.4 })
  assert.equal(result.length, 4)

  const peso = result.find((item) => item.label === "Peso")
  assert.ok(peso)
  assert.ok(peso.value.includes("kg"))

  const altura = result.find((item) => item.label === "Comprimento / altura")
  assert.ok(altura)
  assert.ok(altura.value.includes("cm"))

  const imc = result.find((item) => item.label === "IMC estimado")
  assert.ok(imc)
  assert.equal(imc.status, "pendente_de_confirmacao")

  const details = result.find((item) => item.section === "CALCULO_IMC")
  assert.ok(details)
  assert.ok(details.value.includes("Fórmula"))
})

test("buildBmiStoredData calculation details include formula", () => {
  const result = buildBmiStoredData({ weightKg: 10, heightM: 0.8, bmi: 15.6 })
  const details = result.find((item) => item.section === "CALCULO_IMC")
  assert.ok(details)
  assert.ok(details.value.includes("peso (kg) ÷ altura (m)²"))
  assert.ok(details.value.includes("10.000 kg"))
})
