import test from "node:test"
import assert from "node:assert/strict"
import {
  cleanupRawContent,
  parseActionsFromPayload,
} from "@/modules/falaped-assistant/planning/llm-action-parsers"

test("cleanupRawContent strips markdown code fences", () => {
  assert.equal(cleanupRawContent('```json\n{"actions":["CHAT"]}\n```'), '{"actions":["CHAT"]}')
})

test("cleanupRawContent strips plain code fences", () => {
  assert.equal(cleanupRawContent('```\n{"actions":["CHAT"]}\n```'), '{"actions":["CHAT"]}')
})

test("cleanupRawContent trims whitespace", () => {
  assert.equal(cleanupRawContent('  {"actions":["CHAT"]}  '), '{"actions":["CHAT"]}')
})

test("parseActionsFromPayload parses valid actions", () => {
  const result = parseActionsFromPayload({ actions: ["CHAT", "SUMMARY"] })
  assert.deepEqual(result, ["CHAT", "SUMMARY"])
})

test("parseActionsFromPayload filters invalid actions", () => {
  const result = parseActionsFromPayload({ actions: ["CHAT", "INVALID", "SUMMARY"] })
  assert.deepEqual(result, ["CHAT", "SUMMARY"])
})

test("parseActionsFromPayload returns empty for null input", () => {
  assert.deepEqual(parseActionsFromPayload(null), [])
})

test("parseActionsFromPayload returns empty for missing actions array", () => {
  assert.deepEqual(parseActionsFromPayload({ foo: "bar" }), [])
})

test("parseActionsFromPayload handles non-string items", () => {
  const result = parseActionsFromPayload({ actions: [123, "CHAT", null] })
  assert.deepEqual(result, ["CHAT"])
})
