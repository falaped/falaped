import test from "node:test"
import assert from "node:assert/strict"
import {
  getFallbackResult,
  parseJsonResponse,
  normalizeSections,
} from "@/modules/groq/lib/template-section-parsers"

// --- getFallbackResult ---

test("getFallbackResult returns a valid template with 4 sections", () => {
  const result = getFallbackResult()
  assert.equal(result.suggestedName, "Template sugerido pela IA")
  assert.equal(result.sections.length, 4)
  assert.equal(result.sections[0].name, "Queixa principal")
})

test("getFallbackResult returns stable output across calls", () => {
  const a = getFallbackResult()
  const b = getFallbackResult()
  assert.deepEqual(a, b)
})

// --- parseJsonResponse ---

test("parseJsonResponse parses valid JSON object", () => {
  const result = parseJsonResponse('{"suggestedName":"Test","sections":[]}')
  assert.ok(result)
  assert.equal(result.suggestedName, "Test")
  assert.deepEqual(result.sections, [])
})

test("parseJsonResponse strips json fences before parsing", () => {
  const result = parseJsonResponse('```json\n{"suggestedName":"AI"}\n```')
  assert.ok(result)
  assert.equal(result.suggestedName, "AI")
})

test("parseJsonResponse returns null for invalid JSON", () => {
  assert.equal(parseJsonResponse("not json"), null)
})

test("parseJsonResponse returns null for array", () => {
  assert.equal(parseJsonResponse('[{"name":"A"}]'), null)
})

test("parseJsonResponse returns null for primitive", () => {
  assert.equal(parseJsonResponse('"string"'), null)
})

// --- normalizeSections ---

test("normalizeSections returns valid sections", () => {
  const sections = normalizeSections([
    { name: "Queixa principal", description: "Motivo da consulta" },
    { name: "Conduta" },
  ])
  assert.equal(sections.length, 2)
  assert.equal(sections[0].name, "Queixa principal")
  assert.equal(sections[0].description, "Motivo da consulta")
  assert.equal(sections[1].name, "Conduta")
  assert.equal(sections[1].description, undefined)
})

test("normalizeSections deduplicates by name", () => {
  const sections = normalizeSections([
    { name: "Conduta" },
    { name: "Conduta" },
  ])
  assert.equal(sections.length, 1)
})

test("normalizeSections skips non-object items", () => {
  const sections = normalizeSections([null, "string", 42, { name: "Valid" }])
  assert.equal(sections.length, 1)
  assert.equal(sections[0].name, "Valid")
})

test("normalizeSections skips items without name", () => {
  const sections = normalizeSections([{ description: "orphan" }])
  assert.equal(sections.length, 0)
})

test("normalizeSections skips items with empty name", () => {
  const sections = normalizeSections([{ name: "" }, { name: "  " }])
  assert.equal(sections.length, 0)
})

test("normalizeSections trims name to 200 chars", () => {
  const longName = "A".repeat(250)
  const sections = normalizeSections([{ name: longName }])
  assert.equal(sections[0].name.length, 200)
})

test("normalizeSections filters fixed-slot sections (e.g. 'Dados do paciente')", () => {
  const sections = normalizeSections([
    { name: "Dados do paciente" },
    { name: "Conduta" },
  ])
  assert.equal(sections.length, 1)
  assert.equal(sections[0].name, "Conduta")
})

test("normalizeSections filters 'Pediatra' section", () => {
  const sections = normalizeSections([
    { name: "Pediatra" },
    { name: "Exame físico" },
  ])
  assert.equal(sections.length, 1)
  assert.equal(sections[0].name, "Exame físico")
})
