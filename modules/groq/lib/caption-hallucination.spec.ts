import test from "node:test"
import assert from "node:assert/strict"
import { looksLikeCaptionHallucination } from "@/modules/groq/lib/caption-hallucination"

test("detects 'Transcrição e Legendas' pattern", () => {
  assert.equal(looksLikeCaptionHallucination("Transcrição e Legendas por amara.org"), true)
})

test("detects combined legendas + transcricao in short text", () => {
  assert.equal(looksLikeCaptionHallucination("Legendas e transcrição feitas por..."), true)
})

test("does not flag combined legendas + transcricao in long text (>160 chars)", () => {
  const longText = "Legendas " + "a".repeat(140) + " transcrição"
  assert.equal(looksLikeCaptionHallucination(longText), false)
})

test("detects amara.org mention", () => {
  assert.equal(looksLikeCaptionHallucination("Criado com amara.org"), true)
})

test("detects 'subtitulos' pattern", () => {
  assert.equal(looksLikeCaptionHallucination("Subs titulos disponíveis"), true)
})

test("does not flag normal medical transcription", () => {
  assert.equal(looksLikeCaptionHallucination("Paciente apresenta febre há 3 dias"), false)
})

test("does not flag empty string", () => {
  assert.equal(looksLikeCaptionHallucination(""), false)
})

test("handles accented characters", () => {
  assert.equal(looksLikeCaptionHallucination("Transcrição e Legendas"), true)
})
