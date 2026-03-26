/**
 * Detects known Whisper hallucination patterns where the model
 * generates YouTube-style caption boilerplate instead of real transcription.
 */
export function looksLikeCaptionHallucination(text: string): boolean {
  const n = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
  if (/transcri(c|ç)ao\s+e\s+legendas/.test(n)) return true
  if (/\blegendas\b/.test(n) && /\btranscri(c|ç)ao\b/.test(n) && text.length < 160) return true
  if (/\bamara\.org\b/.test(n) || /\bsubs\s*titulos\b/.test(n)) return true
  return false
}
