import test from "node:test"
import assert from "node:assert/strict"
import type { PipelineStep, PipelineStepKind } from "@/modules/falaped-assistant/contracts/turn-queue"
import {
  orderPipelineSteps,
  requiresConfirmationForStep,
} from "@/modules/falaped-assistant/pipeline/pipeline-policy"

function makeStep(kind: PipelineStepKind, commandMessage = kind): PipelineStep {
  return {
    id: `step-${kind}`,
    kind,
    originalInput: commandMessage,
    commandMessage,
    requiresConfirmation: false,
  }
}

test("orderPipelineSteps sorts intents in canonical order", () => {
  const steps = [makeStep("CLOSE_CASE"), makeStep("SUMMARY"), makeStep("REVIEW_PATIENT_PROFILE_UPDATE")]
  const ordered = orderPipelineSteps(steps)
  assert.equal(ordered[0].kind, "REVIEW_PATIENT_PROFILE_UPDATE")
  assert.equal(ordered[1].kind, "SUMMARY")
  assert.equal(ordered[2].kind, "CLOSE_CASE")
})

test("orderPipelineSteps deduplicates by kind:commandMessage", () => {
  const steps = [makeStep("SUMMARY"), makeStep("SUMMARY")]
  const ordered = orderPipelineSteps(steps)
  assert.equal(ordered.length, 1)
})

test("requiresConfirmationForStep marks critical steps", () => {
  assert.equal(requiresConfirmationForStep("GENERATE_REPORT"), true)
  assert.equal(requiresConfirmationForStep("CLOSE_CASE"), true)
  assert.equal(requiresConfirmationForStep("REVIEW_PATIENT_PROFILE_UPDATE"), true)
  assert.equal(requiresConfirmationForStep("REVIEW_ANTHROPOMETRIC_REFERENCE"), true)
  assert.equal(requiresConfirmationForStep("REVIEW_GUARDIAN_ALERT"), true)
  assert.equal(requiresConfirmationForStep("GENERATE_MEDICAL_CERTIFICATE"), true)
  assert.equal(requiresConfirmationForStep("GENERATE_PRESCRIPTION"), true)
})

test("requiresConfirmationForStep returns false for non-critical steps", () => {
  assert.equal(requiresConfirmationForStep("CHAT"), false)
  assert.equal(requiresConfirmationForStep("QUESTION"), false)
  assert.equal(requiresConfirmationForStep("SUMMARY"), false)
  assert.equal(requiresConfirmationForStep("CALCULATE_BMI"), false)
  assert.equal(requiresConfirmationForStep("SUGGEST_GUARDIAN_QUESTIONS"), false)
})
