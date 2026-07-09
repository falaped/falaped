import type { PatientBmiUiStatus } from "@/lib/patient-bmi-ui-status"
import { percentileFromZ } from "@/lib/lms-zscore"
import type { GrowthIndicator } from "@/lib/growth-reference"

/**
 * WHO z-score classification of a growth measurement. Reuses ONLY the
 * `good | warn | bad` status type (and thus the BMI card's color language, D-13);
 * the WHO z-cutoffs (not the BMI card's heuristic age-band helper) are the source of
 * truth for the curve (RESEARCH line 198).
 *
 * Cutoffs (WHO): z < -2 → bad · -2 ≤ z ≤ +1 → good · +1 < z ≤ +2 → warn · z > +2 → bad.
 */
export type GrowthClassification = {
  label: string
  status: PatientBmiUiStatus
}

/** Low-end (deficit) PT-BR label per indicator (z < -2). */
const LOW_LABEL: Record<GrowthIndicator, string> = {
  "weight-for-age": "Peso baixo",
  "height-for-age": "Baixa estatura",
  "bmi-for-age": "IMC: magreza",
  "head-circumference-for-age": "Microcefalia",
}

/** Overweight-range PT-BR label per indicator (+1 < z ≤ +2). */
const WARN_LABEL: Record<GrowthIndicator, string> = {
  "weight-for-age": "Peso elevado",
  "height-for-age": "Estatura elevada",
  "bmi-for-age": "IMC: sobrepeso",
  "head-circumference-for-age": "PC elevado",
}

/** High-end (excess) PT-BR label per indicator (z > +2). */
const HIGH_LABEL: Record<GrowthIndicator, string> = {
  "weight-for-age": "Peso muito elevado",
  "height-for-age": "Estatura muito elevada",
  "bmi-for-age": "IMC: obesidade",
  "head-circumference-for-age": "Macrocefalia",
}

/** Within-range (eutrophic / adequate) PT-BR label per indicator (-2 ≤ z ≤ +1). */
const GOOD_LABEL: Record<GrowthIndicator, string> = {
  "weight-for-age": "Peso adequado",
  "height-for-age": "Estatura adequada",
  "bmi-for-age": "IMC: eutrófico",
  "head-circumference-for-age": "PC adequado",
}

/**
 * Classifies a z-score for a growth indicator into a WHO band + PT-BR label + the
 * shared `good/warn/bad` status used for color (D-13). Pure.
 *
 * @param z the measurement's z-score (from `lmsZScore`).
 * @param indicator the growth indicator being classified.
 */
export function classifyGrowthByZScore(
  z: number,
  indicator: GrowthIndicator,
): GrowthClassification {
  if (z < -2) return { label: LOW_LABEL[indicator], status: "bad" }
  if (z <= 1) return { label: GOOD_LABEL[indicator], status: "good" }
  if (z <= 2) return { label: WARN_LABEL[indicator], status: "warn" }
  return { label: HIGH_LABEL[indicator], status: "bad" }
}

/**
 * PT-BR positional label for a measurement, e.g. `Peso no P75`. Percentiles outside
 * the drawn band read as `> P97` / `< P3` (Open Q2). Rounds to the nearest whole
 * percentile.
 *
 * @param z the measurement's z-score.
 * @param indicatorLabel the indicator noun (e.g. `Peso`, `Estatura`, `IMC`, `PC`).
 */
export function percentilePositionLabel(z: number, indicatorLabel: string): string {
  const p = percentileFromZ(z)
  if (p > 97) return `${indicatorLabel} > P97`
  if (p < 3) return `${indicatorLabel} < P3`
  return `${indicatorLabel} no P${Math.round(p)}`
}
