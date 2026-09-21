import test from "node:test"
import assert from "node:assert/strict"

import { MCHAT_R } from "@/lib/scales/mchat-r"
import { MCISAAC } from "@/lib/scales/mcisaac"
import { STRONGKIDS } from "@/lib/scales/strongkids"
import { getScalesForAgeMonths } from "@/lib/scales"
import { scoreScale } from "@/lib/scales/score-scale"

/** Responde o M-CHAT-R inteiro sem risco, depois aplica os overrides. */
function mchat(overrides: Record<string, number> = {}): Record<string, number> {
  const answers: Record<string, number> = {}
  for (const item of MCHAT_R.items) answers[item.key] = 0
  return { ...answers, ...overrides }
}

test("M-CHAT-R: itens 2, 5 e 12 pontuam em 'Sim'; os demais em 'Não'", () => {
  // O valor de risco é 1 em toda opção que pontua — a inversão está nas opções.
  const riskOnYes = ["q2", "q5", "q12"]
  for (const key of riskOnYes) {
    const item = MCHAT_R.items.find((i) => i.key === key)!
    const yes = item.options.find((o) => o.label === "Sim")!
    assert.equal(yes.value, 1, `${key}: "Sim" deveria pontuar`)
  }
  const normal = MCHAT_R.items.find((i) => i.key === "q1")!
  assert.equal(normal.options.find((o) => o.label === "Sim")!.value, 0)
  assert.equal(normal.options.find((o) => o.label === "Não")!.value, 1)
})

test("M-CHAT-R: limites das três faixas de risco", () => {
  assert.equal(scoreScale(MCHAT_R, mchat()).band.label, "Risco baixo")
  assert.equal(
    scoreScale(MCHAT_R, mchat({ q1: 1, q3: 1 })).band.label,
    "Risco baixo",
  )
  assert.equal(
    scoreScale(MCHAT_R, mchat({ q1: 1, q3: 1, q4: 1 })).band.label,
    "Risco médio",
  )
  const seven = mchat({ q1: 1, q3: 1, q4: 1, q6: 1, q7: 1, q8: 1, q9: 1 })
  assert.equal(scoreScale(MCHAT_R, seven).score, 7)
  assert.equal(scoreScale(MCHAT_R, seven).band.label, "Risco médio")
  const eight = { ...seven, q10: 1 }
  assert.equal(scoreScale(MCHAT_R, eight).band.label, "Risco alto")
})

test("M-CHAT-R só é oferecido de 16 a 30 meses", () => {
  const keyAt = (months: number) =>
    getScalesForAgeMonths(months).map((s) => s.key)
  assert.ok(!keyAt(15).includes("mchat-r"))
  assert.ok(keyAt(16).includes("mchat-r"))
  assert.ok(keyAt(30).includes("mchat-r"))
  assert.ok(!keyAt(31).includes("mchat-r"))
})

test("McIsaac: idade acima de 45 anos subtrai ponto e o escore negativo tem faixa", () => {
  const none = {
    fever: 0,
    no_cough: 0,
    nodes: 0,
    tonsils: 0,
    age: -1,
  }
  const result = scoreScale(MCISAAC, none)
  assert.equal(result.score, -1)
  assert.equal(result.band.label, "Risco baixo")

  // Criança de 3 a 14 anos com os quatro achados: escore máximo.
  const all = { fever: 1, no_cough: 1, nodes: 1, tonsils: 1, age: 1 }
  assert.equal(scoreScale(MCISAAC, all).score, 5)
  assert.equal(scoreScale(MCISAAC, all).band.label, "Risco alto")

  // Limites 1/2 e 3/4.
  assert.equal(
    scoreScale(MCISAAC, { ...none, age: 1 }).band.label,
    "Risco baixo",
  )
  assert.equal(
    scoreScale(MCISAAC, { ...none, fever: 1, age: 1 }).band.label,
    "Risco intermediário",
  )
  assert.equal(
    scoreScale(MCISAAC, { fever: 1, no_cough: 1, nodes: 0, tonsils: 0, age: 1 })
      .band.label,
    "Risco intermediário",
  )
  assert.equal(
    scoreScale(MCISAAC, { fever: 1, no_cough: 1, nodes: 1, tonsils: 0, age: 1 })
      .band.label,
    "Risco alto",
  )
  assert.equal(
    scoreScale(MCISAAC, { fever: 1, no_cough: 1, nodes: 1, tonsils: 1, age: 0 })
      .band.label,
    "Risco alto",
  )
})

test("STRONGkids: doença de alto risco vale 2 pontos e muda a faixa sozinha com mais um item", () => {
  const zero = { clinical: 0, high_risk_disease: 0, intake: 0, weight: 0 }
  assert.equal(scoreScale(STRONGKIDS, zero).band.label, "Risco baixo")

  const disease = { ...zero, high_risk_disease: 2 }
  assert.equal(scoreScale(STRONGKIDS, disease).score, 2)
  assert.equal(scoreScale(STRONGKIDS, disease).band.label, "Risco médio")

  const three = { ...disease, clinical: 1 }
  assert.equal(scoreScale(STRONGKIDS, three).band.label, "Risco médio")

  const four = { ...three, intake: 1 }
  assert.equal(scoreScale(STRONGKIDS, four).score, 4)
  assert.equal(scoreScale(STRONGKIDS, four).band.label, "Risco alto")

  const five = { clinical: 1, high_risk_disease: 2, intake: 1, weight: 1 }
  assert.equal(scoreScale(STRONGKIDS, five).score, 5)
  assert.equal(scoreScale(STRONGKIDS, five).band.label, "Risco alto")
})
