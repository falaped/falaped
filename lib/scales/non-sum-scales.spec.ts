import test from "node:test"
import assert from "node:assert/strict"

import { CAPURRO } from "@/lib/scales/capurro"
import { PECARN_2Y_PLUS, PECARN_SCALES, PECARN_UNDER_2Y } from "@/lib/scales/pecarn"
import { PSOFA_SCALES } from "@/lib/scales/psofa"
import { getScalesForAgeMonths } from "@/lib/scales"
import { scoreScale, scoreRange } from "@/lib/scales/score-scale"

function allNo(scale: typeof PECARN_UNDER_2Y): Record<string, number> {
  return Object.fromEntries(scale.items.map((i) => [i.key, 0]))
}

function weightOf(scale: typeof PECARN_UNDER_2Y, key: string): number {
  return Math.max(...scale.items.find((i) => i.key === key)!.options.map((o) => o.value))
}

test("PECARN: todos os intermediários juntos não chegam a um de alto risco", () => {
  for (const scale of PECARN_SCALES) {
    const intermediates = scale.items
      .map((i) => Math.max(...i.options.map((o) => o.value)))
      .filter((w) => w === 1)
    assert.ok(intermediates.length * 1 < 10, scale.key)
    assert.equal(scale.hideScore, true)
    assert.deepEqual(scoreRange(scale), { min: 0, max: 34 })
  }
})

test("PECARN: a faixa sai igual à da árvore", () => {
  const scale = PECARN_2Y_PLUS
  const at = (overrides: Record<string, number>) =>
    scoreScale(scale, { ...allNo(scale), ...overrides }).interpretation
  assert.equal(at({}), "TC não recomendada")
  assert.equal(at({ vomiting: 1 }), "Observação ou TC")
  assert.equal(
    at({ vomiting: 1, loss_of_consciousness: 1, severe_mechanism: 1, severe_headache: 1 }),
    "Observação ou TC",
  )
  assert.equal(at({ basilar_fracture: weightOf(scale, "basilar_fracture") }), "TC recomendada")

  const under2 = PECARN_UNDER_2Y
  assert.equal(
    scoreScale(under2, { ...allNo(under2), palpable_fracture: 10, scalp_hematoma: 1 })
      .interpretation,
    "TC recomendada",
  )
})

test("PECARN: a árvore certa para cada idade", () => {
  const keysAt = (m: number) =>
    getScalesForAgeMonths(m).filter((s) => s.key.startsWith("pecarn-")).map((s) => s.key)
  assert.deepEqual(keysAt(23), ["pecarn-menor-2a"])
  assert.deepEqual(keysAt(24), ["pecarn-2a-ou-mais"])
})

test("pSOFA: exatamente uma versão por idade, do nascimento aos 18 anos", () => {
  for (let months = 0; months <= 216; months++) {
    const matches = getScalesForAgeMonths(months).filter((s) => s.key.startsWith("psofa-"))
    assert.equal(matches.length, 1, `${months} meses`)
  }
  for (const scale of PSOFA_SCALES) assert.deepEqual(scoreRange(scale), { min: 0, max: 24 })
})

test("pSOFA: a PAM de corte muda com a idade e 2 pontos já é disfunção", () => {
  const mapLabel = (key: string) =>
    PSOFA_SCALES.find((s) => s.key === key)!
      .items.find((i) => i.key === "cardiovascular")!.options[1].label
  assert.equal(mapLabel("psofa-menor-1m"), "PAM abaixo de 46, sem droga vasoativa")
  assert.equal(mapLabel("psofa-12-18a"), "PAM abaixo de 67, sem droga vasoativa")

  const scale = PSOFA_SCALES[0]
  const zero = Object.fromEntries(scale.items.map((i) => [i.key, 0]))
  assert.equal(scoreScale(scale, { ...zero, renal: 1 }).band.label, "Sem disfunção orgânica relevante")
  assert.equal(scoreScale(scale, { ...zero, renal: 1, hepatic: 1 }).band.label, "Disfunção orgânica")
})

test("Capurro: o escore vira idade gestacional, com corte em 37 e 42 semanas", () => {
  const at = (skin: number, ear: number, breast: number, nipple: number, plantar: number) =>
    scoreScale(CAPURRO, {
      skin_texture: skin,
      ear_shape: ear,
      breast_gland: breast,
      nipple,
      plantar_creases: plantar,
    }).interpretation
  // 54 → 258 dias = 36s6d; 55 não existe na soma, 56 → 260 dias = 37s1d.
  assert.equal(at(10, 24, 5, 10, 5), "Pré-termo — IG estimada de 36 semanas e 6 dias")
  assert.equal(at(10, 16, 10, 10, 10), "A termo — IG estimada de 37 semanas e 1 dia")
  assert.equal(at(0, 0, 0, 0, 0), "Pré-termo — IG estimada de 29 semanas e 1 dia")
  assert.equal(at(20, 24, 15, 15, 20), "Pós-termo — IG estimada de 42 semanas e 4 dias")
  // 90 a 93 não saem da soma; 89 (41s6d) ainda é a termo.
  assert.equal(at(20, 24, 15, 10, 20), "A termo — IG estimada de 41 semanas e 6 dias")
})
