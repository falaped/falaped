import { FLACC } from "./flacc"
import { MCHAT_R } from "./mchat-r"
import { MCISAAC } from "./mcisaac"
import { STRONGKIDS } from "./strongkids"
import { WONG_BAKER } from "./wong-baker"
import type { ScaleCategory, ScaleDefinition } from "./types"

export type { ScaleCategory, ScaleDefinition, ScaleBand, ScaleItem, ScaleOption, ScaleScore } from "./types"
export { scoreScale, scoreRange } from "./score-scale"

/** Registro de escalas disponíveis. Escala nova entra aqui e só aqui. */
export const SCALES: readonly ScaleDefinition[] = [
  FLACC,
  WONG_BAKER,
  MCISAAC,
  MCHAT_R,
  STRONGKIDS,
]

/** Rótulo PT-BR de cada categoria, na ordem em que o seletor as agrupa. */
export const SCALE_CATEGORY_LABELS: Record<ScaleCategory, string> = {
  pronto_atendimento: "Pronto atendimento",
  puericultura: "Puericultura",
  enfermaria_uti: "Enfermaria e UTI",
  neonatologia: "Neonatologia",
}

/** Escala pela chave, ou null quando a chave não existe (dado antigo, URL torta). */
export function getScaleByKey(key: string): ScaleDefinition | null {
  return SCALES.find((scale) => scale.key === key) ?? null
}

/**
 * Escalas aplicáveis a uma idade em meses. Idade null (sem data de nascimento na
 * ficha) devolve todas — o médico decide; esconder escala por falta de cadastro
 * seria pior que mostrar demais.
 */
export function getScalesForAgeMonths(
  ageMonths: number | null,
): readonly ScaleDefinition[] {
  if (ageMonths === null) return SCALES
  return SCALES.filter(
    (scale) =>
      (scale.minAgeMonths === null || ageMonths >= scale.minAgeMonths) &&
      (scale.maxAgeMonths === null || ageMonths <= scale.maxAgeMonths),
  )
}
