import test from "node:test"
import assert from "node:assert/strict"

import {
  classifyGrowthByZScore,
  percentilePositionLabel,
} from "@/lib/growth-classification"

test("WHO z-cutoffs map to good/warn/bad (bmi-for-age)", () => {
  assert.deepEqual(classifyGrowthByZScore(-3, "bmi-for-age"), {
    label: "IMC: magreza",
    status: "bad",
  })
  assert.deepEqual(classifyGrowthByZScore(0, "bmi-for-age"), {
    label: "IMC: eutrófico",
    status: "good",
  })
  assert.deepEqual(classifyGrowthByZScore(1.5, "bmi-for-age"), {
    label: "IMC: sobrepeso",
    status: "warn",
  })
  assert.deepEqual(classifyGrowthByZScore(2.5, "bmi-for-age"), {
    label: "IMC: obesidade",
    status: "bad",
  })
})

test("boundary values (-2, +1, +2 inclusive on the good/warn side)", () => {
  assert.equal(classifyGrowthByZScore(-2, "weight-for-age").status, "good") // -2 is good
  assert.equal(classifyGrowthByZScore(-2.0001, "weight-for-age").status, "bad")
  assert.equal(classifyGrowthByZScore(1, "weight-for-age").status, "good") // +1 is good
  assert.equal(classifyGrowthByZScore(1.0001, "weight-for-age").status, "warn")
  assert.equal(classifyGrowthByZScore(2, "weight-for-age").status, "warn") // +2 is warn
  assert.equal(classifyGrowthByZScore(2.0001, "weight-for-age").status, "bad")
})

test("labels are indicator-specific and PT-BR", () => {
  assert.equal(classifyGrowthByZScore(0, "weight-for-age").label, "Peso adequado")
  assert.equal(classifyGrowthByZScore(0, "height-for-age").label, "Estatura adequada")
  assert.equal(
    classifyGrowthByZScore(0, "head-circumference-for-age").label,
    "PC adequado",
  )
  assert.equal(classifyGrowthByZScore(-3, "head-circumference-for-age").label, "Microcefalia")
  assert.equal(classifyGrowthByZScore(3, "head-circumference-for-age").label, "Macrocefalia")
})

test("percentilePositionLabel formats Peso no P{n}", () => {
  assert.equal(percentilePositionLabel(0, "Peso"), "Peso no P50")
  // z≈0.6745 → P75
  assert.equal(percentilePositionLabel(0.6744898, "Peso"), "Peso no P75")
})

test("percentilePositionLabel handles out-of-range (Open Q2)", () => {
  assert.equal(percentilePositionLabel(3, "Peso"), "Peso > P97")
  assert.equal(percentilePositionLabel(-3, "IMC"), "IMC < P3")
})
