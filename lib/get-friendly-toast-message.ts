const DEFAULT_TOAST_ERROR_MESSAGE = "Não foi possível concluir esta ação. Tente novamente."

function cleanMessage(value: string): string {
  return value
    .replace(/^\[[A-Z0-9_\-]+\]\s*/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function extractMessageFromObject(value: unknown): string | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const candidateKeys = ["error", "message", "msg", "detail", "details"]
  for (const key of candidateKeys) {
    const candidate = record[key]
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return cleanMessage(candidate)
    }
  }
  return null
}

function parsePossibleJsonMessage(raw: string): string | null {
  const trimmed = raw.trim()
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return null
  try {
    const parsed = JSON.parse(trimmed) as unknown
    return extractMessageFromObject(parsed)
  } catch {
    return null
  }
}

export function getFriendlyToastMessage(
  value: unknown,
  fallback = DEFAULT_TOAST_ERROR_MESSAGE,
): string {
  if (typeof value === "string") {
    const parsedJsonMessage = parsePossibleJsonMessage(value)
    if (parsedJsonMessage) return parsedJsonMessage
    const cleaned = cleanMessage(value)
    if (cleaned.length === 0) return fallback
    if (/[{}[\]"]/.test(cleaned) && cleaned.length > 120) return fallback
    return cleaned
  }

  if (value instanceof Error) {
    const cleaned = cleanMessage(value.message)
    return cleaned.length > 0 ? cleaned : fallback
  }

  const fromObject = extractMessageFromObject(value)
  if (fromObject && fromObject.length > 0) return fromObject

  return fallback
}
