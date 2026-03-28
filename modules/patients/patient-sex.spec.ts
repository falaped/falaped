import test from "node:test"
import assert from "node:assert/strict"

import {
  formatPatientSexForDisplay,
  normalizePatientSexFromDb,
} from "@/modules/patients/patient-sex"

test("normalizePatientSexFromDb maps enum keys", () => {
  assert.equal(normalizePatientSexFromDb("masculino"), "masculino")
  assert.equal(normalizePatientSexFromDb("feminino"), "feminino")
})

test("normalizePatientSexFromDb maps legacy labels and abbreviations", () => {
  assert.equal(normalizePatientSexFromDb("Masculino"), "masculino")
  assert.equal(normalizePatientSexFromDb("Feminino"), "feminino")
  assert.equal(normalizePatientSexFromDb("M"), "masculino")
  assert.equal(normalizePatientSexFromDb("F"), "feminino")
  assert.equal(normalizePatientSexFromDb("male"), "masculino")
  assert.equal(normalizePatientSexFromDb("female"), "feminino")
})

test("normalizePatientSexFromDb returns null for empty or unknown", () => {
  assert.equal(normalizePatientSexFromDb(null), null)
  assert.equal(normalizePatientSexFromDb(""), null)
  assert.equal(normalizePatientSexFromDb("  "), null)
  assert.equal(normalizePatientSexFromDb("outro"), null)
})

test("formatPatientSexForDisplay returns Portuguese labels", () => {
  assert.equal(formatPatientSexForDisplay("masculino"), "Masculino")
  assert.equal(formatPatientSexForDisplay("M"), "Masculino")
  assert.equal(formatPatientSexForDisplay("feminino"), "Feminino")
  assert.equal(formatPatientSexForDisplay(""), "")
})
