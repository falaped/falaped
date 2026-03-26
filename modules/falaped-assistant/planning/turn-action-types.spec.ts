import test from "node:test"
import assert from "node:assert/strict"
import {
  actionRequiresConfirmation,
  orderActions,
  type TurnAction,
  type TurnActionKind,
} from "@/modules/falaped-assistant/planning/turn-action-types"

function makeAction(kind: TurnActionKind): TurnAction {
  return {
    kind,
    source: "llm",
    originalInput: kind,
    commandMessage: kind,
    requiresConfirmation: false,
  }
}

test("orderActions sorts by canonical priority", () => {
  const actions = [makeAction("CLOSE_CASE"), makeAction("SUMMARY"), makeAction("CHAT")]
  const ordered = orderActions(actions)
  assert.equal(ordered[0].kind, "CHAT")
  assert.equal(ordered[1].kind, "SUMMARY")
  assert.equal(ordered[2].kind, "CLOSE_CASE")
})

test("orderActions deduplicates by kind", () => {
  const actions = [makeAction("SUMMARY"), makeAction("SUMMARY"), makeAction("CHAT")]
  const ordered = orderActions(actions)
  assert.equal(ordered.length, 2)
})

test("actionRequiresConfirmation returns correct values", () => {
  assert.equal(actionRequiresConfirmation("GENERATE_REPORT"), true)
  assert.equal(actionRequiresConfirmation("CLOSE_CASE"), true)
  assert.equal(actionRequiresConfirmation("CHAT"), false)
  assert.equal(actionRequiresConfirmation("SUMMARY"), false)
})

test("orderActions handles full multi-action example", () => {
  const actions = [
    makeAction("GENERATE_REPORT"),
    makeAction("REVIEW_GUARDIAN_ALERT"),
    makeAction("SUMMARY"),
    makeAction("REVIEW_PATIENT_PROFILE_UPDATE"),
    makeAction("CLOSE_CASE"),
  ]
  const ordered = orderActions(actions)
  assert.equal(ordered[0].kind, "REVIEW_PATIENT_PROFILE_UPDATE")
  assert.equal(ordered[1].kind, "REVIEW_GUARDIAN_ALERT")
  assert.equal(ordered[2].kind, "SUMMARY")
  assert.equal(ordered[3].kind, "GENERATE_REPORT")
  assert.equal(ordered[4].kind, "CLOSE_CASE")
})
