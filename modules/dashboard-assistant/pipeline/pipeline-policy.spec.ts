import test from "node:test"
import assert from "node:assert/strict"
import { orderPipelineSteps, requiresConfirmationForStep } from "@/modules/dashboard-assistant/pipeline/pipeline-policy"
import type { PipelineStep } from "@/modules/dashboard-assistant/contracts/turn-queue"

test("orderPipelineSteps sorts intents in canonical order", () => {
  const steps: PipelineStep[] = [
    {
      id: "1",
      kind: "GENERATE_REPORT",
      originalInput: "gerar relatorio",
      commandMessage: "gerar relatorio",
      requiresConfirmation: true,
    },
    {
      id: "2",
      kind: "CALCULATE_BMI",
      originalInput: "calcular imc",
      commandMessage: "calcular imc",
      requiresConfirmation: false,
    },
    {
      id: "3",
      kind: "REVIEW_ANTHROPOMETRIC_REFERENCE",
      originalInput: "peso 5kg altura 51cm",
      commandMessage: "peso 5kg altura 51cm",
      requiresConfirmation: true,
    },
  ]

  const ordered = orderPipelineSteps(steps)
  assert.deepEqual(
    ordered.map((step) => step.kind),
    ["REVIEW_ANTHROPOMETRIC_REFERENCE", "CALCULATE_BMI", "GENERATE_REPORT"],
  )
})

test("requiresConfirmationForStep marks critical steps", () => {
  assert.equal(requiresConfirmationForStep("GENERATE_REPORT"), true)
  assert.equal(requiresConfirmationForStep("CLOSE_CASE"), true)
  assert.equal(requiresConfirmationForStep("CALCULATE_BMI"), false)
})
