import { stripJsonFences } from "@/modules/groq/lib/strip-json-fences"
import { getReplyFromUnknownPayload } from "@/modules/groq/lib/groq-response-parsers"

/**
 * Encapsulates the common Groq response parsing pipeline:
 * strip JSON fences → JSON.parse → extract reply field.
 * Returns null if parsing fails or no recognized reply key is found.
 */
export function parseGroqJsonReply(raw: string): string | null {
  const cleaned = stripJsonFences(raw)
  if (!cleaned) return null

  try {
    const parsed = JSON.parse(cleaned)
    return getReplyFromUnknownPayload(parsed)
  } catch {
    return null
  }
}
