import test from "node:test"
import assert from "node:assert/strict"
import { parseGroqJsonReply } from "@/modules/groq/lib/parse-groq-json-reply"

test("parseGroqJsonReply parses clean JSON with reply key", () => {
  assert.equal(parseGroqJsonReply('{"reply":"Registrado."}'), "Registrado.")
})

test("parseGroqJsonReply strips ```json fences before parsing", () => {
  assert.equal(parseGroqJsonReply('```json\n{"reply":"ok"}\n```'), "ok")
})

test("parseGroqJsonReply handles content key", () => {
  assert.equal(parseGroqJsonReply('{"content":"Resposta"}'), "Resposta")
})

test("parseGroqJsonReply handles message key", () => {
  assert.equal(parseGroqJsonReply('{"message":"Oi"}'), "Oi")
})

test("parseGroqJsonReply returns null for invalid JSON", () => {
  assert.equal(parseGroqJsonReply("not json at all"), null)
})

test("parseGroqJsonReply returns null for empty string", () => {
  assert.equal(parseGroqJsonReply(""), null)
})

test("parseGroqJsonReply returns null for JSON without recognized keys", () => {
  assert.equal(parseGroqJsonReply('{"foo":"bar"}'), null)
})

test("parseGroqJsonReply returns null for empty reply", () => {
  assert.equal(parseGroqJsonReply('{"reply":""}'), null)
})

test("parseGroqJsonReply trims reply value", () => {
  assert.equal(parseGroqJsonReply('{"reply":"  Hello  "}'), "Hello")
})
