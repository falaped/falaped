import test from "node:test"
import assert from "node:assert/strict"
import {
  hasAnthropometricDivergence,
  shouldInjectGuardianAlertReview,
} from "@/modules/falaped-assistant/planning/planning-helpers"

test("hasAnthropometricDivergence detects weight divergence", () => {
  const result = hasAnthropometricDivergence("peso 6kg", { weight: 5, height: null })
  assert.equal(result.hasInput, true)
  assert.equal(result.diverges, true)
})

test("hasAnthropometricDivergence returns no divergence for same weight", () => {
  const result = hasAnthropometricDivergence("peso 5kg", { weight: 5, height: null })
  assert.equal(result.hasInput, true)
  assert.equal(result.diverges, false)
})

test("hasAnthropometricDivergence returns hasInput false for non-anthropometric text", () => {
  const result = hasAnthropometricDivergence("boa tarde", { weight: 5, height: 0.51 })
  assert.equal(result.hasInput, false)
  assert.equal(result.diverges, false)
})

test("shouldInjectGuardianAlertReview returns true for guardian cue", () => {
  assert.equal(shouldInjectGuardianAlertReview("queixa da mãe: febre alta"), true)
})

test("shouldInjectGuardianAlertReview returns true for clinical alert signals", () => {
  assert.equal(shouldInjectGuardianAlertReview("urgência, encaminhamento imediato"), true)
})

test("shouldInjectGuardianAlertReview returns false for plain text", () => {
  assert.equal(shouldInjectGuardianAlertReview("peso 5kg"), false)
})
