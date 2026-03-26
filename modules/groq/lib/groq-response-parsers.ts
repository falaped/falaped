/**
 * Extracts a "reply" string from an unknown LLM JSON payload.
 * Tries keys: reply, content, message (in priority order).
 */
export function getReplyFromUnknownPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null

  const asRecord = payload as Record<string, unknown>
  if (typeof asRecord.reply === "string" && asRecord.reply.trim().length > 0) {
    return asRecord.reply.trim()
  }
  if (typeof asRecord.content === "string" && asRecord.content.trim().length > 0) {
    return asRecord.content.trim()
  }
  if (typeof asRecord.message === "string" && asRecord.message.trim().length > 0) {
    return asRecord.message.trim()
  }

  return null
}

const SECTION_KEY_MAP: Array<{ label: string; keys: string[] }> = [
  { label: "Queixa principal", keys: ["queixa_principal", "queixaPrincipal"] },
  { label: "Dados relevantes", keys: ["dados_relevantes", "dadosRelevantes"] },
  { label: "Hipóteses", keys: ["hipóteses", "hipoteses"] },
  { label: "Conduta", keys: ["conduta"] },
  { label: "Orientações", keys: ["orientações", "orientacoes"] },
  { label: "Pendências", keys: ["pendências", "pendencias"] },
]

function formatSection(label: string, value: unknown): string | null {
  if (value == null) return null
  if (typeof value === "string") {
    const t = value.trim()
    return t.length > 0 ? `${label}\n${t}` : null
  }
  if (Array.isArray(value)) {
    const lines = value
      .map((item) => String(item).trim())
      .filter((line) => line.length > 0)
    if (lines.length === 0) return null
    return `${label}\n${lines.map((line) => `- ${line}`).join("\n")}`
  }
  return null
}

/**
 * Normalizes a multi-key clinical summary payload (queixa_principal, conduta, etc.)
 * into a single formatted string for display.
 */
export function summaryFromStructuredPediatricPayload(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object") return null
  const o = parsed as Record<string, unknown>

  const parts: string[] = []

  for (const { label, keys } of SECTION_KEY_MAP) {
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(o, key)) continue
      const block = formatSection(label, o[key])
      if (block) {
        parts.push(block)
        break
      }
    }
  }

  const out = parts.join("\n\n").trim()
  return out.length > 0 ? out : null
}
