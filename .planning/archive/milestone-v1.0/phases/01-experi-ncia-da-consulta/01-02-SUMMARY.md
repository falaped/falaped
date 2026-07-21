---
phase: 01-experi-ncia-da-consulta
plan: 02
subsystem: lib
tags: [pediatric-age, date-fns, corrected-age, pt-br-formatting, tdd, pure-helper]

# Dependency graph
requires:
  - phase: none
    provides: date-fns@4.4.0 (already installed), tsx --test harness
provides:
  - "lib/compute-pediatric-age.ts — single tested pediatric age engine (chronological + corrected, banded, status flags)"
  - "lib/format-pediatric-age.ts — PT-BR by-extenso + abbreviated rendering with singular/plural agreement"
  - "FULL_TERM_GESTATIONAL_WEEKS (40), PRETERM_THRESHOLD_WEEKS (37), CORRECTED_AGE_CUTOFF_MONTHS (24) constants"
affects: [Plan 01-04 (patient hero / case header / assistant context consume the engine), Phase 5 (vaccine due/overdue logic reuses the engine)]

# Tech tracking
tech-stack:
  added: []  # zero new runtime deps — date-fns@4.4.0 already present
  patterns:
    - "Pure tested lib/ helper returning a structured result; component renders, engine never formats inline"
    - "Local-midnight Date construction (new Date(y, m-1, d)) — no UTC parse, no noon hack, no ms division"
    - "Single named constants for clinical thresholds (one change point, no scattered magic numbers)"

key-files:
  created:
    - lib/compute-pediatric-age.ts
    - lib/compute-pediatric-age.spec.ts
    - lib/format-pediatric-age.ts
    - lib/format-pediatric-age.spec.ts
  modified: []

key-decisions:
  - "Band boundary set at 24 months for months_days→years_months per D-07/UI-SPEC <action> rule (a 1-year-old reads '12 meses', not '1 ano'); this resolves a conflict with one leap-year <behavior> example that implied years_months at 12 months — the repeated, dominant specification (D-07 + <action> + UI-SPEC band wording) wins."
  - "Corrected age computed by shifting the birth date forward by the prematurity offset and re-banding against the same `now` (equivalent to subtracting prematurity days from chronological age); cutoff checked via differenceInMonths on the corrected birth date."
  - "Months/days decomposition uses differenceInMonths for the month count + intervalToDuration for the day remainder (calendar-correct, handles end-of-month and leap traps); never manual month-number subtraction."
  - "Formatter returns empty string for non-ok status; the consuming component owns the UI-SPEC copy for missing/invalid/future."

patterns-established:
  - "Pediatric age engine keystone: one pure helper consumed by all age displays + (Phase 5) vaccine logic"
  - "Deterministic date tests: every spec passes an explicit local-constructed `now` as the second arg"

requirements-completed: [CONS-01]

# Metrics
duration: ~10min
completed: 2026-06-28
---

# Phase 1 Plan 02: Pediatric Age Engine + PT-BR Formatter Summary

**A single pure, fully-tested `lib/compute-pediatric-age.ts` decomposes a birth date into a banded pediatric age (days / weeks / months+days / years+months), returns corrected age for preterm infants up to 24 months corrected, and emits explicit status flags for missing/invalid/future dates — paired with a render-only PT-BR by-extenso + abbreviated formatter.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 1 (TDD feature: RED → GREEN, no REFACTOR needed)
- **Files created:** 4

## Accomplishments

