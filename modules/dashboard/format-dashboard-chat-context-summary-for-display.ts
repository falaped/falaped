import { assistantMessageToModelText } from "@/modules/falaped-assistant/assistant-model-message"

const FALAPED_JSON_PREFIX = "__FALAPED_JSON__"

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
 * Replaces every `__FALAPED_JSON__{...}` segment with plain text via
 * {@link assistantMessageToModelText}.
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
      out += FALAPED_JSON_PREFIX
      i = idx + FALAPED_JSON_PREFIX.length
      continue
    }
    const end = endOfJsonObjectAt(text, pos)
    if (end === null) {
      out += text.slice(idx)
      break
    }
    const fullPayload = text.slice(idx, end)
    out += assistantMessageToModelText(fullPayload)
    i = end
  }

  return out
}

/**
 * Formats persisted `dashboard_chat_context_summary` for display: strips embedded
 * assistant JSON payloads and turns pipe-separated segments into paragraphs.
 */
export function formatDashboardChatContextSummaryForDisplay(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null
  const stripped = stripFalapedJsonFromSummaryText(raw).trim()
  if (!stripped) return null

  if (stripped.includes(" | ")) {
    const parts = stripped
      .split(" | ")
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
    return parts.join("\n\n")
  }

  return stripped
}
