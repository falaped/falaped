import Groq from "groq-sdk"
import { env } from "@/lib/env"

let client: Groq | null = null

/**
 * Cliente Groq criado no primeiro uso. O SDK explode no construtor quando não
 * há `GROQ_API_KEY`, então instanciar no import quebrava qualquer build sem a
 * chave (a CI, por exemplo) só por alguém importar um módulo vizinho.
 */
export function getGroq(): Groq {
  client ??= new Groq({ apiKey: env.GROQ_API_KEY, baseURL: "https://api.groq.com" })
  return client
}
