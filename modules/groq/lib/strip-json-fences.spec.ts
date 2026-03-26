import test from "node:test"
import assert from "node:assert/strict"
import { stripJsonFences } from "@/modules/groq/lib/strip-json-fences"

test("stripJsonFences removes ```json opening and ``` closing", () => {
  assert.equal(stripJsonFences('```json\n{"reply":"ok"}\n```'), '{"reply":"ok"}')
})

test("stripJsonFences removes ``` without json tag", () => {
  assert.equal(stripJsonFences('```\n{"reply":"ok"}\n```'), '{"reply":"ok"}')
})

test("stripJsonFences handles no fences", () => {
  assert.equal(stripJsonFences('{"reply":"ok"}'), '{"reply":"ok"}')
})

test("stripJsonFences trims whitespace", () => {
  assert.equal(stripJsonFences('  {"reply":"ok"}  '), '{"reply":"ok"}')
})

test("stripJsonFences handles empty string", () => {
  assert.equal(stripJsonFences(""), "")
})

test("stripJsonFences is case-insensitive for JSON tag", () => {
  assert.equal(stripJsonFences('```JSON\n{"a":1}\n```'), '{"a":1}')
})
