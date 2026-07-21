---
phase: 05-calend-rio-de-vacinas-refer-ncia
plan: 01
subsystem: database
tags: [supabase, postgres, rls, reference-data, nextjs, rsc, react, tdd]

requires:
  - phase: 01-foundation
    provides: "auth + paid gate (getAuthenticatedUser, profile.status === 'paid')"
  - phase: 03-growth
    provides: "provenance metadata shape precedent (lib/growth-reference source/version/range)"
provides:
  - "Two GLOBAL reference tables (vaccine_schedules + vaccine_schedule_items) with NO profile_id"
  - "First global-read RLS in the repo: two SELECT-only policies using(true), zero write policies (D-07)"
  - "Physician-approved SUS/PNI child seed (27 items) applied to the live DB, idempotent"
  - "getVaccineScheduleWithItems read module (source-filtered, no owner filter) + domain types"
  - "/dashboard/vaccines RSC route with auth + paid gate rendering the SUS calendar by age band"
  - "Per-dataset provenance caption + fixed advisory components; sidebar entry under Serviços"
affects: [vaccines, "plan 05-02 (SBIm column)", "plan 05-03 (gestante tab)", "plan 05-04 (patient age highlight)", "phase 06 (per-age vaccination diff)"]

tech-stack:
  added: []
  patterns:
    - "Global-read reference data: SELECT-only RLS using(true), no profile_id, seed-only writes (D-07)"
    - "Global idempotent seed (insert…select…from(values)…where not exists) with NO per-profile cross join"
    - "Read module divergence: SupabaseClient injected, filter by domain key (source) not profile_id"
    - "Forward-compatible view prop surface (sus now; sbim/gestante/birthDate in later plans)"

key-files:
  created:
    - supabase/migrations/20260720000000_vaccine_schedules.sql
    - supabase/migrations/20260720000100_rls_vaccine_schedules.sql
    - supabase/migrations/20260720000200_seed_vaccine_schedules.sql
    - modules/vaccines/types.ts
    - modules/vaccines/get-vaccine-schedule-with-items.ts
    - modules/vaccines/get-vaccine-schedule-with-items.spec.ts
    - app/dashboard/vaccines/page.tsx
    - components/dashboard/vaccines/vaccine-calendar-view.tsx
    - components/dashboard/vaccines/vaccine-column.tsx
    - components/dashboard/vaccines/schedule-provenance.tsx
  modified:
    - components/app-sidebar.tsx

key-decisions:
  - "Deliberate RLS divergence (D-07): global-read reference tables, no owner scoping — first of its kind in the repo"
  - "Structured age_months + human age_label both stored so Phase 6 can diff by age without parsing text"
  - "Physician signed off SUS/PNI clinical values at the human-verify checkpoint; executor did not author them"
  - "Migrations applied to live DB by the orchestrator (physician authorization) — build/typecheck pass is a false positive without the push"

patterns-established:
  - "Global-read RLS: enable RLS + SELECT-only using(true) policies in the same file, no write policies"
  - "Global idempotent seed without cross join public.profiles"
  - "Read module with domain-key filter (.eq('source', ...)) and explicit no-owner-filter comment"

requirements-completed: [VAC-01, VAC-04]

