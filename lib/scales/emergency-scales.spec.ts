import test from "node:test"
import assert from "node:assert/strict"

import { APGAR } from "@/lib/scales/apgar"
import { GLASGOW_PEDIATRICA } from "@/lib/scales/glasgow-pediatrica"
import { PEWS } from "@/lib/scales/pews"
import { PRAM } from "@/lib/scales/pram"
import { TAL_6M_PLUS, TAL_UNDER_6M } from "@/lib/scales/tal"
import { WESTLEY } from "@/lib/scales/westley"
import { SCALES, getScalesForAgeMonths } from "@/lib/scales"
import { scoreScale, scoreRange } from "@/lib/scales/score-scale"

test("Apgar: 3 é grave, 6 é moderado, 7 é boa vitalidade", () => {
  const at = (heart: number) =>
    scoreScale(APGAR, {
      heart_rate: heart,
      respiration: 1,
      muscle_tone: 1,
      reflex: 0,
      color: 0,
    })
  assert.equal(at(1).score, 3)
  assert.equal(at(1).band.label, "Vitalidade gravemente comprometida")

  const moderate = {
    heart_rate: 2,
    respiration: 1,
    muscle_tone: 1,
    reflex: 1,
    color: 1,
  }
  assert.equal(scoreScale(APGAR, moderate).score, 6)
  assert.equal(scoreScale(APGAR, moderate).band.label, "Vitalidade moderadamente comprometida")

  const good = { ...moderate, reflex: 2 }
  assert.equal(scoreScale(APGAR, good).score, 7)
  assert.equal(scoreScale(APGAR, good).band.label, "Boa vitalidade")
})

test("Glasgow pediátrica vai de 3 a 15, e 8 ainda é rebaixamento grave", () => {
  const { min, max } = scoreRange(GLASGOW_PEDIATRICA)
  assert.equal(min, 3)
  assert.equal(max, 15)

  const eight = scoreScale(GLASGOW_PEDIATRICA, { eye: 2, verbal: 2, motor: 4 })
  assert.equal(eight.score, 8)
  assert.equal(eight.band.label, "Rebaixamento grave")

  const nine = scoreScale(GLASGOW_PEDIATRICA, { eye: 2, verbal: 3, motor: 4 })
  assert.equal(nine.band.label, "Rebaixamento moderado")

  const full = scoreScale(GLASGOW_PEDIATRICA, { eye: 4, verbal: 5, motor: 6 })
  assert.equal(full.score, 15)
  assert.equal(full.band.label, "Rebaixamento leve ou ausente")
})

test("Westley: cianose em repouso sozinha já classifica como grave", () => {
  const cyanosisOnly = {
    stridor: 0,
    retraction: 0,
    air_entry: 0,
    cyanosis: 5,
    consciousness: 0,
  }
  assert.equal(scoreScale(WESTLEY, cyanosisOnly).score, 5)
  assert.equal(scoreScale(WESTLEY, cyanosisOnly).band.label, "Crupe moderado")

  const withStridor = { ...cyanosisOnly, stridor: 2 }
  assert.equal(scoreScale(WESTLEY, withStridor).score, 7)
  assert.equal(scoreScale(WESTLEY, withStridor).band.label, "Crupe grave")

  const worst = {
    stridor: 2,
    retraction: 3,
    air_entry: 2,
    cyanosis: 5,
    consciousness: 5,
  }
  assert.equal(scoreScale(WESTLEY, worst).score, 17)
  assert.equal(
    scoreScale(WESTLEY, worst).band.label,
    "Insuficiência respiratória iminente",
  )
})

