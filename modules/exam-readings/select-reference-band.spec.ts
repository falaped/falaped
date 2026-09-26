import assert from "node:assert/strict"
import { test } from "node:test"

import { selectReferenceBand } from "./select-reference-band"

const t4 = "PEDIÁTRICOS: < 1 MÊS : NÃO DISPONÍVEL DE 1 A 23 MESES: DE 1,06 A 1,71 ng/dL DE 2 A 12 ANOS: DE 1,05 A 1,67 ng/dL DE 13 A 18 ANOS: DE 1,01 A 1,67 ng/dL"

test("escolhe a faixa etária certa e devolve só o trecho dela", () => {
  assert.equal(selectReferenceBand(t4, { ageDays: 28 * 30.44, sex: null }), "DE 1,05 A 1,67 ng/dL")
  assert.equal(selectReferenceBand(t4, { ageDays: 14 * 30.44, sex: null }), "DE 1,06 A 1,71 ng/dL")
  assert.equal(selectReferenceBand(t4, { ageDays: 10, sex: null }), "NÃO DISPONÍVEL")
  assert.equal(selectReferenceBand("Adultos: de 0,96 a 1,73 ng/dL. " + t4, { ageDays: 20 * 365.25, sex: null }), "de 0,96 a 1,73 ng/dL")
})

test("sem rótulo que sirva, devolve o texto inteiro", () => {
  const nupad = "Para idade até 7 dias: Menor que 0.37 (Alteração do valor de referência em 19/08/2025) µmol/L"
  assert.equal(selectReferenceBand(nupad, { ageDays: 2, sex: null }), "Menor que 0.37 (Alteração do valor de referência em 19/08/2025) µmol/L")
  assert.equal(selectReferenceBand(nupad, { ageDays: 400, sex: null }), nupad)
  assert.equal(selectReferenceBand("10,5 a 14,0 g/dL", { ageDays: 400, sex: null }), "10,5 a 14,0 g/dL")
  assert.equal(selectReferenceBand(t4, { ageDays: null, sex: null }), t4)
})

test("rótulo por sexo", () => {
  const ref = "Masculino: 13,5 a 17,5 g/dL. Feminino: 12,0 a 15,5 g/dL"
  assert.equal(selectReferenceBand(ref, { ageDays: 4000, sex: "feminino" }), "12,0 a 15,5 g/dL")
  assert.equal(selectReferenceBand(ref, { ageDays: 4000, sex: "masculino" }), "13,5 a 17,5 g/dL")
})