- **Age engine (`lib/compute-pediatric-age.ts`):** local-midnight calendar math via date-fns (`differenceInDays`, `differenceInWeeks`, `differenceInMonths`, `intervalToDuration`, `isAfter`, `isValid`, `addDays`). Banding per D-07/D-11: 0–28 days → `days`; <84 days (~12 weeks) → `weeks`; <24 months → `months_days`; else `years_months`. Returns `{ status, band?, totalDays?, parts?, corrected? }`.
- **Corrected age (D-10):** when `gestationalAgeWeeks < 37`, shifts birth forward by `(40 − gestationalAgeWeeks)` weeks and re-bands; only populates `corrected` while corrected age ≤ 24 months. Full-term / null gestational age → no `corrected` field. Named constants `FULL_TERM_GESTATIONAL_WEEKS = 40`, `PRETERM_THRESHOLD_WEEKS = 37`, `CORRECTED_AGE_CUTOFF_MONTHS = 24`.
- **Status flags (D-09/D-12):** null/undefined → `missing_birth_date`; non-ISO / impossible calendar date → `invalid`; date after `now` → `future`. Never throws, never produces a wrong number. JS Date silent normalization (e.g. `2025-13-40`, `2025-02-30`) rejected via a reconstruction guard.
- **Formatter (`lib/format-pediatric-age.ts`):** `formatPediatricAge` (full by-extenso PT-BR with singular/plural: "1 dia"/"5 dias", "1 semana"/"6 semanas", "3 meses e 12 dias", "1 mês e 1 dia", "4 meses", "2 anos e 4 meses", "3 anos") and `formatPediatricAgeAbbrev` ("5 d", "6 sem", "3m 12d", "4m", "2a 4m", "3a"). Pure render — no date math. Non-ok status → empty string.
- **Tests:** 32 engine cases + 26 formatter cases covering newborn (0/1/2 days), days/weeks band edges (28/29/83/84 days), months+days (incl. exact-month 0-day remainder), end-of-month trap (Jan-31 → May-01 = 3m 1d, not 4m), leap year (2024-02-29 → 2025-03-01 = 12 meses), year rollover, years+months, 24-month cutoff, near-local-midnight invariance, and the full corrected-age matrix (full-term, null, preterm within/past cutoff).

## Task Commits

| Task | Name | Type | Commit |
| ---- | ---- | ---- | ------ |
| 1 (RED) | Failing engine + formatter specs | test | 718a863 |
| 1 (GREEN) | Engine + formatter implementation | feat | 3575898 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected two spec edge-case expectations to the canonical 24-month band boundary**
- **Found during:** Task 1 GREEN (two specs failed against the implementation built to the plan's `<action>` band rule).
- **Issue:** (a) The end-of-month test used Jan-31 → Mar-01 (only 29 days), which lands in the `weeks` band, not `months_days` — it did not actually exercise the month-decomposition trap. (b) The leap-year test asserted `years_months` / `years: 1` at exactly 12 months, but the plan's `<action>` rule, D-07, and the UI-SPEC band wording all set the `months_days → years_months` boundary at **24 months** (a 1-year-old reads "12 meses"). The single leap-year `<behavior>` example ("→ band years_months") was the outlier and contradicted the dominant, repeated specification.
- **Fix:** End-of-month test now uses Jan-31 → May-01 (90 days, genuinely inside the months band) asserting calendar-correct `3 meses e 1 dia` (manual subtraction would wrongly give 4 months). Leap-year test now asserts `months_days` / `months: 12` across the Feb-29 leap boundary, consistent with the 24-month band boundary.
- **Files modified:** lib/compute-pediatric-age.spec.ts
- **Commit:** 3575898 (folded into the GREEN commit)

## Verification

- `yarn test` — green (engine + formatter specs pass; 0 failures across the full suite, 373 passing).
- `yarn typecheck` — exits 0.
- Acceptance grep gates: ms-division (`86400000`) count = 0 in engine (excluding comments); `FULL_TERM_GESTATIONAL_WEEKS` present; all required exports present (`computePediatricAge`, `PediatricAge`, `AgeBand`, `PediatricAgeStatus`, `formatPediatricAge`, `formatPediatricAgeAbbrev`).

## Known Stubs

None — both helpers are fully implemented and tested. No UI is wired in this plan (intentional: Plan 01-04 consumes these helpers in the patient hero, case header, and assistant context).

## Self-Check: PASSED

- FOUND: lib/compute-pediatric-age.ts
- FOUND: lib/compute-pediatric-age.spec.ts
- FOUND: lib/format-pediatric-age.ts
- FOUND: lib/format-pediatric-age.spec.ts
- FOUND commit: 718a863 (test RED)
- FOUND commit: 3575898 (feat GREEN)
