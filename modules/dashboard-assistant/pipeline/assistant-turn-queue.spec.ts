import test from "node:test"
import assert from "node:assert/strict"
import {
  advanceQueue,
  buildAssistantTurnQueue,
  getCurrentQueueStep,
} from "@/modules/dashboard-assistant/pipeline/assistant-turn-queue"
import type { PipelineStep } from "@/modules/dashboard-assistant/contracts/turn-queue"

function buildSteps(): PipelineStep[] {
  return [
    {
      id: "step-1",
      kind: "REVIEW_ANTHROPOMETRIC_REFERENCE",
      originalInput: "peso 5kg altura 51cm",
      commandMessage: "peso 5kg altura 51cm",
      requiresConfirmation: true,
    },
    {
      id: "step-2",
      kind: "CALCULATE_BMI",
      originalInput: "qual imc?",
      commandMessage: "qual imc?",
      requiresConfirmation: false,
    },
  ]
}

test("buildAssistantTurnQueue returns null for single step", () => {
  const queue = buildAssistantTurnQueue({
    source: "heuristic",
    steps: [buildSteps()[0]],
  })
  assert.equal(queue, null)
})

test("advanceQueue moves cursor and then clears at end", () => {
  const queue = buildAssistantTurnQueue({
    source: "llm",
    steps: buildSteps(),
  })
  assert.ok(queue)
  assert.equal(getCurrentQueueStep(queue)?.id, "step-1")

  const advanced = advanceQueue(queue)
  assert.ok(advanced)
  assert.equal(getCurrentQueueStep(advanced)?.id, "step-2")

  const finished = advanceQueue(advanced)
  assert.equal(finished, null)
})
