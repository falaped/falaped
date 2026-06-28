import test from "node:test"
import assert from "node:assert/strict"
import type { Patient } from "@/modules/patients/types"
import { sortPatientsForNewCase } from "@/lib/sort-patients-for-new-case"

function patient(id: string, name: string): Patient {
  return {
    id,
    profile_id: "profile-1",
    user_phone: null,
    name,
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
    created_at: "",
    updated_at: "",
  }
}

test("sorts only inactive patients by name", () => {
  const list = [patient("2", "Bravo"), patient("1", "Alpha")]
  const sorted = sortPatientsForNewCase(list, new Set())
  assert.deepEqual(
    sorted.map((p) => p.id),
    ["1", "2"],
  )
})

test("places active patients before inactive, then by name within each group", () => {
  const list = [
    patient("a", "Zulu"),
    patient("b", "Alpha"),
    patient("c", "Mike"),
  ]
  const sorted = sortPatientsForNewCase(list, new Set(["c", "a"]))
  assert.deepEqual(
    sorted.map((p) => p.id),
    ["c", "a", "b"],
  )
})

test("all active: ordered by name only", () => {
  const list = [patient("x", "B"), patient("y", "A")]
  const sorted = sortPatientsForNewCase(list, new Set(["x", "y"]))
  assert.deepEqual(
    sorted.map((p) => p.id),
    ["y", "x"],
  )
})

test("does not mutate the input array", () => {
  const list = [patient("1", "A")]
  const copy = [...list]
  sortPatientsForNewCase(list, new Set())
  assert.deepEqual(list, copy)
})