test("Tal: a faixa etária escolhe a régua de frequência respiratória", () => {
  const keysAt = (months: number) =>
    getScalesForAgeMonths(months)
      .filter((s) => s.key.startsWith("tal-"))
      .map((s) => s.key)
  assert.deepEqual(keysAt(0), ["tal-menor-6m"])
  assert.deepEqual(keysAt(5), ["tal-menor-6m"])
  assert.deepEqual(keysAt(6), ["tal-6m-ou-mais"])
  assert.deepEqual(keysAt(24), ["tal-6m-ou-mais"])
  assert.deepEqual(keysAt(25), [])

  const rate = (scale: typeof TAL_UNDER_6M, value: number) =>
    scale.items.find((i) => i.key === "respiratory_rate")!.options.find(
      (o) => o.value === value,
    )!.label
  assert.equal(rate(TAL_UNDER_6M, 1), "41 a 55 irpm")
  assert.equal(rate(TAL_6M_PLUS, 1), "31 a 45 irpm")

  const moderate = {
    respiratory_rate: 2,
    wheezing: 2,
    accessory_muscles: 1,
    cyanosis: 0,
  }
  assert.equal(scoreScale(TAL_UNDER_6M, moderate).score, 5)
  assert.equal(scoreScale(TAL_UNDER_6M, moderate).band.label, "Moderada")
  assert.equal(
    scoreScale(TAL_UNDER_6M, { ...moderate, wheezing: 1 }).band.label,
    "Leve",
  )
  assert.equal(
    scoreScale(TAL_UNDER_6M, {
      respiratory_rate: 3,
      wheezing: 3,
      accessory_muscles: 3,
      cyanosis: 0,
    }).band.label,
    "Grave",
  )
})

test("PEWS: o agravante de 2 pontos sozinho não aciona, com um domínio aciona", () => {
  const { max } = scoreRange(PEWS)
  assert.equal(max, 11)

  const aggravatingOnly = {
    behaviour: 0,
    cardiovascular: 0,
    respiratory: 0,
    aggravating: 2,
  }
  assert.equal(scoreScale(PEWS, aggravatingOnly).band.label, "Risco baixo")

  const intermediate = { ...aggravatingOnly, behaviour: 2 }
  assert.equal(scoreScale(PEWS, intermediate).score, 4)
  assert.equal(scoreScale(PEWS, intermediate).band.label, "Risco intermediário")

  const high = { ...aggravatingOnly, behaviour: 3 }
  assert.equal(scoreScale(PEWS, high).score, 5)
  assert.equal(scoreScale(PEWS, high).band.label, "Risco alto")
})

test("PRAM: saturação abaixo de 92% com tiragem já é crise moderada", () => {
  const moderate = {
    suprasternal: 2,
    scalene: 0,
    air_entry: 0,
    wheezing: 0,
    oxygen_saturation: 2,
  }
  assert.equal(scoreScale(PRAM, moderate).score, 4)
  assert.equal(scoreScale(PRAM, moderate).band.label, "Crise moderada")

  const mild = { ...moderate, oxygen_saturation: 1 }
  assert.equal(scoreScale(PRAM, mild).band.label, "Crise leve")

  const severe = {
    suprasternal: 2,
    scalene: 2,
    air_entry: 2,
    wheezing: 2,
    oxygen_saturation: 2,
  }
  assert.equal(scoreScale(PRAM, severe).score, 10)
  assert.equal(scoreScale(PRAM, severe).band.label, "Crise grave")

  // PRAM não é oferecida abaixo de 1 ano; PASS ficou de fora de propósito.
  assert.ok(!getScalesForAgeMonths(11).some((s) => s.key === "pram"))
  assert.ok(getScalesForAgeMonths(12).some((s) => s.key === "pram"))
})

test("a idade da criança tira da lista a escala que não é da faixa dela", () => {
  const keysAt = (months: number | null) =>
    getScalesForAgeMonths(months).map((s) => s.key)

  // Recém-nascido: neonatologia sim, asma e Wong-Baker não.
  const newborn = keysAt(0)
  assert.ok(newborn.includes("apgar"))
  assert.ok(newborn.includes("nips"))
  assert.ok(!newborn.includes("pram"))
  assert.ok(!newborn.includes("wong-baker"))

  // Escolar de 8 anos: nada de neonatologia, nem crupe, nem Tal.
  const schoolAge = keysAt(96)
  assert.ok(!schoolAge.includes("apgar"))
  assert.ok(!schoolAge.includes("silverman-andersen"))
  assert.ok(!schoolAge.includes("westley"))
  assert.ok(!schoolAge.some((k) => k.startsWith("tal-")))
  assert.ok(schoolAge.includes("pram"))
  assert.ok(schoolAge.includes("wong-baker"))

  // Ficha sem data de nascimento: a lista vem inteira, o médico decide.
  assert.equal(keysAt(null).length, SCALES.length)
})
