import { test } from "node:test"
import assert from "node:assert/strict"

import { aiCost } from "@/lib/ai-pricing"

test("aiCost soma entrada e saída por milhão de tokens", () => {
  const cost = aiCost({ model: "openai/gpt-oss-120b", prompt_tokens: 1_000_000, completion_tokens: 500_000, audio_seconds: null })
  assert.equal(cost, 0.45)
})

test("aiCost cobra o áudio por hora, mesmo vindo como texto do numeric", () => {
  assert.equal(aiCost({ model: "whisper-large-v3", prompt_tokens: null, completion_tokens: null, audio_seconds: "1800" }), 0.0555)
})

test("aiCost devolve null para modelo sem preço", () => {
  assert.equal(aiCost({ model: "desconhecido", prompt_tokens: 10, completion_tokens: 10, audio_seconds: null }), null)
})
