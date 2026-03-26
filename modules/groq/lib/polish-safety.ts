function normalizeForPolishComparison(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function tokenJaccardSimilarity(a: string, b: string): number {
  const aTokens = new Set(normalizeForPolishComparison(a).split(" ").filter(Boolean))
  const bTokens = new Set(normalizeForPolishComparison(b).split(" ").filter(Boolean))
  if (aTokens.size === 0 && bTokens.size === 0) return 1
  if (aTokens.size === 0 || bTokens.size === 0) return 0

  let intersection = 0
  for (const token of aTokens) {
    if (bTokens.has(token)) intersection += 1
  }
  const union = new Set([...aTokens, ...bTokens]).size
  return union === 0 ? 0 : intersection / union
}

/**
 * Validates that a polished reply is safe to use by checking:
 * 1. The polished text is non-empty.
 * 2. Length delta doesn't exceed 35% or 12 chars (whichever is larger).
 * 3. Jaccard token similarity >= 0.72.
 */
export function polishLooksSafe(original: string, polished: string): boolean {
  const originalTrimmed = original.trim()
  const polishedTrimmed = polished.trim()
  if (!polishedTrimmed) return false

  const maxDelta = Math.max(12, Math.floor(originalTrimmed.length * 0.35))
  if (Math.abs(polishedTrimmed.length - originalTrimmed.length) > maxDelta) return false

  const similarity = tokenJaccardSimilarity(originalTrimmed, polishedTrimmed)
  return similarity >= 0.72
}

/**
 * Determines whether the polish step should be skipped entirely
 * (BMI output, short single-line replies, etc.).
 */
export function shouldSkipPolish(reply: string, intent: string): boolean {
  const rawReply = reply.trim()
  if (!rawReply) return true
  if (intent === "CALCULATE_BMI") return true
  if (/^IMC\s+estimado:/i.test(rawReply)) return true
  if (rawReply.length < 90 && !rawReply.includes("\n")) return true
  return false
}