coverage:
  - id: D1
    description: "getVaccineScheduleWithItems queries by source only (no profile_id), orders items by sort_order asc, returns null when unseeded, throws [VACCINES] on error"
    requirement: "VAC-01"
    verification:
      - kind: unit
        ref: "modules/vaccines/get-vaccine-schedule-with-items.spec.ts#queries vaccine_schedules filtered by source only (no profile_id)"
        status: pass
      - kind: unit
        ref: "modules/vaccines/get-vaccine-schedule-with-items.spec.ts#orders nested items by sort_order ascending"
        status: pass
      - kind: unit
        ref: "modules/vaccines/get-vaccine-schedule-with-items.spec.ts#returns null when the dataset is unseeded"
        status: pass
      - kind: unit
        ref: "modules/vaccines/get-vaccine-schedule-with-items.spec.ts#throws a [VACCINES]-tagged error on Supabase failure"
        status: pass
    human_judgment: false
  - id: D2
    description: "Global-read RLS: two SELECT-only policies, no write policies, no profile_id column on either table (applied to live DB)"
    requirement: "VAC-04"
    verification:
      - kind: automated_ui
        ref: "orchestrator live-DB verification: vaccine_schedules/items exist with no profile_id, exactly 2 SELECT policies, 0 write policies"
        status: pass
      - kind: other
        ref: "grep gate: rls migration has no insert/update/delete policy, uses(true)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Physician-approved SUS/PNI seed (27 child items across age bands) seeded globally, idempotent, structured age_months + age_label"
    requirement: "VAC-01"
    verification:
      - kind: manual_procedural
        ref: "human-verify checkpoint: physician sign-off on SUS/PNI clinical values (STATE.md blocker)"
        status: pass
      - kind: automated_ui
        ref: "orchestrator live-DB verification: 27 SUS items present"
        status: pass
    human_judgment: true
    rationale: "Clinical accuracy of vaccine/dose/age values against the current official PNI calendar requires physician judgment — automation cannot certify medical correctness."
  - id: D4
    description: "Paid doctor sees the SUS/PNI calendar at /dashboard/vaccines grouped by age band with per-dataset provenance caption + fixed advisory"
    requirement: "VAC-01"
    verification:
      - kind: manual_procedural
        ref: "visit /dashboard/vaccines as a paid user; confirm SUS column by age band, 'Fonte: PNI 2025 · vigência jan/2025', 'Confira sempre contra o calendário oficial atual.'"
        status: unknown
    human_judgment: true
    rationale: "End-to-end visual render (grouping, provenance, advisory placement, PT-BR copy) needs a human to view the running page; not exercised by unit tests."

duration: ~80min
completed: 2026-07-19
status: complete
---

# Phase 05 Plan 01: Calendário de Vacinas (Foundation) Summary

**Two GLOBAL vaccine reference tables with the repo's first global-read RLS (SELECT-only `using(true)`, no profile_id), a physician-approved SUS/PNI seed, and an end-to-end `/dashboard/vaccines` route rendering the SUS calendar by age band with per-dataset provenance.**

## Performance

- **Duration:** ~80 min across sessions
- **Started:** 2026-07-19T19:42:00Z (approx; Task 1)
- **Completed:** 2026-07-19T20:03:18Z
- **Tasks:** 3 (+ 2 blocking human-verify checkpoints resolved)
- **Files created:** 10, **modified:** 1

## Accomplishments
- Two global reference tables (`vaccine_schedules` + `vaccine_schedule_items`) with NO `profile_id` — the deliberate D-07 divergence from every owner-scoped table in the repo.
- Global-read RLS: two SELECT-only `using(true)` policies, zero write policies (writes are seed-only via migration). First of its kind in this codebase.
- Physician-approved SUS/PNI child seed (27 items across "Ao nascer" → "4 anos") inserted globally and idempotently, storing BOTH structured `age_months` and human `age_label`.
- `getVaccineScheduleWithItems` read module: injected client, filters by `source` (never `profile_id`), orders nested items by `sort_order`, returns null when unseeded, throws `[VACCINES]` on error — covered by 5 unit tests (TDD RED→GREEN).
- `/dashboard/vaccines` RSC route with auth + paid gate (D-10), defensive empty state, and the SUS column grouped by age band with provenance caption + fixed advisory.
- Sidebar entry `{ Vacinas → /dashboard/vaccines }` under the "Serviços" group.
- All three migrations applied to the live DB (project acstugafrgrqzvtuznxv) and verified by the orchestrator.

## Task Commits

1. **Task 1: Global reference tables + global-read RLS (D-06/D-07/D-08)** - `b47843f` (feat)
2. **Task 2: Idempotent global seed (physician-approved SUS)** - `4ef1406` (feat)
   - fix: cast `age_months_max` to integer so the seed applies cleanly - `871735a` (fix)
3. **Task 3: Read layer + route + minimal view (SUS end-to-end, tdd)** - `d3ef8e1` (feat)

_Task 3 was executed TDD (RED failing spec → GREEN module) and committed atomically with its test._

