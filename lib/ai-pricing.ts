/**
 * Preço por modelo do Groq, em US$: texto por 1 milhão de tokens (entrada/saída) e áudio
 * por hora transcrita. Fonte: groq.com/pricing (tabela pública; conferir ao trocar de modelo,
 * o Groq não expõe preço nem consumo por API). Modelo fora da tabela fica sem custo e
 * aparece no aviso da página de Uso.
 */
export const AI_PRICES: Record<string, { input?: number; output?: number; audioHour?: number }> = {
  "openai/gpt-oss-120b": { input: 0.15, output: 0.6 },
  "openai/gpt-oss-20b": { input: 0.075, output: 0.3 },
  "qwen/qwen3-32b": { input: 0.29, output: 0.59 },
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  "llama-3.1-8b-instant": { input: 0.05, output: 0.08 },
  "meta-llama/llama-4-scout-17b-16e-instruct": { input: 0.11, output: 0.34 },
  "meta-llama/llama-4-maverick-17b-128e-instruct": { input: 0.2, output: 0.6 },
  "whisper-large-v3": { audioHour: 0.111 },
  "whisper-large-v3-turbo": { audioHour: 0.04 },
}

export type AiUsage = {
  model: string | null
  prompt_tokens: number | null
  completion_tokens: number | null
  audio_seconds: number | string | null
}

/** Custo em US$ de uma chamada; null quando o modelo não está na tabela. */
export function aiCost(u: AiUsage): number | null {
  const price = u.model ? AI_PRICES[u.model] : undefined
  if (!price) return null
  return (
    ((u.prompt_tokens ?? 0) * (price.input ?? 0) + (u.completion_tokens ?? 0) * (price.output ?? 0)) / 1_000_000 +
    (Number(u.audio_seconds ?? 0) / 3600) * (price.audioHour ?? 0)
  )
}
