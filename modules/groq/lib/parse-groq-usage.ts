export type GroqUsage = {
  model: string
  prompt_tokens: number | null
  completion_tokens: number | null
  audio_seconds: number | null
}

type GroqResponseBody = {
  model?: string
  usage?: { prompt_tokens?: number; completion_tokens?: number }
  duration?: number
  segments?: { end?: number }[]
}

/** Groq cobra no mínimo 10 s por transcrição, mesmo para áudio mais curto. */
const MIN_BILLED_AUDIO_SECONDS = 10

/**
 * Tira o consumo do corpo de uma resposta do Groq: tokens no chat, segundos na
 * transcrição (`duration`, ou o fim do último segmento do `verbose_json`).
 * Devolve null quando a resposta não traz consumo (erro, outra rota).
 */
export function parseGroqUsage(url: string, body: GroqResponseBody, requestModel?: string): GroqUsage | null {
  const model = body.model ?? requestModel ?? "desconhecido"
  if (url.includes("/audio/transcriptions")) {
    const seconds = body.duration ?? body.segments?.at(-1)?.end
    if (seconds === undefined) return null
    return {
      model,
      prompt_tokens: null,
      completion_tokens: null,
      audio_seconds: Math.max(seconds, MIN_BILLED_AUDIO_SECONDS),
    }
  }
  if (!body.usage) return null
  return {
    model,
    prompt_tokens: body.usage.prompt_tokens ?? null,
    completion_tokens: body.usage.completion_tokens ?? null,
    audio_seconds: null,
  }
}
