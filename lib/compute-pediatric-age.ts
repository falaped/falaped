import {
  addDays,
  differenceInDays,
  differenceInMonths,
  differenceInWeeks,
  intervalToDuration,
  isAfter,
  isValid,
} from "date-fns"

/**
 * Age band per D-07 / D-11:
 * - `days`         → 0–28 days
 * - `weeks`        → 29 days up to (but not including) ~12 weeks (84 days)
 * - `months_days`  → ~3 months up to (but not including) 24 months
 * - `years_months` → 24 months and older (years + months + remaining days)
 */
export type AgeBand = "days" | "weeks" | "months_days" | "years_months"

/** Status flag per D-09 (missing) / D-12 (invalid, future). */
export type PediatricAgeStatus = "ok" | "missing_birth_date" | "invalid" | "future"

export type PediatricAgeParts = {
  years?: number
  months?: number
  weeks?: number
  days?: number
}

export type PediatricAge = {
  status: PediatricAgeStatus
  band?: AgeBand
  totalDays?: number
  parts?: PediatricAgeParts
  corrected?: {
    band: AgeBand
    parts: PediatricAgeParts
    appliesUntilMonths: number
    /** Corrected age in whole days (chronological days minus the prematurity
     * offset). Drives the current-age highlight for preterm infants (CR-01). */
    totalDays: number
  }
}

/**
 * Full-term gestational baseline, in weeks. Prematurity is measured against this.
 * Confirmed with physician/user (A3 / D-10): the corrected-age subtraction is
 * `(FULL_TERM_GESTATIONAL_WEEKS - gestationalAgeWeeks)` weeks. Single change point —
 * do not scatter the magic number.
 */
export const FULL_TERM_GESTATIONAL_WEEKS = 40

/**
 * Prematurity threshold (weeks). Below this the infant is preterm and gets a
 * corrected age; at or above it the child is full-term (no correction). (D-10)
 */
export const PRETERM_THRESHOLD_WEEKS = 37

/**
 * Stop reporting corrected age once corrected age passes this many months (D-10).
 */
export const CORRECTED_AGE_CUTOFF_MONTHS = 24

/**
 * Growth-curve corrected-age cutoff (D-05 / D-07). The growth curve positions a
 * preterm infant's corrected age up to 36 months; callers opt in via
 * `computePediatricAge(..., { correctedAgeCutoffMonths: GROWTH_CORRECTED_AGE_CUTOFF_MONTHS })`.
 * The default (no options) stays at `CORRECTED_AGE_CUTOFF_MONTHS` (24) so Phase 1
 * callers are unaffected.
 */
export const GROWTH_CORRECTED_AGE_CUTOFF_MONTHS = 36

const DAYS_BAND_MAX = 28 // 0–28 days → days band
const WEEKS_BAND_MAX_DAYS = 84 // < 84 days (~12 weeks) → weeks band (D-11)
const MONTHS_BAND_MAX_MONTHS = 24 // < 24 months → months+days band (D-07)
const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Builds a LOCAL-midnight Date from a strict YYYY-MM-DD string.
 * Never `new Date("YYYY-MM-DD")` (UTC midnight → off-by-one in BRT) and never the
 * `T12:00:00` noon hack. Rejects non-matching shapes and impossible calendar dates.
 */
function localMidnightFromIso(iso: string): Date | null {
  const m = ISO_DATE_ONLY.exec(iso.trim())
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const d = new Date(year, month - 1, day)
  if (!isValid(d)) return null
  // Reject rollovers like 2025-13-40 / 2025-02-30 (JS Date silently normalizes them).
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null
  }
  return d
}

