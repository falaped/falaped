import test from "node:test"
import assert from "node:assert/strict"
import {
  formatAgeFromBirthDate,
  formatPtDecimal,
  formatBmiConfirmationReply,
  buildAnthropometrySummaryLine,
  buildPatientDataAccessReply,
  buildPatientGrammarHintForGuardianQuestions,
} from "@/modules/falaped-assistant/lib/formatters"

test("formatAgeFromBirthDate returns null for null input", () => {
  assert.equal(formatAgeFromBirthDate(null), null)
})

test("formatAgeFromBirthDate returns null for invalid date", () => {
  assert.equal(formatAgeFromBirthDate("not-a-date"), null)
})

test("formatAgeFromBirthDate formats months for young babies", () => {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const dateStr = sixMonthsAgo.toISOString().slice(0, 10)
  const result = formatAgeFromBirthDate(dateStr)
  assert.ok(result)
  assert.ok(result.includes("mes"), `expected "${result}" to contain "mes"`)
})

test("formatAgeFromBirthDate formats years for older children", () => {
  const threeYearsAgo = new Date()
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)
  const dateStr = threeYearsAgo.toISOString().slice(0, 10)
  const result = formatAgeFromBirthDate(dateStr)
  assert.ok(result)
  assert.ok(result.includes("ano"), `expected "${result}" to contain "ano"`)
})

test("formatPtDecimal formats with comma", () => {
  assert.equal(formatPtDecimal(5.3, 1), "5,3")
  assert.equal(formatPtDecimal(12.456, 2), "12,46")
})

test("formatBmiConfirmationReply with weight and height", () => {
  const result = formatBmiConfirmationReply({
    bmiValue: "16,2",
    weightValue: "5.3",
    heightValue: "51",
  })
  assert.ok(result.includes("IMC confirmado: 16,2"))
  assert.ok(result.includes("5.3 kg"))
  assert.ok(result.includes("51.0 cm"))
})

test("formatBmiConfirmationReply without weight/height", () => {
  const result = formatBmiConfirmationReply({
    bmiValue: "16,2",
    weightValue: null,
    heightValue: null,
  })
  assert.equal(result, "IMC confirmado: 16,2.")
})

test("buildAnthropometrySummaryLine returns null when both null", () => {
  assert.equal(buildAnthropometrySummaryLine({ weightKg: null, heightM: null }), null)
})

test("buildAnthropometrySummaryLine formats weight only", () => {
  const result = buildAnthropometrySummaryLine({ weightKg: 5.3, heightM: null })
  assert.ok(result)
  assert.ok(result.includes("peso 5.3 kg"))
})

test("buildPatientDataAccessReply shows no-patient message", () => {
  const result = buildPatientDataAccessReply(undefined)
  assert.ok(result.includes("não há paciente associado"))
})

test("buildPatientDataAccessReply shows patient data", () => {
  const result = buildPatientDataAccessReply({
    id: "p-1",
    name: "João",
    birth_date: null,
    responsible: "Maria",
    contact_phone: null,
    sex: null,
    legal_guardian: null,
    blood_type: "A+",
    weight: "5.3",
    height: "51",
    head_circumference: null,
    allergies: null,
    current_medications: null,
    medical_history: null,
  })
  assert.ok(result.includes("João"))
  assert.ok(result.includes("A+"))
  assert.ok(result.includes("5.3"))
  assert.ok(result.includes("Maria"))
})

test("buildPatientGrammarHintForGuardianQuestions without profile", () => {
  const result = buildPatientGrammarHintForGuardianQuestions(undefined)
  assert.ok(result.includes("a criança"))
})

test("buildPatientGrammarHintForGuardianQuestions with male patient", () => {
  const result = buildPatientGrammarHintForGuardianQuestions({
    id: "p-1",
    name: "João Silva",
    birth_date: null,
    responsible: null,
    contact_phone: null,
    sex: "male",
    legal_guardian: null,
    blood_type: null,
    weight: null,
    height: null,
    head_circumference: null,
    allergies: null,
    current_medications: null,
    medical_history: null,
  })
  assert.ok(result.includes("João"))
  assert.ok(result.includes("masculino"))
})
