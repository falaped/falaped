---
phase: 05-calend-rio-de-vacinas-refer-ncia
plan: 03
subsystem: ui
tags: [supabase, postgres, reference-data, nextjs, rsc, react, tailwind, seed, tabs, gestante]

requires:
  - phase: 05-calend-rio-de-vacinas-refer-ncia
    provides: "plan 05-02: two-column SUS × SBIm Criança view, per-dataset provenance; plan 05-01: vaccine_schedules/items tables + global-read RLS, getVaccineScheduleWithItems module, gestante schedule metadata row (source='gestante', axis='gestational_weeks', version='SBIm 2025')"
provides:
  - "Physician-approved gestante seed (5 items) applied to the live DB on the gestational_weeks axis (week_min/week_max + text age_label), idempotent, global (no profile_id, no cross join)"
  - "Top-level shadcn Tabs shell (Criança (SUS × SBIm) default | Gestante) inside VaccineCalendarView, prop surface forward-compatible for the plan 04 birthDate highlight"
  - "GestanteList component: single list by vaccine with the gestational-week window in text (not by trimester), its own provenance caption + fixed advisory"
affects: ["plan 05-04 (patient age highlight)", "phase 06 (vaccination record)"]

tech-stack:
  added: []
  patterns:
    - "Third global idempotent seed joined to the existing gestante schedule by source/version (where not exists on schedule_id + vaccine + age_label), no cross join, no profile_id (D-07)"
    - "Gestational-weeks axis modeling: week_min/week_max structured window (week_max=null encodes 'a partir de N semanas', both null encodes 'qualquer momento') + human age_label text; age_months left null"
    - "Explicit week_min::integer/week_max::integer casts to avoid Postgres 42804 (text inferred from mostly-null VALUES) — carried from 05-01 lesson"
    - "Two-tab shell (shadcn Tabs) separating datasets on different axes; accent reserved for the active tab (UI-SPEC §Color)"
    - "List-by-vaccine (not by trimester) because gestante vaccines cross trimesters"

key-files:
  created:
    - supabase/migrations/20260720000400_seed_vaccine_schedules_gestante.sql
    - components/dashboard/vaccines/gestante-list.tsx
  modified:
    - app/dashboard/vaccines/page.tsx
    - components/dashboard/vaccines/vaccine-calendar-view.tsx

key-decisions:
  - "Gestante clinical values (5 items — Hepatite B, dTpa ≥20 sem, Influenza, COVID-19, VSR/Abrysvo 28–36 sem) physician-approved at the blocking human-verify checkpoint; executor did not author them (STATE.md blocker honored)"
  - "Gestante seed joins the existing gestante schedule metadata row (seeded in plan 05-01) by source/version — this plan adds only the items, staying idempotent and global (D-07)"
  - "Gestante sits on the gestational_weeks axis: week_min/week_max populated, age_months/age_months_max null; week_max=null encodes 'a partir de N semanas', both null encodes 'qualquer momento'"
  - "The Criança two-column view (plan 02) is now wrapped in a Tabs shell with Gestante as the second tab; Gestante is listed by vaccine with the text window (NOT by trimester, since vaccines cross trimesters — C5/D-05)"
  - "Each dataset keeps its own provenance caption (D-09); the fixed advisory remains visible on the gestante tab too"
  - "Seed applied to the live DB (project acstugafrgrqzvtuznxv) by the orchestrator under physician authorization — build/typecheck pass is a false positive without the push (mirrors plan 05-01/05-02 close-out)"

patterns-established:
  - "Gestational-weeks axis dataset alongside the child age_months axis: same reference tables, distinct axis columns, distinct tab, distinct provenance"
  - "Additive global seed that joins an already-seeded schedule metadata row instead of re-inserting it (third instance of the pattern)"

requirements-completed: [VAC-03, VAC-04]

