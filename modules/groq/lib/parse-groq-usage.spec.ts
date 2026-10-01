import test from "node:test"
import assert from "node:assert/strict"
import { parseGroqUsage } from "@/modules/groq/lib/parse-groq-usage"

test("parseGroqUsage reads chat tokens", () => {
  assert.deepEqual(
    parseGroqUsage("https://api.groq.com/openai/v1/chat/completions", {
      model: "qwen/qwen3-32b",
      usage: { prompt_tokens: 120, completion_tokens: 40 },
    }),
    { model: "qwen/qwen3-32b", prompt_tokens: 120, completion_tokens: 40, audio_seconds: null },
  )
})

test("parseGroqUsage reads transcription duration with the 10 s minimum", () => {
  const url = "https://api.groq.com/openai/v1/audio/transcriptions"
  assert.equal(parseGroqUsage(url, { duration: 3.2 }, "whisper-large-v3")?.audio_seconds, 10)
  assert.equal(parseGroqUsage(url, { segments: [{ end: 5 }, { end: 42.5 }] })?.audio_seconds, 42.5)
  assert.equal(parseGroqUsage(url, { duration: 61 }, "whisper-large-v3")?.model, "whisper-large-v3")
})

test("parseGroqUsage returns null without usage", () => {
  assert.equal(parseGroqUsage("https://api.groq.com/openai/v1/chat/completions", {}), null)
  assert.equal(parseGroqUsage("https://api.groq.com/openai/v1/audio/transcriptions", { text: "oi" } as never), null)
})
