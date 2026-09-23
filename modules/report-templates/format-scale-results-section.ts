import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"
import { getScaleByKey } from "@/lib/scales"
import type { ScaleResult } from "@/modules/patient-scales/types"

/** Nome da seção fixa do relatório com as escalas aplicadas no atendimento. */
export const SCALE_RESULTS_SECTION_NAME = "Escalas aplicadas"

// Fuso da clínica, não do host: na Vercel o servidor roda em UTC.
const APPLIED_AT_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  timeZone: CLINIC_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

/**
 * Texto fixo, sem IA, da seção de escalas: uma linha por aplicação, da mais
 * antiga para a mais recente, com o escore e a interpretação CONGELADOS no
 * registro — não recalcula pela definição atual.
 *
 * @param results Escalas do atendimento, em qualquer ordem.
 * @returns Uma linha por aplicação, ou "" quando não há nenhuma.
 */
export function formatScaleResultsSectionContent(
  results: readonly ScaleResult[],
): string {
  return [...results]
    .sort((a, b) => a.applied_at.localeCompare(b.applied_at))
    .map((result) => {
      const name = getScaleByKey(result.scale_key)?.name ?? result.scale_key
      const outcome =
        result.score === null
          ? result.interpretation
          : `${result.score} — ${result.interpretation}`
      const when = APPLIED_AT_FORMAT.format(new Date(result.applied_at))
      return `${name}: ${outcome} (${when})`
    })
    .join("\n")
}
