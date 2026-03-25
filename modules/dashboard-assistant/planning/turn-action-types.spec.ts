import test from "node:test"
import assert from "node:assert/strict"
import {
  actionRequiresConfirmation,
  orderActions,
  type TurnAction,
} from "@/modules/dashboard-assistant/planning/turn-action-types"

function action(kind: TurnAction["kind"], source: TurnAction["source"] = "llm"): TurnAction {
  return {
    kind,
    source,
    originalInput: "test",
    commandMessage: "test",
    requiresConfirmation: actionRequiresConfirmation(kind),
  }
}

test("orderActions sorts by canonical priority", () => {
  const actions = [
    action("GENERATE_REPORT"),
    action("CALCULATE_BMI"),
    action("REVIEW_ANTHROPOMETRIC_REFERENCE", "rule"),
    action("SUMMARY"),
  ]

  const ordered = orderActions(actions)
  assert.deepEqual(
    ordered.map((a) => a.kind),
    ["REVIEW_ANTHROPOMETRIC_REFERENCE", "CALCULATE_BMI", "SUMMARY", "GENERATE_REPORT"],
  )
})

test("orderActions deduplicates by kind", () => {
  const actions = [
    action("CALCULATE_BMI"),
    action("CALCULATE_BMI"),
    action("SUMMARY"),
  ]

  const ordered = orderActions(actions)
  assert.deepEqual(
    ordered.map((a) => a.kind),
    ["CALCULATE_BMI", "SUMMARY"],
  )
})

test("actionRequiresConfirmation returns correct values", () => {
  assert.equal(actionRequiresConfirmation("GENERATE_REPORT"), true)
  assert.equal(actionRequiresConfirmation("CLOSE_CASE"), true)
  assert.equal(actionRequiresConfirmation("REVIEW_ANTHROPOMETRIC_REFERENCE"), true)
  assert.equal(actionRequiresConfirmation("CALCULATE_BMI"), false)
  assert.equal(actionRequiresConfirmation("CHAT"), false)
  assert.equal(actionRequiresConfirmation("SUMMARY"), false)
  assert.equal(actionRequiresConfirmation("QUESTION"), false)
})

test("orderActions handles full multi-action example", () => {
  const actions = [
    action("GENERATE_REPORT"),
    action("SUMMARY"),
    action("CALCULATE_BMI"),
    action("REVIEW_ANTHROPOMETRIC_REFERENCE", "rule"),
  ]

  const ordered = orderActions(actions)
  assert.deepEqual(
    ordered.map((a) => a.kind),
    ["REVIEW_ANTHROPOMETRIC_REFERENCE", "CALCULATE_BMI", "SUMMARY", "GENERATE_REPORT"],
  )
  assert.equal(ordered[0].requiresConfirmation, true)
  assert.equal(ordered[1].requiresConfirmation, false)
  assert.equal(ordered[2].requiresConfirmation, false)
  assert.equal(ordered[3].requiresConfirmation, true)
})
