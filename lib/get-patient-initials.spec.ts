import test from "node:test"
import assert from "node:assert/strict"
import { getPatientInitials } from "@/lib/get-patient-initials"

test("returns question mark for empty string", () => {
  assert.equal(getPatientInitials(""), "?")
})

test("single word uses first two letters", () => {
  assert.equal(getPatientInitials("Maria"), "MA")
})

test("multiple words uses first and last initial", () => {
  assert.equal(getPatientInitials("Ana Paula Silva"), "AS")
})
