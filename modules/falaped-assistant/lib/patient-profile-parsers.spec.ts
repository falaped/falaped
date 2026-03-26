import test from "node:test"
import assert from "node:assert/strict"
import {
  parseNumericValue,
  normalizeComparableText,
  normalizePatientHeightToCm,
  parseHeadCircumferenceCmFromMessage,
  parseBloodTypeFromMessage,
  parseLabeledTextValue,
  parseContactPhoneFromMessage,
  parseBirthDateFromMessage,
  parseSexFromMessage,
  detectPatientProfileUpdateCandidate,
  looksLikePatientProfileDictation,
} from "@/modules/falaped-assistant/lib/patient-profile-parsers"

const EMPTY_PROFILE = {
  id: "p-1",
  name: null,
  birth_date: null,
  responsible: null,
  contact_phone: null,
  sex: null,
  legal_guardian: null,
  blood_type: null,
  weight: null,
  height: null,
  head_circumference: null,
  allergies: null,
  current_medications: null,
  medical_history: null,
}

test("parseNumericValue extracts integers", () => {
  assert.equal(parseNumericValue("5 kg"), 5)
})

test("parseNumericValue extracts decimals with comma", () => {
  assert.equal(parseNumericValue("5,3 kg"), 5.3)
})

test("parseNumericValue extracts decimals with dot", () => {
  assert.equal(parseNumericValue("5.3 kg"), 5.3)
})

test("parseNumericValue returns null for non-numeric", () => {
  assert.equal(parseNumericValue("abc"), null)
})

test("normalizeComparableText trims and normalizes", () => {
  assert.equal(normalizeComparableText("  João  Silva  "), "joao silva")
})

test("normalizeComparableText returns null for empty", () => {
  assert.equal(normalizeComparableText(""), null)
  assert.equal(normalizeComparableText(null), null)
})

test("normalizePatientHeightToCm converts meters to cm", () => {
  assert.equal(normalizePatientHeightToCm("0.51"), 51)
  assert.equal(normalizePatientHeightToCm("1.2"), 120)
})

test("normalizePatientHeightToCm keeps cm values", () => {
  assert.equal(normalizePatientHeightToCm("51"), 51)
  assert.equal(normalizePatientHeightToCm("120"), 120)
})

test("normalizePatientHeightToCm returns null for invalid", () => {
  assert.equal(normalizePatientHeightToCm(null), null)
  assert.equal(normalizePatientHeightToCm("abc"), null)
})

test("parseHeadCircumferenceCmFromMessage extracts valid head circumference", () => {
  assert.equal(parseHeadCircumferenceCmFromMessage("PC: 35 cm"), 35)
  assert.equal(parseHeadCircumferenceCmFromMessage("perímetro cefálico: 34.5 cm"), 34.5)
})

test("parseHeadCircumferenceCmFromMessage returns null for out of range", () => {
  assert.equal(parseHeadCircumferenceCmFromMessage("PC: 10 cm"), null)
  assert.equal(parseHeadCircumferenceCmFromMessage("PC: 80 cm"), null)
})

test("parseBloodTypeFromMessage extracts blood types with text", () => {
  assert.equal(parseBloodTypeFromMessage("tipo sanguíneo A positivo"), "A+")
  assert.equal(parseBloodTypeFromMessage("O negativo"), "O-")
  assert.equal(parseBloodTypeFromMessage("AB positivo"), "AB+")
})

test("parseBloodTypeFromMessage extracts blood types with symbols", () => {
  assert.equal(parseBloodTypeFromMessage("tipo sanguíneo: A+"), "A+")
  assert.equal(parseBloodTypeFromMessage("tipo sanguíneo O-"), "O-")
})

test("parseBloodTypeFromMessage returns null when no blood type", () => {
  assert.equal(parseBloodTypeFromMessage("paciente com febre"), null)
})

test("parseLabeledTextValue extracts labeled values", () => {
  assert.equal(parseLabeledTextValue("nome do paciente: João", ["nome do paciente"]), "João")
  assert.equal(parseLabeledTextValue("alergias: penicilina", ["alergias"]), "penicilina")
})

test("parseLabeledTextValue returns null when label missing", () => {
  assert.equal(parseLabeledTextValue("peso 5kg", ["nome do paciente"]), null)
})

test("parseContactPhoneFromMessage extracts phone numbers", () => {
  assert.equal(parseContactPhoneFromMessage("telefone: (11) 99999-1234"), "11999991234")
})

test("parseContactPhoneFromMessage returns null for short numbers", () => {
  assert.equal(parseContactPhoneFromMessage("telefone: 123"), null)
})

test("parseBirthDateFromMessage parses ISO format", () => {
  assert.equal(parseBirthDateFromMessage("data de nascimento: 2023-06-15"), "2023-06-15")
})

test("parseBirthDateFromMessage parses BR format", () => {
  assert.equal(parseBirthDateFromMessage("nascimento: 15/06/2023"), "2023-06-15")
})

test("parseBirthDateFromMessage returns null when no date", () => {
  assert.equal(parseBirthDateFromMessage("peso 5kg"), null)
})

test("parseSexFromMessage detects male", () => {
  assert.equal(parseSexFromMessage("sexo: masculino"), "male")
})

test("parseSexFromMessage detects female", () => {
  assert.equal(parseSexFromMessage("sexo: feminino"), "female")
})

test("parseSexFromMessage returns null when unspecified", () => {
  assert.equal(parseSexFromMessage("paciente com febre"), null)
})

test("detectPatientProfileUpdateCandidate detects weight and height updates", () => {
  const result = detectPatientProfileUpdateCandidate({
    userMessage: "peso 5kg altura 51cm",
    patientProfile: EMPTY_PROFILE,
  })
  assert.ok(result)
  assert.ok(result.updates.weight)
  assert.ok(result.updates.height)
  assert.ok(result.summaryLines.length >= 2)
})

test("detectPatientProfileUpdateCandidate returns null without profile id", () => {
  const result = detectPatientProfileUpdateCandidate({
    userMessage: "peso 5kg",
    patientProfile: { ...EMPTY_PROFILE, id: "" },
  })
  assert.equal(result, null)
})

test("detectPatientProfileUpdateCandidate returns null when no parseable data", () => {
  const result = detectPatientProfileUpdateCandidate({
    userMessage: "boa tarde",
    patientProfile: EMPTY_PROFILE,
  })
  assert.equal(result, null)
})

test("looksLikePatientProfileDictation detects weight/height patterns", () => {
  assert.equal(looksLikePatientProfileDictation("peso 5kg altura 51cm"), true)
})

test("looksLikePatientProfileDictation detects blood type patterns", () => {
  assert.equal(looksLikePatientProfileDictation("tipo sanguíneo O positivo"), true)
})

test("looksLikePatientProfileDictation returns false for plain text", () => {
  assert.equal(looksLikePatientProfileDictation("boa tarde doutor"), false)
})
