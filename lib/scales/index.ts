import { APGAR } from "./apgar"
import { CADERNETA_MILESTONE_SCALES } from "./caderneta-milestones"
import { CAPD } from "./capd"
import { COMFORT_B_SCALES } from "./comfort-b"
import { FLACC } from "./flacc"
import { GLASGOW_PEDIATRICA } from "./glasgow-pediatrica"
import { MCHAT_R } from "./mchat-r"
import { MCHAT_RF } from "./mchat-rf"
import { MCISAAC } from "./mcisaac"
import { NIPS } from "./nips"
import { PEWS } from "./pews"
import { PIPP } from "./pipp"
import { PRAM } from "./pram"
import { RASS } from "./rass"
import { SILVERMAN_ANDERSEN } from "./silverman-andersen"
import { STRONGKIDS } from "./strongkids"
import { TAL_SCALES } from "./tal"
import { WESTLEY } from "./westley"
import { WONG_BAKER } from "./wong-baker"
import type { ScaleCategory, ScaleDefinition } from "./types"

export type { ScaleCategory, ScaleDefinition, ScaleBand, ScaleItem, ScaleOption, ScaleScore } from "./types"
export { scoreScale, scoreRange } from "./score-scale"

/** Registro de escalas disponíveis. Escala nova entra aqui e só aqui. */
export const SCALES: readonly ScaleDefinition[] = [
  FLACC,
  WONG_BAKER,
  MCISAAC,
  GLASGOW_PEDIATRICA,
  WESTLEY,
  ...TAL_SCALES,
  PRAM,
  MCHAT_R,
  MCHAT_RF,
  STRONGKIDS,
  ...CADERNETA_MILESTONE_SCALES,
  PEWS,
  ...COMFORT_B_SCALES,
  RASS,
  CAPD,
  APGAR,
  SILVERMAN_ANDERSEN,
  NIPS,
  PIPP,
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
