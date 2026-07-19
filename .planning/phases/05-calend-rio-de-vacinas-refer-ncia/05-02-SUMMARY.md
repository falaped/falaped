---
phase: 05-calend-rio-de-vacinas-refer-ncia
plan: 02
subsystem: ui
tags: [supabase, postgres, reference-data, nextjs, rsc, react, tailwind, seed]

requires:
  - phase: 05-calend-rio-de-vacinas-refer-ncia
    provides: "plan 05-01: vaccine_schedules/items tables + global-read RLS, getVaccineScheduleWithItems module, /dashboard/vaccines route, VaccineColumn/ScheduleProvenance components, SBIm schedule metadata row"
provides:
  - "Physician-approved SBIm child seed (34 items) applied to the live DB, idempotent, global (no profile_id)"
  - "Two-column SUS/PNI × Particular (SBIm) layout inside the Criança view, aligned by the union of age bands"
  - "Explicit empty marker (—) where a dataset lacks a band, so columns read across without silent misalignment"
  - "Per-dataset provenance caption retained per column (SUS caption vs SBIm caption), never collapsed"
affects: ["plan 05-03 (gestante tab)", "plan 05-04 (patient age highlight)", "phase 06 (per-age vaccination diff)"]

tech-stack:
  added: []
  patterns:
    - "Second global idempotent seed joined to an existing schedule by source/version (where not exists on stable key), no cross join, no profile_id (D-07)"
    - "Two-column comparison via responsive grid (grid-cols-1 md:grid-cols-2) with age-band union alignment and explicit empty markers"
    - "Reused read module with a second source-filtered call (SBIm) — same contract, no owner filter"

key-files:
  created:
    - supabase/migrations/20260720000300_seed_vaccine_schedules_sbim.sql
  modified:
    - app/dashboard/vaccines/page.tsx
    - components/dashboard/vaccines/vaccine-calendar-view.tsx
    - components/dashboard/vaccines/vaccine-column.tsx

key-decisions:
  - "SBIm clinical values (34 items, calendar SBIm 2025) physician-approved at the blocking human-verify checkpoint; executor did not author them (STATE.md blocker honored)"
  - "SBIm seed joins the existing SBIm schedule row (seeded in plan 05-01) by source/version — this plan adds only the items, staying idempotent and global (D-07)"
  - "Column distinction is position + header label only ('SUS/PNI' / 'Particular (SBIm)') — no color divergence, no vaccine color-coding (UI-SPEC §Color)"
  - "Age bands aligned by the union across SUS+SBIm; missing bands render '—' rather than being omitted, preserving the row-by-row comparison (C3/D-01)"
  - "Seed applied to the live DB (project acstugafrgrqzvtuznxv) by the orchestrator under physician authorization — build/typecheck pass is a false positive without the push (mirrors plan 05-01 close-out)"

patterns-established:
  - "Multi-dataset comparison grid: parallel columns aligned by a computed union of grouping keys with explicit empty markers"
  - "Additive global seed that joins an already-seeded schedule metadata row instead of re-inserting it"

requirements-completed: [VAC-02, VAC-04]

coverage:
  - id: D1
    description: "Physician-approved SBIm child seed (34 items) inserted globally, idempotent, structured age_months + age_label, joined to the existing SBIm schedule (source/version) with no cross join and no profile_id"
    requirement: "VAC-02"
    verification:
      - kind: manual_procedural
        ref: "blocking human-verify checkpoint: physician sign-off on SBIm clinical values (SBIm 2025) — approved"
        status: pass
      - kind: automated_ui
        ref: "orchestrator live-DB verification: 34 SBIm items present (vaccine_schedule_items joined to the SBIm schedule); 27 SUS + 34 SBIm = 61 total"
        status: pass
      - kind: other
        ref: "grep gates: cross_join_count=0, profile_count=0, 'where not exists' present (idempotent global)"
        status: pass
    human_judgment: true
    rationale: "Clinical accuracy of the SBIm vaccine/dose/age values against the current official SBIm calendar requires physician judgment — automation cannot certify medical correctness."
  - id: D2
    description: "Page reads both SUS and SBIm datasets; VaccineCalendarView renders them as two parallel columns in a md:grid-cols-2 grid"
    requirement: "VAC-02"
    verification:
      - kind: other
        ref: "grep gates: SBIM_READ_OK ('SBIm' in page.tsx), TWO_COLUMN_GRID_OK ('md:grid-cols-2' in vaccine-calendar-view.tsx)"
        status: pass
      - kind: unit
        ref: "yarn typecheck (tsc --noEmit) clean; yarn test 465/465 pass"
        status: pass
    human_judgment: false
  - id: D3
    description: "Columns align by the union of age bands with '—' for missing bands, and each column keeps its own provenance caption (SUS vs SBIm), never collapsed to one shared caption"
    requirement: "VAC-04"
    verification:
      - kind: manual_procedural
        ref: "visit /dashboard/vaccines as a paid user; confirm SUS/PNI (left) and Particular (SBIm) (right) side by side, aligned rows with '—' where a band is absent, distinct provenance captions, fixed advisory visible, no color divergence"
        status: unknown
    human_judgment: true
    rationale: "End-to-end visual render — two-column alignment, empty-marker placement, per-column provenance, PT-BR copy, and the no-color-divergence rule — needs a human to view the running page; not exercised by unit tests."

