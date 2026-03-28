import test from "node:test"
import assert from "node:assert/strict"
import { splitPatientContext } from "@/modules/groq/lib/split-patient-context"

test("splitPatientContext returns nulls for null input", () => {
  const result = splitPatientContext(null)
  assert.equal(result.identity, null)
  assert.equal(result.clinical, null)
})

test("splitPatientContext splits identity fields", () => {
  const ctx = {
    name: "João",
    birth_date: "2023-01-01",
    responsible: "Maria",
    contact_phone: "11999999999",
    sex: "masculino",
    legal_guardian: null,
    blood_type: "O+",
    weight: "10.5",
    height: "75",
    head_circumference: "45",
    allergies: null,
    current_medications: null,
    medical_history: null,
  }

  const result = splitPatientContext(ctx)

  assert.deepEqual(result.identity, {
    name: "João",
    birth_date: "2023-01-01",
    responsible: "Maria",
    contact_phone: "11999999999",
  })
})

test("splitPatientContext splits clinical fields", () => {
  const ctx = {
    name: "João",
    birth_date: "2023-01-01",
    responsible: "Maria",
    contact_phone: "11999999999",
    sex: "feminino",
    legal_guardian: "Pedro",
    blood_type: "A-",
    weight: "8",
    height: "65",
    head_circumference: "40",
    allergies: "Dipirona",
    current_medications: "Vitamina D",
    medical_history: "Prematuro 34s",
  }

  const result = splitPatientContext(ctx)

  assert.deepEqual(result.clinical, {
    sex: "feminino",
    legal_guardian: "Pedro",
    blood_type: "A-",
    weight: "8",
    height: "65",
    head_circumference: "40",
    allergies: "Dipirona",
    current_medications: "Vitamina D",
    medical_history: "Prematuro 34s",
  })
})