coverage:
  - id: D1
    description: "Physician-approved gestante seed (5 items) inserted globally, idempotent, on the gestational_weeks axis (week_min/week_max + age_label), joined to the existing gestante schedule (source/version) with no cross join and no profile_id"
    requirement: "VAC-03"
    verification:
      - kind: manual_procedural
        ref: "blocking human-verify checkpoint: physician sign-off on gestante clinical values and week windows (SBIm 2025 gestante) — approved (5 vaccines)"
        status: pass
      - kind: automated_ui
        ref: "orchestrator live-DB verification: 5 gestante items present on the gestational_weeks axis (vaccine_schedule_items joined to the gestante schedule); totals now 5 gestante + 34 SBIm + 27 SUS"
        status: pass
      - kind: other
        ref: "grep gates: cross_join_count=0, profile_count=0, week_min present ('where not exists' idempotent global)"
        status: pass
    human_judgment: true
    rationale: "Clinical accuracy of the gestante vaccine/dose/gestational-week values against the current official SBIm gestante calendar requires physician judgment — automation cannot certify medical correctness."
  - id: D2
    description: "Page reads the gestante dataset; VaccineCalendarView renders a Tabs shell (Criança default | Gestante); GestanteList lists the gestante vaccines by vaccine with the text window (not by trimester)"
    requirement: "VAC-03"
    verification:
      - kind: other
        ref: "grep gates: GESTANTE_READ_OK ('gestante' in page.tsx), TAB_OK ('Gestante' in vaccine-calendar-view.tsx), GESTANTE_LIST_OK (gestante-list.tsx present)"
        status: pass
      - kind: unit
        ref: "yarn typecheck (tsc --noEmit) clean; yarn test 465/465 pass"
        status: pass
    human_judgment: false
  - id: D3
    description: "Two tabs render (Criança default, Gestante); the Gestante tab lists all VAC-03 vaccines with text windows, its own provenance caption, and the fixed advisory visible; the active tab uses the accent indicator; no color divergence"
    requirement: "VAC-04"
    verification:
      - kind: manual_procedural
        ref: "visit /dashboard/vaccines as a paid user; switch to the Gestante tab; confirm the list-by-vaccine layout with text windows ('a partir de 20 semanas', '28–36 semanas', 'qualquer momento'), the gestante provenance caption, the fixed advisory, and the accent active-tab indicator"
        status: unknown
    human_judgment: true
    rationale: "End-to-end visual render — Tabs interaction, list-by-vaccine layout, gestante provenance, PT-BR copy, and the accent active-tab rule — needs a human to view the running page; not exercised by unit tests."

duration: ~30min
completed: 2026-07-19
status: complete
---

# Phase 05 Plan 03: Gestante Tab (Gestational-Weeks Axis) Summary

**Physician-approved gestante seed (5 items) applied to the live DB on the gestational-weeks axis, plus a top-level Tabs shell (Criança (SUS × SBIm) | Gestante) whose Gestante tab lists the gestante vaccines by vaccine with the window in text and its own provenance caption.**

## Performance

- **Duration:** ~30 min across sessions
- **Started:** 2026-07-19 (Task 1, after physician sign-off)
- **Completed:** 2026-07-19
- **Tasks:** 2 (+ 1 blocking human-verify checkpoint resolved)
- **Files created:** 2, **modified:** 2

## Accomplishments
- Physician-approved gestante seed (5 items, gestante calendar "SBIm 2025") inserted globally and idempotently on the gestational_weeks axis: Hepatite B (qualquer momento da gestação), dTpa (a partir de 20 semanas — week_min=20, week_max=null), Influenza (qualquer momento), COVID-19 (qualquer momento), VSR/Abrysvo (28–36 semanas — week_min=28, week_max=36). Stores BOTH structured `week_min`/`week_max` and the human `age_label` window; `age_months`/`age_months_max` left null (this axis is gestational weeks, not child age). The seed joins the gestante schedule metadata row seeded in plan 05-01 (source='gestante' / version='SBIm 2025') — it adds only the items, never re-inserting the schedule.
- Tabs shell: `vaccine-calendar-view.tsx` now wraps the plan-02 two-column SUS × SBIm layout in a top-level shadcn `Tabs` with two tabs — "Criança (SUS × SBIm)" (default) and "Gestante". The active tab uses the accent indicator per UI-SPEC §Color. The prop surface stays forward-compatible for the optional `birthDate` highlight coming in plan 04.
- `app/dashboard/vaccines/page.tsx` adds a third `getVaccineScheduleWithItems(supabase, "gestante")` read alongside SUS and SBIm and passes the gestante dataset into `<VaccineCalendarView>`.
- New `components/dashboard/vaccines/gestante-list.tsx`: a single list by vaccine (Card + Table with Vacina / Janela columns) rendering each item's vaccine (+ dose) and its `age_label` window phrase as body text with the qualifier muted. It is NOT grouped by trimester (some vaccines cross trimesters — C5/D-05). The gestante `<ScheduleProvenance>` caption lives in the card footer (D-09) and the fixed advisory remains visible.
- Seed applied to the live DB (project acstugafrgrqzvtuznxv) by the orchestrator under physician authorization; verified: `vaccine_schedule_items` now holds 5 gestante (gestational_weeks axis) + 34 SBIm + 27 SUS items.

