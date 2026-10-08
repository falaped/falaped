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
  parseAllergyAddition,
} from "@/modules/falaped-assistant/lib/patient-profile-parsers"
import { parseWeightHeightForBmi } from "@/lib/parse-anthropometrics-for-bmi"

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

test("parseSexFromMessage detects masculino key", () => {
  assert.equal(parseSexFromMessage("sexo: masculino"), "masculino")
})

test("parseSexFromMessage detects feminino key", () => {
  assert.equal(parseSexFromMessage("sexo: feminino"), "feminino")
})

test("parseSexFromMessage returns null when unspecified", () => {
  assert.equal(parseSexFromMessage("paciente com febre"), null)
})

test("chat não altera na ficha peso, estatura, nome, nascimento, responsáveis, telefone, sexo, medicações e histórico", () => {
  for (const userMessage of [
    "peso 5kg altura 51cm",
    "sexo: feminino",
    "nome do paciente: Ana",
    "responsável: Maria",
    "responsável legal: Mãe",
    "telefone: 31999998888",
    "data de nascimento: 01/02/2024",
    "medicações em uso: vitamina D",
    "histórico médico: asma",
  ]) {
    assert.equal(detectPatientProfileUpdateCandidate({ userMessage, patientProfile: EMPTY_PROFILE }), null, userMessage)
  }
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

test("adicionar alergia sem dois-pontos soma à lista da ficha", () => {
  assert.equal(parseAllergyAddition("adicionar alergia  amendoim"), "amendoim")
  assert.equal(parseAllergyAddition("incluir alergia a dipirona"), "dipirona")
  assert.equal(parseAllergyAddition("nega alergias"), null)

  const added = detectPatientProfileUpdateCandidate({
    userMessage: "adicionar alergia amendoim",
    patientProfile: { ...EMPTY_PROFILE, allergies: "Dipirona" },
  })
  assert.equal(added?.updates.allergies, "Dipirona, amendoim")

  const repeated = detectPatientProfileUpdateCandidate({
    userMessage: "adicionar alergia dipirona",
    patientProfile: { ...EMPTY_PROFILE, allergies: "Dipirona" },
  })
  assert.equal(repeated?.updates.allergies, undefined)
})

test("alterar altura e PC no chat: estatura acima de 130 cm com rótulo e PC com preposição", () => {
  assert.deepEqual(parseWeightHeightForBmi("altere a altura para 140cm e o PC para 23"), { weightKg: null, heightM: 1.4 })
  assert.equal(parseHeadCircumferenceCmFromMessage("altere a altura para 140cm e o PC para 23"), 23)
  assert.equal(parseHeadCircumferenceCmFromMessage("perímetro cefálico 47"), 47)
  assert.deepEqual(parseWeightHeightForBmi("pc de 46,5 cm"), { weightKg: null, heightM: null })
  // Sem rótulo, "cm" solto do ditado não vira estatura de adolescente.
  assert.deepEqual(parseWeightHeightForBmi("lesão de 150 cm"), { weightKg: null, heightM: null })
})
