import assert from "node:assert/strict"
import { test } from "node:test"

import { computeFlagFromReference } from "./compute-flag-from-reference"

test("menor que / maior que com ponto ou vírgula", () => {
  assert.equal(computeFlagFromReference("0,16", "Para idade até 7 dias: Menor que 0.37 (Alteração em 19/08/2025) µmol/L"), "normal")
  assert.equal(computeFlagFromReference("0,16", "Menor que 0.06"), "high")
  assert.equal(computeFlagFromReference("6,37", "Maior que 5,61 µmol/L/h"), "normal")
  assert.equal(computeFlagFromReference("0,5", "Maior que 2,08"), "low")
})

test("intervalo e casos sem resposta", () => {
  assert.equal(computeFlagFromReference("11,2", "10,5 a 14,0"), "normal")
  assert.equal(computeFlagFromReference("9,1", "10,5 - 14,0 g/dL"), "low")
  assert.equal(computeFlagFromReference("Negativo", "Não reagente"), null)
  assert.equal(computeFlagFromReference("2,24", null), null)
  assert.equal(computeFlagFromReference("1,23", "Rn = 30 dias = FA"), null)
})