duration: ~40min
completed: 2026-07-19
status: complete
---

# Phase 05 Plan 02: Calendário SUS × SBIm (Two-Column Comparison) Summary

**Physician-approved SBIm child seed (34 items) applied to the live DB and the /dashboard/vaccines Criança view rendered as parallel SUS/PNI × Particular (SBIm) columns aligned by the union of age bands, each keeping its own provenance caption.**

## Performance

- **Duration:** ~40 min across sessions
- **Started:** 2026-07-19 (Task 1, after physician sign-off)
- **Completed:** 2026-07-19
- **Tasks:** 2 (+ 1 blocking human-verify checkpoint resolved)
- **Files created:** 1, **modified:** 3

## Accomplishments
- Physician-approved SBIm child-calendar seed (34 items, calendar "SBIm 2025") inserted globally and idempotently, storing BOTH structured `age_months`/`age_months_max` and the human `age_label`. The seed joins the SBIm schedule metadata row seeded in plan 05-01 (source/version) — it adds only the items, never re-inserting the schedule.
- Two-column layout inside the Criança view: `app/dashboard/vaccines/page.tsx` now performs a second `getVaccineScheduleWithItems(supabase, "SBIm")` read alongside SUS and passes both into `<VaccineCalendarView>`, which renders them in a responsive `grid-cols-1 md:grid-cols-2` grid — SUS/PNI left, Particular (SBIm) right; on narrow widths they stack.
- Age-band alignment: `vaccine-column.tsx` renders every band from the SUS+SBIm union in both columns, with an explicit `—` empty marker where a dataset has no vaccine for a band, so the columns read across without silent misalignment (C3/D-01).
- Per-dataset provenance retained: each column keeps its own `<ScheduleProvenance>` footer (SUS caption vs SBIm caption); the fixed advisory remains visible. No color divergence between columns and no vaccine color-coding.
- Seed applied to the live DB (project acstugafrgrqzvtuznxv) by the orchestrator under physician authorization; verified: `vaccine_schedule_items` now holds 27 SUS + 34 SBIm items.

## Task Commits

Each task was committed atomically:

1. **Task 1: SBIm seed migration (physician-approved, global idempotent)** - `ac8d348` (feat)
2. **Task 2: Render SUS × SBIm two-column calendar with aligned age bands** - `517aad5` (feat)

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

## Files Created/Modified
- `supabase/migrations/20260720000300_seed_vaccine_schedules_sbim.sql` - Physician-approved SBIm items, idempotent, global; joins the existing SBIm schedule by source/version; zero `cross join`, zero `profile`
- `app/dashboard/vaccines/page.tsx` - Added the second SBIm read alongside SUS; passes both datasets to the view
- `components/dashboard/vaccines/vaccine-calendar-view.tsx` - Renders SUS + SBIm as parallel columns in a `md:grid-cols-2` grid, aligned by the age-band union
- `components/dashboard/vaccines/vaccine-column.tsx` - Age-band alignment with an explicit `—` marker for absent bands; per-column header + provenance retained

## Decisions Made
- SBIm clinical values (34 items, calendar "SBIm 2025") were physician-approved at the blocking human-verify checkpoint; the executor did not author them, honoring the STATE.md blocker.
- The seed is additive: the SBIm schedule metadata row already existed from plan 05-01, so this migration inserts only the `vaccine_schedule_items`, joining by source/version — keeping it idempotent, global, and free of any `cross join` / `profile_id` (D-07).
- Column distinction is column position + header label ("SUS/PNI" / "Particular (SBIm)") only — no color divergence and no vaccine color-coding (UI-SPEC §Color).
- Missing age bands render `—` in the affected column rather than being omitted, so the two columns stay row-aligned for the D-01 at-a-glance comparison.
- Migrations were applied to the live DB by the orchestrator (physician authorization) because build/typecheck pass without the push (false-positive verification), mirroring the plan 05-01 close-out precedent.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. (The SBIm seed was applied to the live DB by the orchestrator.)

## Next Phase Readiness
- The two-column comparison spine is live; plan 05-03 adds the Gestante tab (a third dataset/axis) and plan 05-04 adds the patient current-age highlight via `computePediatricAge`.
- The view prop surface remains forward-compatible (SUS + SBIm now; `gestante`/`birthDate` reserved for later plans).
- One human-judgment item remains open (D3): the end-to-end two-column visual render on the running app is best confirmed during phase UAT.

---
*Phase: 05-calend-rio-de-vacinas-refer-ncia*
*Completed: 2026-07-19*
