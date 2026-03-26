import test from "node:test"
import assert from "node:assert/strict"
import {
  getReplyFromUnknownPayload,
  summaryFromStructuredPediatricPayload,
} from "@/modules/groq/lib/groq-response-parsers"

// --- getReplyFromUnknownPayload ---

test("getReplyFromUnknownPayload returns reply field when present", () => {
  assert.equal(getReplyFromUnknownPayload({ reply: "Hello" }), "Hello")
})

test("getReplyFromUnknownPayload trims reply", () => {
  assert.equal(getReplyFromUnknownPayload({ reply: "  Hello  " }), "Hello")
})

test("getReplyFromUnknownPayload falls back to content field", () => {
  assert.equal(getReplyFromUnknownPayload({ content: "Hi" }), "Hi")
})

test("getReplyFromUnknownPayload falls back to message field", () => {
  assert.equal(getReplyFromUnknownPayload({ message: "Hey" }), "Hey")
})

test("getReplyFromUnknownPayload prefers reply over content", () => {
  assert.equal(getReplyFromUnknownPayload({ reply: "A", content: "B" }), "A")
})

test("getReplyFromUnknownPayload returns null for empty reply", () => {
  assert.equal(getReplyFromUnknownPayload({ reply: "   " }), null)
})

test("getReplyFromUnknownPayload returns null for non-object", () => {
  assert.equal(getReplyFromUnknownPayload(null), null)
  assert.equal(getReplyFromUnknownPayload(undefined), null)
  assert.equal(getReplyFromUnknownPayload("string"), null)
  assert.equal(getReplyFromUnknownPayload(42), null)
})

test("getReplyFromUnknownPayload returns null for object with no recognized keys", () => {
  assert.equal(getReplyFromUnknownPayload({ foo: "bar" }), null)
})

// --- summaryFromStructuredPediatricPayload ---

test("summaryFromStructuredPediatricPayload formats queixa_principal and conduta", () => {
  const result = summaryFromStructuredPediatricPayload({
    queixa_principal: "Febre há 2 dias",
    conduta: "Antitérmico SOS",
  })
  assert.ok(result)
  assert.ok(result.includes("Queixa principal\nFebre há 2 dias"))
  assert.ok(result.includes("Conduta\nAntitérmico SOS"))
})

test("summaryFromStructuredPediatricPayload handles camelCase keys", () => {
  const result = summaryFromStructuredPediatricPayload({
    queixaPrincipal: "Tosse",
    dadosRelevantes: "Prematuro 34 semanas",
  })
  assert.ok(result)
  assert.ok(result.includes("Queixa principal\nTosse"))
  assert.ok(result.includes("Dados relevantes\nPrematuro 34 semanas"))
})

test("summaryFromStructuredPediatricPayload formats array values as bullets", () => {
  const result = summaryFromStructuredPediatricPayload({
    hipoteses: ["IVAS", "Otite média"],
  })
  assert.ok(result)
  assert.ok(result.includes("Hipóteses\n- IVAS\n- Otite média"))
})

test("summaryFromStructuredPediatricPayload skips empty values", () => {
  const result = summaryFromStructuredPediatricPayload({
    queixa_principal: "",
    conduta: "Observação",
  })
  assert.ok(result)
  assert.ok(!result.includes("Queixa principal"))
  assert.ok(result.includes("Conduta\nObservação"))
})

test("summaryFromStructuredPediatricPayload returns null for empty object", () => {
  assert.equal(summaryFromStructuredPediatricPayload({}), null)
})

test("summaryFromStructuredPediatricPayload returns null for non-object", () => {
  assert.equal(summaryFromStructuredPediatricPayload(null), null)
  assert.equal(summaryFromStructuredPediatricPayload("text"), null)
})

test("summaryFromStructuredPediatricPayload skips empty arrays", () => {
  assert.equal(summaryFromStructuredPediatricPayload({ conduta: [] }), null)
})

test("summaryFromStructuredPediatricPayload filters blank array items", () => {
  const result = summaryFromStructuredPediatricPayload({
    conduta: ["Observação", "", "  "],
  })
  assert.ok(result)
  assert.equal(result, "Conduta\n- Observação")
})
