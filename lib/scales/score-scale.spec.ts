import test from "node:test"
import assert from "node:assert/strict"

import { FLACC } from "@/lib/scales/flacc"
import { WONG_BAKER } from "@/lib/scales/wong-baker"
import { SCALES, getScalesForAgeMonths } from "@/lib/scales"
import { scoreScale, scoreRange } from "@/lib/scales/score-scale"

function flaccAnswers(value: number): Record<string, number> {
  return {
    face: value,
    legs: value,
    activity: value,
    cry: value,
    consolability: value,
  }
}

test("FLACC soma os cinco itens e resolve as faixas nos limites", () => {
  assert.equal(scoreScale(FLACC, flaccAnswers(0)).score, 0)
  assert.equal(scoreScale(FLACC, flaccAnswers(0)).band.label, "Sem dor")
  assert.equal(scoreScale(FLACC, flaccAnswers(2)).score, 10)
  assert.equal(scoreScale(FLACC, flaccAnswers(2)).band.label, "Dor intensa")

  // Limites de cada faixa: 1-3 leve, 4-6 moderada, 7-10 intensa.
  const at = (score: number) => {
    const answers = { face: 0, legs: 0, activity: 0, cry: 0, consolability: 0 }
    let left = score
    for (const key of ["face", "legs", "activity", "cry", "consolability"]) {
      const take = Math.min(2, left)
      answers[key as keyof typeof answers] = take
      left -= take
    }
    assert.equal(left, 0)
    return scoreScale(FLACC, answers).band.label
  }
  assert.equal(at(1), "Desconforto leve")
  assert.equal(at(3), "Desconforto leve")
  assert.equal(at(4), "Dor moderada")
  assert.equal(at(6), "Dor moderada")
  assert.equal(at(7), "Dor intensa")
})

test("Wong-Baker pontua o item único e separa leve de moderada", () => {
  assert.equal(scoreScale(WONG_BAKER, { face: 0 }).band.label, "Sem dor")
  assert.equal(scoreScale(WONG_BAKER, { face: 2 }).band.label, "Dor leve")
  assert.equal(scoreScale(WONG_BAKER, { face: 4 }).band.label, "Dor leve")
  assert.equal(scoreScale(WONG_BAKER, { face: 6 }).band.label, "Dor moderada")
  assert.equal(scoreScale(WONG_BAKER, { face: 8 }).band.label, "Dor intensa")
  assert.equal(scoreScale(WONG_BAKER, { face: 10 }).score, 10)
})

test("resposta faltando, valor fora das opções e item desconhecido são erro, não zero", () => {
  assert.throws(
    () => scoreScale(FLACC, { face: 0, legs: 0, activity: 0, cry: 0 }),
    /\[SCALES\] Missing answer for item "consolability"/,
  )
  assert.throws(
    () => scoreScale(WONG_BAKER, { face: 3 }),
    /\[SCALES\] Invalid value 3/,
  )
  assert.throws(
    () => scoreScale(WONG_BAKER, { face: 0, extra: 1 }),
    /\[SCALES\] Unknown item "extra"/,
  )
})

test("as faixas de toda escala cobrem todo escore possível, sem buraco nem sobreposição", () => {
  for (const scale of SCALES) {
    const { min, max } = scoreRange(scale)
    for (let score = min; score <= max; score++) {
      const matches = scale.bands.filter((b) => score >= b.min && score <= b.max)
      assert.equal(
        matches.length,
        1,
        `${scale.key}: escore ${score} caiu em ${matches.length} faixas`,
      )
    }
  }
})

test("chaves de escala são únicas no registro", () => {
  const keys = SCALES.map((s) => s.key)
  assert.equal(new Set(keys).size, keys.length)
})

test("getScalesForAgeMonths respeita a idade mínima e devolve tudo sem idade", () => {
  const forNewborn = getScalesForAgeMonths(1).map((s) => s.key)
  assert.ok(forNewborn.includes("flacc"))
  assert.ok(!forNewborn.includes("wong-baker"))

  const forFourYears = getScalesForAgeMonths(48).map((s) => s.key)
  assert.ok(forFourYears.includes("wong-baker"))

  assert.equal(getScalesForAgeMonths(null).length, SCALES.length)
})
