import test from "node:test"
import assert from "node:assert/strict"

import { CAPD } from "@/lib/scales/capd"
import { COMFORT_B_SPONTANEOUS, COMFORT_B_VENTILATED } from "@/lib/scales/comfort-b"
import { PIPP } from "@/lib/scales/pipp"
import { RASS } from "@/lib/scales/rass"
import { getScalesForAgeMonths } from "@/lib/scales"
import { scoreScale, scoreRange } from "@/lib/scales/score-scale"

/** Todas as respostas no mesmo valor. */
function allAt(scale: typeof PIPP, value: number): Record<string, number> {
  return Object.fromEntries(scale.items.map((i) => [i.key, value]))
}

test("PIPP: 6 é dor mínima, 7 leve a moderada, 13 moderada a intensa", () => {
  assert.deepEqual(scoreRange(PIPP), { min: 0, max: 21 })
  const base = { ...allAt(PIPP, 0), heart_rate: 3, oxygen_saturation: 3 }
  assert.equal(scoreScale(PIPP, base).band.label, "Sem dor ou dor mínima")
  assert.equal(
    scoreScale(PIPP, { ...base, brow_bulge: 1 }).band.label,
    "Dor leve a moderada",
  )
  const thirteen = { ...base, brow_bulge: 3, eye_squeeze: 3, nasolabial_furrow: 1 }
  assert.equal(scoreScale(PIPP, thirteen).score, 13)
  assert.equal(scoreScale(PIPP, thirteen).band.label, "Dor moderada a intensa")
})

test("PIPP segue oferecido ao prematuro de 3 meses, o NIPS não", () => {
  const keys = getScalesForAgeMonths(3).map((s) => s.key)
  assert.ok(keys.includes("pipp"))
  assert.ok(!keys.includes("nips"))
})

test("COMFORT-B: as duas versões vão de 6 a 30 e trocam só um item", () => {
  for (const scale of [COMFORT_B_VENTILATED, COMFORT_B_SPONTANEOUS])
    assert.deepEqual(scoreRange(scale), { min: 6, max: 30 })
  assert.ok(COMFORT_B_VENTILATED.items.some((i) => i.key === "respiratory_response"))
  assert.ok(COMFORT_B_SPONTANEOUS.items.some((i) => i.key === "crying"))

  const at = (overrides: Record<string, number>) =>
    scoreScale(COMFORT_B_SPONTANEOUS, { ...allAt(COMFORT_B_SPONTANEOUS, 1), ...overrides })
      .band.label
  assert.equal(at({}), "Sedação excessiva")
  assert.equal(at({ alertness: 5 }), "Sedação excessiva") // 10
  assert.equal(at({ alertness: 5, calmness: 2 }), "Sedação adequada") // 11
  const twentyTwo = allAt(COMFORT_B_SPONTANEOUS, 4)
  twentyTwo.alertness = 2 // 22
  assert.equal(scoreScale(COMFORT_B_SPONTANEOUS, twentyTwo).band.label, "Sedação adequada")
  assert.equal(
    scoreScale(COMFORT_B_SPONTANEOUS, { ...twentyTwo, alertness: 3 }).band.label,
    "Sedação insuficiente ou desconforto",
  )
})

test("RASS: zero é alerta e calmo, -4 já é sedação profunda", () => {
  const at = (level: number) => scoreScale(RASS, { level }).band.label
  assert.equal(at(0), "Alerta e calmo")
  assert.equal(at(1), "Agitação")
  assert.equal(at(-3), "Sedação leve a moderada")
  assert.equal(at(-4), "Sedação profunda")
})

test("CAPD: 'Nunca' pontua nos quatro primeiros itens, e 9 é positivo", () => {
  const eye = CAPD.items.find((i) => i.key === "eye_contact")!
  assert.equal(eye.options.find((o) => o.label === "Nunca")!.value, 4)
  const restless = CAPD.items.find((i) => i.key === "restless")!
  assert.equal(restless.options.find((o) => o.label === "Nunca")!.value, 0)

  // Criança bem: faz tudo sempre, nada de alterado.
  const well = {
    eye_contact: 0, purposeful: 0, aware: 0, communicates: 0,
    restless: 0, inconsolable: 0, underactive: 0, slow_response: 0,
  }
  assert.equal(scoreScale(CAPD, well).score, 0)
  const eight = { ...well, eye_contact: 4, restless: 4 }
  assert.equal(scoreScale(CAPD, eight).band.label, "Rastreio negativo")
  assert.equal(
    scoreScale(CAPD, { ...eight, aware: 1 }).band.label,
    "Rastreio positivo para delirium",
  )
})
