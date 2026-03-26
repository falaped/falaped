import test from "node:test"
import assert from "node:assert/strict"
import {
  parseAssistantTurnQueue,
  buildAssistantTurnQueue,
  getCurrentQueueStep,
  advanceQueue,
  withBlockedAssistantMessageId,
} from "@/modules/falaped-assistant/pipeline/assistant-turn-queue"

const VALID_QUEUE_INPUT = {
  version: 1,
  source: "heuristic",
  cursor: 0,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
  steps: [
    { id: "s1", kind: "SUMMARY", originalInput: "/resumo", commandMessage: "/resumo", requiresConfirmation: false },
    { id: "s2", kind: "CLOSE_CASE", originalInput: "encerrar", commandMessage: "encerrar caso", requiresConfirmation: true },
  ],
}

test("parseAssistantTurnQueue parses valid input", () => {
  const result = parseAssistantTurnQueue(VALID_QUEUE_INPUT)
  assert.ok(result)
  assert.equal(result.version, 1)
  assert.equal(result.steps.length, 2)
  assert.equal(result.cursor, 0)
})

test("parseAssistantTurnQueue returns null for missing version", () => {
  assert.equal(parseAssistantTurnQueue({ steps: [], cursor: 0 }), null)
})

test("parseAssistantTurnQueue returns null for invalid step kind", () => {
  const input = {
    ...VALID_QUEUE_INPUT,
    steps: [{ id: "s1", kind: "INVALID", originalInput: "x", commandMessage: "x" }],
  }
  assert.equal(parseAssistantTurnQueue(input), null)
})

test("parseAssistantTurnQueue returns null for null/undefined", () => {
  assert.equal(parseAssistantTurnQueue(null), null)
  assert.equal(parseAssistantTurnQueue(undefined), null)
})

test("buildAssistantTurnQueue returns null for single step", () => {
  const result = buildAssistantTurnQueue({
    source: "heuristic",
    steps: [{ id: "s1", kind: "SUMMARY", originalInput: "/resumo", commandMessage: "/resumo", requiresConfirmation: false }],
  })
  assert.equal(result, null)
})

test("buildAssistantTurnQueue creates queue for multiple steps", () => {
  const result = buildAssistantTurnQueue({
    source: "llm",
    steps: [
      { id: "s1", kind: "SUMMARY", originalInput: "/resumo", commandMessage: "/resumo", requiresConfirmation: false },
      { id: "s2", kind: "CLOSE_CASE", originalInput: "encerrar", commandMessage: "encerrar caso", requiresConfirmation: true },
    ],
  })
  assert.ok(result)
  assert.equal(result.cursor, 0)
  assert.equal(result.steps.length, 2)
  assert.equal(result.steps[0].kind, "SUMMARY")
  assert.equal(result.steps[1].kind, "CLOSE_CASE")
})

test("getCurrentQueueStep returns current step", () => {
  const queue = parseAssistantTurnQueue(VALID_QUEUE_INPUT)
  const step = getCurrentQueueStep(queue)
  assert.ok(step)
  assert.equal(step.kind, "SUMMARY")
})

test("getCurrentQueueStep returns null for null queue", () => {
  assert.equal(getCurrentQueueStep(null), null)
})

test("advanceQueue moves cursor", () => {
  const queue = parseAssistantTurnQueue(VALID_QUEUE_INPUT)!
  const advanced = advanceQueue(queue)
  assert.ok(advanced)
  assert.equal(advanced.cursor, 1)
})

test("advanceQueue returns null at end", () => {
  const queue = parseAssistantTurnQueue(VALID_QUEUE_INPUT)!
  const advanced = advanceQueue(queue)!
  assert.equal(advanceQueue(advanced), null)
})

test("withBlockedAssistantMessageId sets the ID", () => {
  const queue = parseAssistantTurnQueue(VALID_QUEUE_INPUT)!
  const updated = withBlockedAssistantMessageId(queue, "msg-123")
  assert.equal(updated.blockedAssistantMessageId, "msg-123")
})
