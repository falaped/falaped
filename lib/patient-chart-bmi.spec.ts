import test from "node:test"
import assert from "node:assert/strict"

import { getPatientChartBmiLabel } from "@/lib/patient-chart-bmi"
import type { Patient } from "@/modules/patients/types"

function buildPatient(overrides: Partial<Patient>): Patient {
  return {
    id: "id",
    profile_id: "pid",
    user_phone: null,
    name: "Test",
    birth_date: null,
    responsible: null,
    contact_phone: null,
    sex: null,
    legal_guardian: null,
    blood_type: null,
    gestational_age_weeks: null,
    weight: null,
    height: null,
    head_circumference: null,
    allergies: null,
    current_medications: null,
    medical_history: null,
    created_at: "2020-01-01",
    updated_at: "2020-01-01",
    ...overrides,
  }
}

test("getPatientChartBmiLabel returns null when weight missing", () => {
  assert.equal(getPatientChartBmiLabel(buildPatient({ height: "61" })), null)
})

test("getPatientChartBmiLabel returns null when height missing", () => {
  assert.equal(getPatientChartBmiLabel(buildPatient({ weight: "10" })), null)
})

test("getPatientChartBmiLabel returns formatted BMI for plausible pediatric values", () => {
  const label = getPatientChartBmiLabel(buildPatient({ weight: "6.25", height: "61" }))
  assert.ok(label != null && label.length > 0)
})
