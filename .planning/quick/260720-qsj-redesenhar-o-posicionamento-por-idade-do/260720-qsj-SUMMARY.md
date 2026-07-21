---
phase: quick
plan: 260720-qsj
subsystem: vaccines
status: complete
tags: [vaccines, pediatric-age, canonical-bands, bugfix]
dependency_graph:
  requires:
    - lib/compute-pediatric-age.ts (age engine)
    - modules/vaccines/types.ts
  provides:
    - lib/vaccine-bands.ts (11 canonical bands + resolveBandForMonths + bandForItemMonths)
    - PediatricAge.totalMonths (chronological whole-month age)
  affects:
    - components/dashboard/vaccines/vaccine-column.tsx
    - components/dashboard/patients/patient-vaccine-calendar-section.tsx
tech_stack:
  added: []
  patterns:
    - "Single source of truth module for canonical bands (lib/vaccine-bands.ts)"
    - "faixa anterior rule (greatest startMonths <= months)"
    - "Data-independent grouping by age_months, not age_label"
key_files:
  created:
    - lib/vaccine-bands.ts
    - lib/vaccine-bands.spec.ts
  modified:
    - lib/compute-pediatric-age.ts
    - lib/compute-pediatric-age.spec.ts
    - lib/vaccine-current-band.ts
    - lib/vaccine-current-band.spec.ts
    - lib/vaccine-current-band-items.ts
    - lib/vaccine-current-band-items.spec.ts
    - lib/vaccine-band-carousel.ts
    - lib/vaccine-band-carousel.spec.ts
    - components/dashboard/vaccines/vaccine-column.tsx
    - components/dashboard/patients/patient-vaccine-calendar-section.tsx
decisions:
  - "PediatricAge.totalMonths = differenceInMonths(today, birth), chronological, ok-only — calendar-correct across ALL bands (days/weeks parts.months is absent)"
  - "Vaccine positioning uses chronological months only; the preterm corrected age no longer drives band placement"
  - "11 canonical bands are the single source of truth; grouping keys off age_months (bandForItemMonths), never seed age_label"
  - "isBandCurrent removed (only intra-plan importer); computeCurrentMonths no longer floors totalDays/30.4375"
metrics:
  duration: ~20min
  completed: 2026-07-20
  tasks: 3
  files: 12
---

# Quick Task 260720-qsj: Redesenhar o posicionamento por idade do calendário de vacinas — Summary

Redesigned vaccine-calendar age positioning onto 11 physician-locked canonical bands and fixed the chronological month bug by exposing an engine-level `totalMonths` (`differenceInMonths`), so a 6-month-old maps to "6 meses" (not "5 meses") and a weeks-band 2-month-old maps to "2 meses" (not "Ao nascer").

## What Was Built

**Task 1 — Engine totalMonths + canonical bands + chronological computeCurrentMonths (TDD):**
- Added `PediatricAge.totalMonths?: number` set unconditionally in the "ok" path as `differenceInMonths(today, birth)` — additive, does not touch `band`/`parts`/`corrected`.
- Created `lib/vaccine-bands.ts`: `CANONICAL_VACCINE_BANDS` (11 bands, fixed order/starts), `resolveBandForMonths` and `bandForItemMonths` implementing the "faixa anterior" rule (greatest `startMonths <= months`; `null`/`<0` → null; `>=84` → "7 a 14 anos").
- Rewrote `computeCurrentMonths` to return `age.totalMonths ?? null` (chronological); dropped `AVG_DAYS_PER_MONTH` and the `corrected` branch; removed `isBandCurrent` (grep confirmed only the intra-plan `vaccine-current-band-items.ts` imported it).

**Task 2 — Rewire resolution/ordering/grouping onto canonical bands:**
- `resolveCurrentBandLabel` → `resolveBandForMonths(currentMonths)?.label ?? null` (data-independent; `schedules` arg ignored, signature kept).
- `computeOrderedBands` → fixed 11 canonical labels regardless of input.
- `itemsForCurrentBand` → filters by `bandForItemMonths(item.age_months)?.label === bandLabel` (null `age_months` excluded).

**Task 3 — Render canonical bands in both surfaces:**
- `vaccine-column.tsx` `groupByAgeBand` keys each item by `bandForItemMonths(item.age_months)?.label` (unmapped items skipped); styling, "Idade atual" badge, provenance footer, and "—" empty state unchanged.
- `patient-vaccine-calendar-section.tsx` `itemsForBand` compares `bandForItemMonths(item.age_months)?.label`; timeline dots, current-band resolution, toggle logic, tallies, and empty state unchanged.

## Verification

- `yarn test`: 522/522 pass (0 fail) — vaccine-bands, vaccine-current-band, vaccine-current-band-items, vaccine-band-carousel, vaccine-band-status, plus the full existing suite.
- `yarn typecheck`: clean.
- Regression proof: `computeCurrentMonths({status:"ok", totalMonths:6})` → 6 and `resolveBandForMonths(6)` → "6 meses" (NOT "5 meses").
- Weeks-band proof: birth 2026-04-28 / now 2026-06-28 (61 days, `weeks` band) → `totalMonths` 2 → band "2 meses" (NOT "Ao nascer"), asserted in both `compute-pediatric-age.spec.ts` and via `computeCurrentMonths`.
- Boundary coverage: 8→"7 meses", 9/11→"9 meses", 12/18/26/47→"12 a 18 meses", 48/83→"4 a 6 anos", 84/168/200→"7 a 14 anos".
- Preterm: chronological `totalMonths` wins; `corrected` ignored for band placement.

## Deviations from Plan

None — plan executed exactly as written.

The transient state between the Task 1 and Task 2 commits (Task 1 deletes `isBandCurrent`, which `vaccine-current-band-items.ts` still imported until Task 2's rewrite) is expected intra-plan coupling sequenced by the plan; there are no git pre-commit hooks, so no commit was blocked. Full suite is green after Task 2.

## Known Stubs

None. OUT-OF-SCOPE bands ("7 a 14 anos", "7 meses" content, nirsevimabe, multi-band influenza) intentionally render empty via the existing empty state — documented in the plan as physician follow-up. No DB/seed migration touched; grouping is data-independent (keys off `age_months`).

## Self-Check: PASSED

- lib/vaccine-bands.ts — FOUND
- lib/vaccine-bands.spec.ts — FOUND
- Commit ec4de57 (Task 1) — FOUND
- Commit 9366168 (Task 2) — FOUND
- Commit 405282e (Task 3) — FOUND