## Files Created/Modified
- `supabase/migrations/20260720000000_vaccine_schedules.sql` - Two global tables, no profile_id, index on (schedule_id, sort_order)
- `supabase/migrations/20260720000100_rls_vaccine_schedules.sql` - Global-read RLS, two SELECT-only policies
- `supabase/migrations/20260720000200_seed_vaccine_schedules.sql` - Physician-approved SUS seed, idempotent, global
- `modules/vaccines/types.ts` - VaccineSource/Axis/Schedule/ScheduleItem/ScheduleWithItems types
- `modules/vaccines/get-vaccine-schedule-with-items.ts` - Read module (source filter, no owner filter, D-07)
- `modules/vaccines/get-vaccine-schedule-with-items.spec.ts` - 5 unit tests for the read contract
- `app/dashboard/vaccines/page.tsx` - RSC route, auth + paid gate, empty state
- `components/dashboard/vaccines/vaccine-calendar-view.tsx` - Client view, forward-compatible prop surface
- `components/dashboard/vaccines/vaccine-column.tsx` - One dataset as a Card grouped by age band
- `components/dashboard/vaccines/schedule-provenance.tsx` - Per-dataset caption + fixed advisory
- `components/app-sidebar.tsx` - Added the Vacinas nav entry under "Serviços"

## Decisions Made
- Global-read RLS divergence (D-07): reference data is identical for every doctor, so no owner scoping. The absence of a `profile_id` filter and write policies is documented in both migration and module comments so no maintainer "fixes" it by reflex.
- Stored structured `age_months`/`age_months_max` alongside the human `age_label` so Phase 6's per-age diff never has to parse text.
- Clinical seed values were physician-approved at the human-verify checkpoint; the executor did not author them.
- Migrations were applied to the live DB by the orchestrator (physician authorization) because build/typecheck pass without the push (false-positive verification), mirroring the referrals close-out precedent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Cast `age_months_max` to integer in the SUS seed**
- **Found during:** Task 2 (seed application to the live DB)
- **Issue:** The `values (...)` list left `age_months_max` untyped; Postgres inferred `text` for the all-null column, so the insert failed to apply against the `integer` column.
- **Fix:** Added an explicit `::integer` cast on `age_months_max` in the seed select so the seed applies cleanly.
- **Files modified:** supabase/migrations/20260720000200_seed_vaccine_schedules.sql
- **Verification:** Migration applied to the live DB; 27 SUS items confirmed present by the orchestrator.
- **Committed in:** `871735a`

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** Necessary for the seed to apply. No scope creep — same rows, correct column type.

## Issues Encountered
- The `profile_id` grep gate in Task 3 (`grep -c 'profile_id' ... | grep -qx 0`) does not pass literally because the module contains the two mandated explanatory comments referencing `.eq("profile_id", ...)` that the plan itself instructed adding ("so no one adds an owner filter by reflex"). The substantive contract — no owner filter in the query — holds: the only `.eq` call is `.eq("source", source)`, and the unit test "must NOT filter by profile_id" passes. The grep heuristic conflicts with the plan's own comment requirement; the behavior is correct and test-covered.

## User Setup Required
None - no external service configuration required. (Migrations already applied to the live DB by the orchestrator.)

## Next Phase Readiness
- The working spine (DB → global-read RLS → read module → RSC route → view) is live; every later slice extends these same files.
- Plan 05-02 adds the SBIm second column (seed items + a second `VaccineColumn`), 05-03 adds the Gestante tab, 05-04 adds the patient current-age highlight via `computePediatricAge`.
- The view prop surface is already forward-compatible (`sus` now; `sbim`/`gestante`/`birthDate` reserved).

## Self-Check: PASSED
- All 9 planned files + sidebar entry present on disk.
- All 4 commits (b47843f, 4ef1406, 871735a, d3ef8e1) present in git history.
- `yarn typecheck` clean; `yarn test` 465/465 pass; new files lint-clean (pre-existing ds-bundle lint errors out of scope).

---
*Phase: 05-calend-rio-de-vacinas-refer-ncia*
*Completed: 2026-07-19*
