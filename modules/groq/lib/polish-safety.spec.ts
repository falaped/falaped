import test from "node:test"
import assert from "node:assert/strict"
import {
  tokenJaccardSimilarity,
  polishLooksSafe,
  shouldSkipPolish,
} from "@/modules/groq/lib/polish-safety"

// --- tokenJaccardSimilarity ---

test("tokenJaccardSimilarity returns 1 for identical strings", () => {
  assert.equal(tokenJaccardSimilarity("hello world", "hello world"), 1)
})

test("tokenJaccardSimilarity returns 1 for both empty", () => {
  assert.equal(tokenJaccardSimilarity("", ""), 1)
})

test("tokenJaccardSimilarity returns 0 when one is empty", () => {
  assert.equal(tokenJaccardSimilarity("hello", ""), 0)
  assert.equal(tokenJaccardSimilarity("", "world"), 0)
})

test("tokenJaccardSimilarity returns 0 for completely different sets", () => {
  assert.equal(tokenJaccardSimilarity("abc def", "ghi jkl"), 0)
})

test("tokenJaccardSimilarity handles partial overlap", () => {
  const sim = tokenJaccardSimilarity("hello world foo", "hello world bar")
  assert.ok(sim > 0.4 && sim < 0.8)
})

test("tokenJaccardSimilarity ignores accents and case", () => {
  assert.equal(tokenJaccardSimilarity("Olá Mundo", "ola mundo"), 1)
})

test("tokenJaccardSimilarity ignores punctuation", () => {
  assert.equal(tokenJaccardSimilarity("hello, world!", "hello world"), 1)
})

// --- polishLooksSafe ---

test("polishLooksSafe returns true for minor corrections", () => {
  assert.equal(
    polishLooksSafe(
      "Registrado exame fisico do paciente",
      "Registrado exame físico do paciente.",
    ),
    true,
  )
})

test("polishLooksSafe returns false for empty polished text", () => {
  assert.equal(polishLooksSafe("hello", ""), false)
  assert.equal(polishLooksSafe("hello", "   "), false)
})

test("polishLooksSafe returns false for large length delta", () => {
  const original = "Short text"
  const polished = "This is a much longer text that has been completely rewritten with lots of extra content"
  assert.equal(polishLooksSafe(original, polished), false)
})

test("polishLooksSafe returns false for low similarity", () => {
  assert.equal(
    polishLooksSafe(
      "Paciente apresenta febre e tosse",
      "Prescrito amoxicilina e dipirona",
    ),
    false,
  )
})

test("polishLooksSafe returns true for identical text", () => {
  assert.equal(polishLooksSafe("Texto igual", "Texto igual"), true)
})

// --- shouldSkipPolish ---

test("shouldSkipPolish returns true for empty reply", () => {
  assert.equal(shouldSkipPolish("", "CHAT"), true)
  assert.equal(shouldSkipPolish("   ", "CHAT"), true)
})

test("shouldSkipPolish returns true for CALCULATE_BMI intent", () => {
  assert.equal(shouldSkipPolish("IMC estimado: 18.5", "CALCULATE_BMI"), true)
})

test("shouldSkipPolish returns true for reply starting with 'IMC estimado:'", () => {
  assert.equal(shouldSkipPolish("IMC estimado: 20.1 (percentil 75)", "CHAT"), true)
})

test("shouldSkipPolish returns true for short single-line reply", () => {
  assert.equal(shouldSkipPolish("Registrado.", "CHAT"), true)
})

test("shouldSkipPolish returns false for long single-line reply", () => {
  const longReply = "A".repeat(100)
  assert.equal(shouldSkipPolish(longReply, "CHAT"), false)
})

test("shouldSkipPolish returns false for short multi-line reply", () => {
  assert.equal(shouldSkipPolish("Curto\nmas multiline", "CHAT"), false)
})
