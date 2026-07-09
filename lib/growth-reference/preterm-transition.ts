import type { GrowthStandard } from "@/lib/growth-reference"

/** Full-term gestational threshold in weeks — at/above this the infant is not preterm. */
const PRETERM_THRESHOLD_WEEKS = 37

/**
 * Picks the growth-reference standard for a single position on the corrected-age axis,
 * applying the clinical INTERGROWTH-21st → WHO transition rule (D-04; RESEARCH A1).
 *
 * Rule A1:
 * - Full-term (`gestationalAgeWeeks >= 37`) → always `"WHO"`; the INTERGROWTH preterm
 *   standard is never used for a non-preterm infant.
 * - Preterm and still before term-equivalent (`correctedAgeMonths < 0`, i.e. PMA below
 *   40 weeks) → `"intergrowth"`.
 * - Preterm from corrected term onward (`correctedAgeMonths >= 0`) → `"WHO"`.
 *
 * Pure: no I/O, no React. The corrected age comes from `computePediatricAge` (Phase 1).
 *
 * @param gestationalAgeWeeks gestational age at birth in weeks; `null`/`undefined`
 *   means unknown → treated as full-term (WHO), matching the corrected-age engine.
 * @param correctedAgeMonths corrected age in months relative to term (negative before
 *   the term-equivalent, `0` at corrected term / 40 weeks PMA, positive after).
 */
export function resolveReferenceStandard({
  gestationalAgeWeeks,
  correctedAgeMonths,
}: {
  gestationalAgeWeeks: number | null | undefined
  correctedAgeMonths: number
}): GrowthStandard {
  const isPreterm =
    typeof gestationalAgeWeeks === "number" &&
    Number.isFinite(gestationalAgeWeeks) &&
    gestationalAgeWeeks < PRETERM_THRESHOLD_WEEKS

  if (!isPreterm) return "WHO"
  return correctedAgeMonths < 0 ? "intergrowth" : "WHO"
}
