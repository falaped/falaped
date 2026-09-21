import test from "node:test"
import assert from "node:assert/strict"

import { CADERNETA_MILESTONE_SCALES } from "@/lib/scales/caderneta-milestones"
import { getScalesForAgeMonths } from "@/lib/scales"
import { scoreScale } from "@/lib/scales/score-scale"

test("as faixas da Caderneta cobrem 0 a 59 meses, uma única por idade", () => {
  for (let months = 0; months <= 59; months++) {
    const matches = CADERNETA_MILESTONE_SCALES.filter(
      (scale) =>
        months >= (scale.minAgeMonths ?? 0) &&
        months <= (scale.maxAgeMonths ?? Number.POSITIVE_INFINITY),
    )
    assert.equal(
      matches.length,
      1,
      `${months} meses caiu em ${matches.length} faixas`,
    )
  }
})

test("a criança recebe a faixa da própria idade, e nenhuma outra de marcos", () => {
  const milestoneKeysAt = (months: number) =>
    getScalesForAgeMonths(months)
      .filter((s) => s.key.startsWith("marcos-"))
      .map((s) => s.key)

  assert.deepEqual(milestoneKeysAt(0), ["marcos-0-1m"])
  assert.deepEqual(milestoneKeysAt(7), ["marcos-6-9m"])
  assert.deepEqual(milestoneKeysAt(23), ["marcos-18-24m"])
  assert.deepEqual(milestoneKeysAt(59), ["marcos-4-5a"])
  // Acima de 5 anos a Caderneta não tem faixa: nenhuma escala de marcos.
  assert.deepEqual(milestoneKeysAt(60), [])
})

test("marco ausente vira alerta; dois viram provável atraso", () => {
  const scale = CADERNETA_MILESTONE_SCALES.find(
    (s) => s.key === "marcos-6-9m",
  )!
  const allPresent = Object.fromEntries(
    scale.items.map((item) => [item.key, 0]),
  )
  assert.equal(scoreScale(scale, allPresent).band.label, "Desenvolvimento adequado")

  const oneAbsent = { ...allPresent, m1: 1 }
  assert.equal(
    scoreScale(scale, oneAbsent).band.label,
    "Alerta — um marco ausente",
  )

  const twoAbsent = { ...allPresent, m1: 1, m2: 1 }
  assert.match(
    scoreScale(scale, twoAbsent).band.label,
    /Provável atraso/,
  )

  const allAbsent = Object.fromEntries(
    scale.items.map((item) => [item.key, 1]),
  )
  assert.equal(scoreScale(scale, allAbsent).score, scale.items.length)
})
