import test from "node:test"
import assert from "node:assert/strict"
import { isPipelineStepKind } from "@/modules/falaped-assistant/contracts/turn-queue"

test("isPipelineStepKind returns true for all valid intents", () => {
  const validKinds = [
    "CHAT", "QUESTION", "SUMMARY", "CALCULATE_BMI",
    "REVIEW_PATIENT_PROFILE_UPDATE", "REVIEW_ANTHROPOMETRIC_REFERENCE",
    "REVIEW_GUARDIAN_ALERT", "SUGGEST_GUARDIAN_QUESTIONS",
    "GENERATE_REPORT", "GENERATE_MEDICAL_CERTIFICATE",
    "GENERATE_PRESCRIPTION", "CLOSE_CASE",
  ]
  for (const kind of validKinds) {
    assert.equal(isPipelineStepKind(kind), true, `expected true for "${kind}"`)
  }
})

test("isPipelineStepKind returns false for unknown strings", () => {
  assert.equal(isPipelineStepKind("UNKNOWN"), false)
  assert.equal(isPipelineStepKind(""), false)
  assert.equal(isPipelineStepKind("chat"), false)
  assert.equal(isPipelineStepKind("generate_report"), false)
})
