import assert from "node:assert/strict"
import { test } from "node:test"

import { computeFlagFromReference } from "./compute-flag-from-reference"

test("menor que / maior que com ponto ou vírgula, ignorando idade e parênteses", () => {
  assert.equal(computeFlagFromReference("0,16", "Para idade até 7 dias: Menor que 0.37 (Alteração do valor de referência em 19/08/2025) µmol/L"), "normal")
  assert.equal(computeFlagFromReference("0,16", "Menor que 0.06"), "high")
  assert.equal(computeFlagFromReference("6,37", "Maior que 5,61 µmol/L/h"), "normal")
  assert.equal(computeFlagFromReference("0,5", "Maior que 2,08"), "low")
  assert.equal(computeFlagFromReference("0,35", "Para idade até 7 dias: Menor que 2,11 (Alteração em 10/07/2026) µmol/L"), "normal")
  assert.equal(computeFlagFromReference("0,697", "Para idade igual ou superior a 8 dias: Menor que 4,00"), "normal")
})

test("intervalo, limites inferior e superior juntos, e casos sem resposta", () => {
  assert.equal(computeFlagFromReference("11,2", "10,5 a 14,0"), "normal")
  assert.equal(computeFlagFromReference("9,1", "10,5 - 14,0 g/dL"), "low")
  assert.equal(computeFlagFromReference("6,05", "Maior que 0.79 e Menor que 9.05"), "normal")
  assert.equal(computeFlagFromReference("Negativo", "Não reagente"), null)
  assert.equal(computeFlagFromReference("2,24", null), null)
  assert.equal(computeFlagFromReference("1,23", "Rn = 30 dias = FA"), null)
})

test("faixa por idade copiada inteira: usa a única faixa numérica que sobra, ou devolve unknown", () => {
  // O "< 1 MÊS" não é teto; "DE 1 A 23 MESES" e "DE 2 A 12 ANOS" não são faixas do analito.
  assert.equal(
    computeFlagFromReference("1,14", "PEDIÁTRICOS: < 1 MÊS : NÃO DISPONÍVEL DE 1 A 23 MESES: DE 1,06 A 1,71 ng/dL DE 2 A 12 ANO"),
    "normal",
  )
  assert.equal(
    computeFlagFromReference("1,14", "De 1 a 23 meses: 1,06 a 1,71 ng/dL. De 2 a 12 anos: 0,98 a 1,60 ng/dL"),
    "unknown",
  )
})
