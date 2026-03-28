import { assistantMessageToModelText } from "@/modules/falaped-assistant/assistant-model-message"

const FALAPED_JSON_PREFIX = "__FALAPED_JSON__"

/**
 * True if user-facing summary text still contains assistant payload markers.
 */
export function containsFalapedJsonMarker(text: string): boolean {
  return text.includes(FALAPED_JSON_PREFIX)
}

/**
 * Returns the index right after the closing `}` that matches the `{` at openIndex,
 * respecting strings and escapes.
 */
function endOfJsonObjectAt(s: string, openIndex: number): number | null {
  if (s[openIndex] !== "{") return null
  let depth = 0
  let inString = false
  let escape = false

  for (let i = openIndex; i < s.length; i++) {
    const c = s[i]
    if (escape) {
      escape = false
      continue
    }
    if (inString) {
      if (c === "\\") escape = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') {
      inString = true
      continue
    }
    if (c === "{") depth += 1
    else if (c === "}") {
      depth -= 1
      if (depth === 0) return i + 1
    }
  }
  return null
}

/**
 * Parses JSON after {@link FALAPED_JSON_PREFIX} for display-only plain text.
 */
function plainTextFromFalapedPayloadJson(jsonBody: string): string {
  try {
    const payload = JSON.parse(jsonBody) as {
      content?: string
      structuredClinicalNote?: string
    }
    const parts: string[] = []
    if (payload.content?.trim()) parts.push(payload.content.trim())
    if (payload.structuredClinicalNote?.trim()) {
      parts.push(payload.structuredClinicalNote.trim())
    }
    return parts.join("\n\n")
  } catch {
    return ""
  }
}

/**
 * Expands a full `__FALAPED_JSON__{...}` segment to human text for summaries.
 * Never returns a string that still contains {@link FALAPED_JSON_PREFIX}.
 */
function safeAssistantTextForSummaryDisplay(fullPayload: string): string {
  const expanded = assistantMessageToModelText(fullPayload)
  if (!containsFalapedJsonMarker(expanded)) {
    return expanded
  }
  if (!fullPayload.startsWith(FALAPED_JSON_PREFIX)) {
    return ""
  }
  const rest = fullPayload.slice(FALAPED_JSON_PREFIX.length).trimStart()
  if (!rest.startsWith("{")) {
    return ""
  }
  return plainTextFromFalapedPayloadJson(rest)
}

/**
 * Replaces every `__FALAPED_JSON__{...}` segment with plain text. Malformed or
 * truncated JSON segments are dropped (no raw prefix appended to output).
 */
export function stripFalapedJsonFromSummaryText(text: string): string {
  let out = ""
  let i = 0

  while (i < text.length) {
    const idx = text.indexOf(FALAPED_JSON_PREFIX, i)
    if (idx === -1) {
      out += text.slice(i)
      break
    }
    out += text.slice(i, idx)
    let pos = idx + FALAPED_JSON_PREFIX.length
    while (pos < text.length && /\s/.test(text[pos])) pos += 1
    if (pos >= text.length || text[pos] !== "{") {
      i = idx + FALAPED_JSON_PREFIX.length
      continue
    }
    const end = endOfJsonObjectAt(text, pos)
    if (end === null) {
      const nextIdx = text.indexOf(
        FALAPED_JSON_PREFIX,
        idx + FALAPED_JSON_PREFIX.length,
      )
      i = nextIdx === -1 ? text.length : nextIdx
      continue
    }
    const fullPayload = text.slice(idx, end)
    out += safeAssistantTextForSummaryDisplay(fullPayload)
    i = end
  }

  return out
}

/**
 * Formats persisted `dashboard_chat_context_summary` for display: strips embedded
 * assistant JSON payloads and turns pipe-separated segments into paragraphs.
 * Returns null if technical markers remain or the result is empty (product: do not show raw payloads).
 */
export function formatDashboardChatContextSummaryForDisplay(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null
  const stripped = stripFalapedJsonFromSummaryText(raw).trim()
  if (!stripped) return null

  const withParagraphs = stripped.includes(" | ")
    ? stripped
      .split(" | ")
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .join("\n\n")
    : stripped

  if (containsFalapedJsonMarker(withParagraphs)) {
    return null
  }

  return withParagraphs
}
