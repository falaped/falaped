/**
 * Motivo curto de uma consulta a partir do resumo gerado no encerramento
 * (`cases.summary`, bullets "• "): a 1ª linha até o primeiro ":", ";" ou ", ".
 * Sem resumo, devolve null e a tela mostra o texto de fallback.
 */
export function caseSummaryHeadline(summary: string | null | undefined): string | null {
  const first = summary?.split("\n").find((line) => line.trim())
  if (!first) return null
  const headline = first.replace(/^\s*[•\-*]\s*/, "").split(/[:;]|,\s/)[0].trim().replace(/\.$/, "")
  return headline || null
}
