import test from "node:test"
import assert from "node:assert/strict"

import { generateImage } from "@/modules/books/replicate/generate-image"

type Step = { status: number; body?: unknown; bytes?: ArrayBuffer }

function fakeFetch(steps: Step[]) {
  const calls: { url: string; body?: string }[] = []
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: init?.body as string | undefined })
    const step = steps.shift()
    if (!step) throw new Error("fetch inesperado: " + url)
    return new Response(step.bytes ?? JSON.stringify(step.body), { status: step.status })
  }) as unknown as typeof fetch
  return { impl, calls }
}

const deps = (impl: typeof fetch) => ({ token: "t", fetchImpl: impl, sleep: async () => {} })
const png = new Uint8Array([137, 80, 78, 71]).buffer

test("sucesso direto: envia fotos e referências, devolve o PNG", async () => {
  const { impl, calls } = fakeFetch([
    { status: 201, body: { status: "succeeded", output: ["https://img/1.png"] } },
    { status: 200, bytes: png },
  ])
  const buf = await generateImage({ prompt: "p", imageUrls: ["a", "b"], quality: "high" }, deps(impl))
  assert.deepEqual([...buf], [...new Uint8Array(png)])
  const sent = JSON.parse(calls[0].body!)
  assert.deepEqual(sent.input.input_images, ["a", "b"])
  assert.equal(sent.input.quality, "high")
  assert.equal(sent.input.aspect_ratio, "3:4")
})

test("faz polling enquanto processing", async () => {
  const { impl } = fakeFetch([
    { status: 201, body: { status: "processing", urls: { get: "https://poll" } } },
    { status: 200, body: { status: "processing", urls: { get: "https://poll" } } },
    { status: 200, body: { status: "succeeded", output: "https://img/1.png" } },
    { status: 200, bytes: png },
  ])
  const buf = await generateImage({ prompt: "p", imageUrls: [], quality: "medium" }, deps(impl))
  assert.equal(buf.length, 4)
})

test("moderação (failed) na 1ª tentativa e sucesso na 2ª", async () => {
  const { impl, calls } = fakeFetch([
    { status: 201, body: { status: "failed", error: "flagged as sensitive (E005)" } },
    { status: 201, body: { status: "succeeded", output: ["https://img/2.png"] } },
    { status: 200, bytes: png },
  ])
  await generateImage({ prompt: "p", imageUrls: [], quality: "high" }, deps(impl))
  assert.equal(calls.filter((c) => c.body).length, 2)
})

test("429 conta como tentativa e espera antes de repetir", async () => {
  const waits: number[] = []
  const { impl } = fakeFetch([
    { status: 429, body: { detail: "rate limit" } },
    { status: 201, body: { status: "succeeded", output: ["https://img/3.png"] } },
    { status: 200, bytes: png },
  ])
  await generateImage(
    { prompt: "p", imageUrls: [], quality: "high" },
    { token: "t", fetchImpl: impl, sleep: async (ms) => { waits.push(ms) } },
  )
  assert.deepEqual(waits, [20_000])
})

test("três falhas seguidas lançam erro [BOOKS] com o último motivo", async () => {
  const { impl } = fakeFetch([
    { status: 201, body: { status: "failed", error: "E005" } },
    { status: 201, body: { status: "failed", error: "E005" } },
    { status: 201, body: { status: "failed", error: "sem GPU" } },
  ])
  await assert.rejects(
    () => generateImage({ prompt: "p", imageUrls: [], quality: "high" }, deps(impl)),
    /\[BOOKS\].*3 tentativas.*sem GPU/,
  )
})

test("erro HTTP não recuperável lança imediatamente", async () => {
  const { impl } = fakeFetch([{ status: 401, body: { detail: "bad token" } }])
  await assert.rejects(
    () => generateImage({ prompt: "p", imageUrls: [], quality: "high" }, deps(impl)),
    /\[BOOKS\] Replicate respondeu 401/,
  )
})
