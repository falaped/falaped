/**
 * Single source of truth for the physician-locked vaccine age timeline.
 *
 * The 11 canonical bands and the "faixa anterior" positioning rule make vaccine
 * positioning deterministic and data-independent: a child (or a schedule item)
 * lands in a band purely by its whole-month age, never by the seed `age_label`
 * text (which drifts across datasets). Pure: no I/O.
 */

/** A canonical age band: its PT-BR label and the whole-month age it starts at. */
export type VaccineBand = {
  label: string
  startMonths: number
}

/**
 * The 11 canonical age bands in fixed, ascending-by-age order. Bands without
 * seed vaccines still render (empty state) so the timeline reads consistently.
 * OUT OF SCOPE bands ("7 a 14 anos", plus "7 meses" content) may render empty.
 */
export const CANONICAL_VACCINE_BANDS: readonly VaccineBand[] = [
  { label: "Ao nascer", startMonths: 0 },
  { label: "2 meses", startMonths: 2 },
  { label: "3 meses", startMonths: 3 },
  { label: "4 meses", startMonths: 4 },
  { label: "5 meses", startMonths: 5 },
  { label: "6 meses", startMonths: 6 },
  { label: "7 meses", startMonths: 7 },
  { label: "9 meses", startMonths: 9 },
  { label: "12 a 18 meses", startMonths: 12 },
  { label: "4 a 6 anos", startMonths: 48 },
  { label: "7 a 14 anos", startMonths: 84 },
] as const

/**
 * Resolves the canonical band for a whole-month age via the "faixa anterior"
 * rule: the band with the GREATEST `startMonths` that is `<= months`.
 *
 * A months value at or above 84 resolves to "7 a 14 anos"; `null` or a value
 * below 0 (before "Ao nascer") resolves to `null`.
 *
 * @param months The child's chronological whole-month age, or null.
 * @returns The matching canonical band, or null.
 */
export function resolveBandForMonths(months: number | null): VaccineBand | null {
  if (months === null || months < 0) return null
  let match: VaccineBand | null = null
  for (const band of CANONICAL_VACCINE_BANDS) {
    if (band.startMonths <= months) {
      match = band
    } else {
      break
    }
  }
  return match
}

/**
 * Maps a vaccine schedule item's `age_months` to its canonical band, using the
 * same "faixa anterior" rule as {@link resolveBandForMonths}. Grouping items by
 * this (not by `age_label`) makes band grouping data-independent.
 *
 * @param ageMonths The item's `age_months`, or null.
 * @returns The matching canonical band, or null when `ageMonths` is null.
 */
export function bandForItemMonths(ageMonths: number | null): VaccineBand | null {
  return resolveBandForMonths(ageMonths)
}
