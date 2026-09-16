import type { BookQuality } from "@/modules/books/constants"

const MODEL_URL = "https://api.replicate.com/v1/models/openai/gpt-image-2/predictions"
const MAX_ATTEMPTS = 3
const POLL_MS = 4000

export type GenerateImageInput = {
  prompt: string
  /** URLs públicas ou assinadas: fotos da criança primeiro, depois capa e páginas-âncora. */
  imageUrls: string[]
  quality: BookQuality
}

export type GenerateImageDeps = {
  token: string
  fetchImpl?: typeof fetch
  sleep?: (ms: number) => Promise<void>
}

type Prediction = {
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled"
  output?: string | string[]
  error?: string | null
  urls?: { get: string }
}

/**
 * Gera uma imagem 3:4 no gpt-image-2 via Replicate e devolve o JPEG (q90).
 * Tenta até 3 vezes: cobre 429 (rate limit), falhas transitórias e a
 * moderação da OpenAI (E005 "flagged as sensitive"), que bloqueia ao acaso
 * fotos de criança e costuma passar na tentativa seguinte.
 */
export async function generateImage(
  { prompt, imageUrls, quality }: GenerateImageInput,
  { token, fetchImpl = fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }: GenerateImageDeps,
): Promise<Buffer> {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
  let lastError = "sem detalhes"

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetchImpl(MODEL_URL, {
      method: "POST",
      headers: { ...headers, Prefer: "wait=60" },
      body: JSON.stringify({
        input: { prompt, input_images: imageUrls, aspect_ratio: "3:4", quality, output_format: "jpeg", output_compression: 90 },
      }),
    })

    if (res.status === 429) {
      lastError = "rate limit (429)"
      await sleep(20_000)
      continue
    }
    if (!res.ok) throw new Error(`[BOOKS] Replicate respondeu ${res.status}: ${(await res.text()).slice(0, 300)}`)

    let prediction = (await res.json()) as Prediction
    while (prediction.status === "starting" || prediction.status === "processing") {
      if (!prediction.urls?.get) throw new Error("[BOOKS] Replicate não devolveu URL de polling")
      await sleep(POLL_MS)
      prediction = (await (await fetchImpl(prediction.urls.get, { headers })).json()) as Prediction
    }

    if (prediction.status === "succeeded") {
      const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
      if (!url) throw new Error("[BOOKS] Replicate não devolveu imagem")
      const img = await fetchImpl(url)
      if (!img.ok) throw new Error(`[BOOKS] Falha ao baixar imagem gerada (${img.status})`)
      return Buffer.from(await img.arrayBuffer())
    }

    lastError = prediction.error ?? prediction.status
  }

  throw new Error(`[BOOKS] Geração falhou após ${MAX_ATTEMPTS} tentativas: ${lastError}`)
}
