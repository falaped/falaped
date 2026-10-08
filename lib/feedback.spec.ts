import test from "node:test"
import assert from "node:assert/strict"

import { feedbackPageLabel, sendFeedbackSchema } from "./feedback"

test("rótulo da tela de origem", () => {
  assert.equal(feedbackPageLabel("/dashboard"), "Início")
  assert.equal(feedbackPageLabel("/dashboard/cases/abc"), "Consulta")
  assert.equal(feedbackPageLabel("/dashboard/cases"), "Consultas")
  assert.equal(feedbackPageLabel("/dashboard/patients/new"), "Cadastro de criança")
  assert.equal(feedbackPageLabel("/dashboard/patients/123/edit"), "Ficha da criança")
  assert.equal(feedbackPageLabel("/outra"), "/outra")
  assert.equal(feedbackPageLabel(null), "Tela não informada")
})

test("feedback exige texto", () => {
  assert.equal(sendFeedbackSchema.safeParse({ kind: "elogio", message: "   " }).success, false)
  assert.equal(sendFeedbackSchema.safeParse({ kind: "elogio", message: "Ótimo" }).success, true)
})