/** Normalize any Date to local midnight (drop the time-of-day). */
function toLocalMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Pick the banded parts for an age expressed as two local-midnight dates. */
function bandFor(from: Date, to: Date): { band: AgeBand; parts: PediatricAgeParts } {
  const totalDays = differenceInDays(to, from)

  if (totalDays <= DAYS_BAND_MAX) {
    return { band: "days", parts: { days: totalDays } }
  }

  if (totalDays < WEEKS_BAND_MAX_DAYS) {
    // differenceInWeeks truncates toward zero — whole completed weeks.
    return { band: "weeks", parts: { weeks: differenceInWeeks(to, from) } }
  }

  // Calendar-correct decomposition (respects variable month lengths / leap years).
  const duration = intervalToDuration({ start: from, end: to })
  const totalMonths = differenceInMonths(to, from)

  if (totalMonths < MONTHS_BAND_MAX_MONTHS) {
    return {
      band: "months_days",
      parts: { months: totalMonths, days: duration.days ?? 0 },
    }
  }

  return {
    band: "years_months",
    parts: {
      years: duration.years ?? 0,
      months: duration.months ?? 0,
      days: duration.days ?? 0,
    },
  }
}

/**
 * Decomposes a birth date into a banded pediatric age (chronological), plus an
 * optional corrected age for preterm infants, returning explicit status flags for
 * missing / invalid / future dates. Pure: no I/O, no React, no Supabase.
 *
 * @param birthDateIso ISO date-only string (`YYYY-MM-DD`), or null/undefined.
 * @param now Reference instant; defaults to `new Date()`. Pass explicitly in tests.
 * @param gestationalAgeWeeks Gestational age at birth in weeks; `< 37` triggers
 *   corrected age (subtract `(40 - gestationalAgeWeeks)` weeks) up to ~24 months
 *   corrected. `null`/`undefined`/`>= 37` → full-term, no correction.
 * @param options Optional overrides. `correctedAgeCutoffMonths` extends the
 *   corrected-age window (default `CORRECTED_AGE_CUTOFF_MONTHS` = 24); the growth
 *   curve passes `GROWTH_CORRECTED_AGE_CUTOFF_MONTHS` = 36 (D-05 / D-07). The
 *   effective cutoff is echoed in `corrected.appliesUntilMonths`.
 */
export function computePediatricAge(
  birthDateIso: string | null | undefined,
  now: Date = new Date(),
  gestationalAgeWeeks?: number | null,
  options?: { correctedAgeCutoffMonths?: number },
): PediatricAge {
  if (!birthDateIso) return { status: "missing_birth_date" } // D-09

  const birth = localMidnightFromIso(birthDateIso)
  if (!birth) return { status: "invalid" } // D-12

  const today = toLocalMidnight(now)
  if (isAfter(birth, today)) return { status: "future" } // D-12

  const totalDays = differenceInDays(today, birth)
  const { band, parts } = bandFor(birth, today)

  const result: PediatricAge = { status: "ok", band, totalDays, parts }

  // Corrected age (D-10): only for preterm infants, only while within the cutoff.
  if (
    typeof gestationalAgeWeeks === "number" &&
    Number.isFinite(gestationalAgeWeeks) &&
    gestationalAgeWeeks < PRETERM_THRESHOLD_WEEKS
  ) {
    const prematurityWeeks = FULL_TERM_GESTATIONAL_WEEKS - gestationalAgeWeeks
    // Shift the birth date forward by the prematurity offset, then re-band against
    // the same `today`. Equivalent to subtracting the offset from chronological age.
    const correctedBirth = addDays(birth, prematurityWeeks * 7)

    if (!isAfter(correctedBirth, today)) {
      const effectiveCutoffMonths =
        options?.correctedAgeCutoffMonths ?? CORRECTED_AGE_CUTOFF_MONTHS
      const correctedMonths = differenceInMonths(today, correctedBirth)
      if (correctedMonths <= effectiveCutoffMonths) {
        const corrected = bandFor(correctedBirth, today)
        result.corrected = {
          band: corrected.band,
          parts: corrected.parts,
          appliesUntilMonths: effectiveCutoffMonths,
          totalDays: differenceInDays(today, correctedBirth),
        }
      }
    }
  }

  return result
}
