---
phase: 01-experi-ncia-da-consulta
plan: 01
subsystem: database
tags: [supabase, postgres, migrations, rls, pediatric, consultation-timer]

# Dependency graph
requires: []
provides:
  - patients.gestational_age_weeks (nullable integer) — corrected-age input substrate (D-10)
  - cases.consultation_paused_ms (bigint default 0) + cases.consultation_paused_at (timestamptz) — pause accumulator (D-03)
  - cases.started_at DB default now() + explicit write on dashboard case creation — timer anchor (D-02/A2)
affects: [pediatric-age-display, consultation-timer, vaccination, plan-04, plan-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive idempotent migrations (add column if not exists) inherit table-level RLS — no new policy needed"
    - "Pause accumulator model: consultation_paused_ms total + consultation_paused_at non-null ⇒ currently paused"
    - "Belt-and-suspenders timer anchor: DB default now() AND explicit started_at write at dashboard creation"

key-files:
  created:
    - supabase/migrations/20260628000000_patients_add_gestational_age.sql
    - supabase/migrations/20260628000100_cases_add_consultation_pause.sql
  modified:
    - modules/cases/create-dashboard-case-with-patient.ts

key-decisions:
  - "Gestational age column is nullable with no DB constraint; range (20–42) enforced at the Zod boundary in Plan 04 to keep the column purely additive"
  - "started_at default set via alter column (not add column) since the column already exists on the live table"
  - "Schema applied to the live DB via Supabase MCP apply_migration (equivalent to supabase db push) rather than CLI"

patterns-established:
  - "Accumulator pause model for elapsed-time tracking on cases"
  - "Auto-start timer anchor guaranteed by both DB default and explicit insert value"

requirements-completed: [CONS-01, CONS-02, CONS-03]

# Metrics
duration: 12min
completed: 2026-06-28
---

# Phase 01 Plan 01: Persistent-State Foundation Summary

**Two additive Postgres migrations (patients.gestational_age_weeks; cases pause accumulator + started_at default) plus an explicit auto-start anchor write, applied live via Supabase MCP — the durable substrate for the pediatric-age and consultation-timer slices.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-28T16:24:25-03:00 (Task 1 commit)
- **Completed:** 2026-06-28
- **Tasks:** 2 (1 auto, 1 blocking human-action checkpoint)
- **Files modified:** 3

## Accomplishments
- Added nullable `patients.gestational_age_weeks` (corrected-age input for prematurity logic, D-10)
- Added `cases.consultation_paused_ms` (bigint default 0) and `cases.consultation_paused_at` (timestamptz) — the pause accumulator (D-03)
- Set `cases.started_at` DB default to `now()` and write it explicitly on dashboard case creation — the timer auto-start anchor (D-02/A2)
- Applied both migrations to the live Supabase project, so downstream type/build checks reflect real columns (no false-positive verification)

## Task Commits

1. **Task 1: Write both additive migrations + auto-start anchor write** — `b6e0783` (feat)
2. **Task 2: [BLOCKING] Push schema to the live database** — applied via Supabase MCP `apply_migration` (no commit; live DB DDL). Migration names applied: `patients_add_gestational_age` and `cases_add_consultation_pause`.

**Progress bookkeeping (Task 1 pause):** `24d9efc` (docs)
**Plan metadata:** this SUMMARY commit (docs: complete plan)

## Files Created/Modified
- `supabase/migrations/20260628000000_patients_add_gestational_age.sql` — additive nullable `gestational_age_weeks integer` + PT-BR column comment
- `supabase/migrations/20260628000100_cases_add_consultation_pause.sql` — `consultation_paused_ms bigint not null default 0`, `consultation_paused_at timestamptz`, `alter column started_at set default now()`, plus PT-BR column comments
- `modules/cases/create-dashboard-case-with-patient.ts` — added `started_at: new Date().toISOString()` to the `.insert` object (auto-start anchor)

## Decisions Made
- **Live schema applied via Supabase MCP, not CLI `supabase db push`.** The blocking checkpoint (Task 2) was cleared by applying the migrations through the Supabase MCP `apply_migration` tool (migration names `patients_add_gestational_age` and `cases_add_consultation_pause`), equivalent to `supabase db push`. Verified present on the live DB: `patients.gestational_age_weeks` (integer, nullable), `cases.consultation_paused_ms` (bigint, default 0), `cases.consultation_paused_at` (timestamptz, nullable), `cases.started_at` default `now()`. Security advisors after the DDL reported no new findings — new columns inherit existing `profile_id`-scoped RLS.
- Gestational age left unconstrained at the DB; range validation deferred to the Zod boundary (Plan 04) to keep the column purely additive.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- Task 2 was a blocking human-action checkpoint (live DB push). Resolved by applying the migrations via Supabase MCP `apply_migration`; user confirmed "applied via MCP". No CLI push was re-attempted.

## User Setup Required
None - no additional external service configuration required. Live schema already applied.

## Next Phase Readiness
- DB substrate is in place for Plan 04 (pediatric age display, consumes `gestational_age_weeks`) and Plan 05 (consultation timer, consumes the pause accumulator + `started_at` anchor).
- No blockers introduced. New columns inherit table-level RLS; no new policy needed.

## Threat Surface Scan
No new security surface beyond the threat model. New columns inherit existing `profile_id`-scoped table-level RLS on `patients` and `cases`; security advisors reported no new findings post-DDL.

## Self-Check: PASSED
All created files present; Task 1 commit `b6e0783` verified in git history; Task 2 schema applied live via Supabase MCP.

---
*Phase: 01-experi-ncia-da-consulta*
*Completed: 2026-06-28*
