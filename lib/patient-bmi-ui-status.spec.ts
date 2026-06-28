import test from "node:test"
import assert from "node:assert/strict"

import { getPatientChartBmiPresentation } from "@/lib/patient-bmi-ui-status"
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

test("getPatientChartBmiPresentation returns none without weight", () => {
  const p = buildPatient({ height: "61" })
  assert.deepEqual(getPatientChartBmiPresentation(p), { kind: "none" })
})

test("getPatientChartBmiPresentation returns value with status for plausible child", () => {
  const p = buildPatient({
    weight: "6.25",
    height: "61",
    birth_date: "2025-11-18",
  })
  const r = getPatientChartBmiPresentation(p)
  assert.equal(r.kind, "value")
  if (r.kind === "value") {
    assert.ok(r.label.length > 0)
    assert.ok(["good", "warn", "bad"].includes(r.status))
  }
})
