import test from "node:test"
import assert from "node:assert/strict"
import { normalizeText, normalizeForNearDuplicate } from "@/modules/falaped-assistant/lib/normalize-text"

test("normalizeText strips diacritics", () => {
  assert.equal(normalizeText("café"), "cafe")
  assert.equal(normalizeText("orientação"), "orientacao")
})

test("normalizeText lowercases and trims", () => {
  assert.equal(normalizeText("  HELLO  "), "hello")
  assert.equal(normalizeText("  Foo Bar  "), "foo bar")
})

test("normalizeText handles combined accents", () => {
  assert.equal(normalizeText("Orientação Médica"), "orientacao medica")
  assert.equal(normalizeText("índice de massa corporal"), "indice de massa corporal")
})

test("normalizeText returns empty for empty string", () => {
  assert.equal(normalizeText(""), "")
})

test("normalizeText handles string with only spaces", () => {
  assert.equal(normalizeText("   "), "")
})

test("normalizeForNearDuplicate strips punctuation and collapses spaces", () => {
  assert.equal(normalizeForNearDuplicate("Registro realizado com sucesso."), "registro realizado com sucesso")
  assert.equal(normalizeForNearDuplicate("Peso: 5,3 kg"), "peso 5 3 kg")
})

test("normalizeForNearDuplicate handles empty input", () => {
  assert.equal(normalizeForNearDuplicate(""), "")
})
