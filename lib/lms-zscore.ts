/**
 * LMS (Cole–Green) growth-curve math. WHO growth standards are published as three
 * parameters per (indicator, sex, age): L (Box-Cox power / skewness λ), M (median µ),
 * S (coefficient of variation σ). This module derives z-scores, percentiles and the
 * reference-band value at any z from those parameters. Pure: no I/O, no React.
 *
 * @see WHO computation of centiles and z-scores (Cole–Green LMS method).
 */

/** LMS parameters for a single (indicator, sex, age) reference row. */
export type Lms = { L: number; M: number; S: number }

/**
 * z-score of a measurement `x` against an LMS reference row.
 * Uses the log branch when `L === 0` (the LMS formula's removable singularity).
 *
 * `z = L !== 0 ? ((x/M)^L - 1) / (L*S) : ln(x/M) / S`
 */
export function lmsZScore(x: number, { L, M, S }: Lms): number {
  return L !== 0 ? (Math.pow(x / M, L) - 1) / (L * S) : Math.log(x / M) / S
}

/**
 * Measurement value that sits at z-score `z` on an LMS reference row — used to draw
 * the reference-band lines (evaluate at z for each age row). Inverse of `lmsZScore`.
 * `lmsValueAtZ(0, lms) === lms.M` (P50 is the median, by construction).
 *
 * `x = L !== 0 ? M*(1 + L*S*z)^(1/L) : M*e^(S*z)`
 */
export function lmsValueAtZ(z: number, { L, M, S }: Lms): number {
  return L !== 0 ? M * Math.pow(1 + L * S * z, 1 / L) : M * Math.exp(S * z)
}

/**
 * Standard-normal CDF via the Abramowitz & Stegun 7.1.26 erf approximation
 * (|error| < 1.5e-7). Pure, dependency-free.
 */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989422804014327 * Math.exp(-(z * z) / 2)
  const p =
    d *
    t *
    (0.31938153 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  return z >= 0 ? 1 - p : p
}

/** Percentile (0–100) for a z-score, via the standard-normal CDF. */
export function percentileFromZ(z: number): number {
  return normalCdf(z) * 100
}

/**
 * The z-values for the D-12 percentile band lines (P3/P15/P50/P85/P97). The z-score
 * view simply draws integer-DP lines instead; the underlying LMS dataset is identical.
 */
export const PERCENTILE_Z_MAP: { percentile: number; z: number }[] = [
  { percentile: 3, z: -1.8807936081512509 },
  { percentile: 15, z: -1.0364333894937898 },
  { percentile: 50, z: 0 },
  { percentile: 85, z: 1.0364333894937898 },
  { percentile: 97, z: 1.8807936081512509 },
]
