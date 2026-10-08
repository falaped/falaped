import Groq from "groq-sdk"
import { env } from "@/lib/env"
import { recordAiUsage } from "@/lib/ai-usage"
import { parseGroqUsage } from "@/modules/groq/lib/parse-groq-usage"

/** De onde veio a chamada — é a quebra "por funcionalidade" do consumo no admin. */
export type AiFeature =
  | "case-chat"
  | "classify-question"
  | "clinical-summary"
  | "guardian-questions"
  | "polish-reply"
  | "carryover-summary"
  | "exam-report"
  | "exam-pages"
  | "report-sections"
  | "prescription-template"
  | "exam-panel-template"
  | "improve-section"
  | "transcription"
  | "assistant-actions"
  | "books-story"
  | "message-draft"

const clients = new Map<AiFeature, Groq>()

/**
 * `fetch` que devolve a resposta intacta e, em paralelo, grava o consumo dela.
 * `model` cobre a transcrição: a resposta não traz o modelo e o upload vai como stream.
 */
function trackingFetch(feature: AiFeature, model?: string): typeof fetch {
  return async (input, init) => {
    // Upload de áudio vai como stream: o fetch do Node exige `duplex` nesse caso.
    const response = await fetch(input, init?.body ? ({ duplex: "half", ...init } as RequestInit) : init)
    if (response.ok) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
      response
        .clone()
        .json()
        .then((body) => {
          const usage = parseGroqUsage(url, body, model)
          if (usage) return recordAiUsage(feature, usage)
        })
        .catch(() => {})
    }
    return response
  }
}

/**
 * Cliente Groq criado no primeiro uso, um por funcionalidade (cada um grava o consumo
 * com a sua etiqueta). O SDK explode no construtor quando não há `GROQ_API_KEY`, então
 * instanciar no import quebrava qualquer build sem a chave (a CI, por exemplo).
 */
export function getGroq(feature: AiFeature, model?: string): Groq {
  let client = clients.get(feature)
  if (!client) {
    client = new Groq({ apiKey: env.GROQ_API_KEY, baseURL: "https://api.groq.com", fetch: trackingFetch(feature, model) })
    clients.set(feature, client)
  }
  return client
}