## Task Commits

Each task was committed atomically:

1. **Task 1: Gestante seed migration (physician-approved, gestational-weeks axis, global idempotent) + live-DB apply** - `c1feddd` (feat)
2. **Task 2: Tabs shell (Criança | Gestante) + Gestante list-by-vaccine** - `54354c2` (feat)

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

## Files Created/Modified
- `supabase/migrations/20260720000400_seed_vaccine_schedules_gestante.sql` - Physician-approved gestante items on the gestational_weeks axis (week_min/week_max + age_label); idempotent, global; joins the existing gestante schedule by source/version; zero `cross join`, zero `profile`
- `components/dashboard/vaccines/gestante-list.tsx` - List by vaccine with the text window (not by trimester); gestante provenance caption in the footer; fixed advisory visible
- `app/dashboard/vaccines/page.tsx` - Added the third gestante read alongside SUS + SBIm; passes the gestante dataset to the view
- `components/dashboard/vaccines/vaccine-calendar-view.tsx` - Wraps the Criança two-column layout in a top-level Tabs shell (Criança default | Gestante); accent active-tab indicator; forward-compatible prop surface for the plan-04 birthDate highlight

## Decisions Made
- Gestante clinical values (5 items, gestante calendar "SBIm 2025") were physician-approved at the blocking human-verify checkpoint; the executor did not author them, honoring the STATE.md blocker.
- The seed is additive: the gestante schedule metadata row already existed from plan 05-01, so this migration inserts only the `vaccine_schedule_items`, joining by source/version — keeping it idempotent, global, and free of any `cross join` / `profile_id` (D-07).
- Gestante sits on the gestational_weeks axis: `week_min`/`week_max` populated (with explicit `::integer` casts to avoid the Postgres 42804 text-inference error learned in 05-01), `age_months`/`age_months_max` null. `week_max = null` encodes "a partir de N semanas"; both null encodes "qualquer momento".
- The Criança two-column view (plan 02) is now wrapped in a Tabs shell; the Gestante tab lists vaccines by vaccine with the text window rather than by trimester, because gestante vaccines cross trimesters (C5/D-05).
- Each dataset keeps its own provenance caption (D-09); the fixed advisory remains visible on the gestante tab.
- Migration was applied to the live DB by the orchestrator (physician authorization) because build/typecheck pass without the push (false-positive verification), mirroring the plan 05-01/05-02 close-out precedent.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. (The gestante seed was applied to the live DB by the orchestrator.)

## Next Phase Readiness
- The Tabs spine (Criança | Gestante) is live and the gestante dataset renders on its own gestational-weeks axis; plan 05-04 adds the patient current-age highlight via `computePediatricAge`, slotting into the forward-compatible `birthDate` prop reserved on the view.
- One human-judgment item remains open (D3): the end-to-end visual render of the Tabs shell + gestante list-by-vaccine on the running app is best confirmed during phase UAT.

## Self-Check: PASSED
- 05-03-SUMMARY.md present on disk; the 2 new files + 2 modified files verified present.
- Both task commits (c1feddd, 54354c2) present in git history.
- `yarn typecheck` clean; `yarn test` 465/465 pass. Grep gates green: cross_join=0, profile=0, week_min present, gestante read present, Gestante tab present, gestante-list.tsx present.

---
*Phase: 05-calend-rio-de-vacinas-refer-ncia*
*Completed: 2026-07-19*
