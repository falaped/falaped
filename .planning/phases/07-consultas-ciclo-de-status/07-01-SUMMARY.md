---
phase: 07-consultas-ciclo-de-status
plan: 01
subsystem: appointments
tags: [database, migration, rls, exclusion-constraint, state-machine, zod]
status: complete
requires:
  - Phase 6 slot semantics (half-open tstzrange '[)')
  - public.profiles, public.patients tables
provides:
  - appointment_status pg enum (5 values, live)
  - public.appointments owner-scoped table + RLS + 4 policies (live)
  - btree_gist extension (live)
  - appointments_no_double_booking partial GiST exclusion constraint (live)
  - isLegalTransition / APPOINTMENT_TRANSITIONS pure state machine
  - createAppointmentSchema / updateAppointmentStatusSchema Zod schemas
affects:
  - 07-02 (modules/actions build on live schema + transition machine)
  - 07-03 (UI renders the 5 statuses)
  - Phase 10 (earnings FK references appointments; patient_id RESTRICT preserves history)
tech-stack:
  added:
    - btree_gist (Postgres contrib extension, bundled with Supabase — no npm package)
  patterns:
    - "Partial GiST exclusion constraint as the sole authoritative double-booking arbiter (TOCTOU-safe, DB-level)"
    - "Pure, co-located-spec state machine (mirrors patient-sex.ts) — no DB dependency"
    - "Owner-scoped RLS: profile_id in (select id from profiles where auth_user_id = auth.uid())"
key-files:
  created:
    - supabase/migrations/20260722200000_appointments.sql
    - modules/appointments/types.ts
    - modules/appointments/appointment-transitions.ts
    - modules/appointments/appointment-transitions.spec.ts
    - lib/schemas/appointment.ts
  modified: []
decisions:
  - "patient_id FK ON DELETE RESTRICT (not cascade) to preserve appointment history for Phase 10 earnings FK (D-08 / research A3 / Pitfall 5)"
  - "Partial exclusion predicate WHERE status in ('pending','confirmed') — only pending+confirmed hold the slot (D-07)"
  - "Half-open tstzrange '[)' matches Phase 6 slot semantics so adjacent slots do not falsely conflict"
  - "No RPC — a single .insert() is atomic; double-booking guaranteed by the constraint, not a transaction (Pitfall 6)"
metrics:
  duration: ~2 min (Tasks 1-2 code) + checkpoint (live migration apply/verify)
  completed: 2026-07-23
  tasks: 3
  files: 5
---

# Phase 7 Plan 01: Appointments DB Foundation + Transition Machine Summary

Established the live appointments DB foundation — `appointment_status` enum, owner-scoped `appointments` table with RLS + 4 policies, `btree_gist`, and the partial GiST exclusion constraint that makes double-booking impossible at the DB layer — plus the pure status-transition machine and Zod input schemas.

## What Was Built

**Task 1 — Migration (`supabase/migrations/20260722200000_appointments.sql`, commit 29dcad2):**
Single migration combining (in order): `btree_gist` extension (before the table), `appointment_status` enum (5 English values `pending, confirmed, done, no_show, canceled` with a cycle comment), the `appointments` table (`profile_id` CASCADE, `patient_id` RESTRICT, status default `pending`, timestamptz starts/ends, created/updated), the named `appointments_ends_after_starts` CHECK, the `appointments_no_double_booking` partial GiST exclusion constraint (`profile_id with =`, `tstzrange(starts_at, ends_at, '[)') with &&`, `where (status in ('pending','confirmed'))`), the `(profile_id, starts_at)` index, RLS enable, and 4 owner-scoped policies. No RPC (INSERT-direct is atomic).

**Task 2 — Pure transition machine + schemas (commit 839939b):**
- `modules/appointments/types.ts` — `AppointmentStatus` union + snake_case `AppointmentRow`, JSDoc noting owner-scoping / IDOR defense.
- `modules/appointments/appointment-transitions.ts` — `APPOINTMENT_TRANSITIONS` (pending→[confirmed,canceled], confirmed→[done,no_show,canceled], done/no_show/canceled→[]) + `isLegalTransition(from, to)`. Pure, side-effect-free.
- `modules/appointments/appointment-transitions.spec.ts` — 5 tests covering legal, illegal, and final-state (empty list) cases. All pass.
- `lib/schemas/appointment.ts` — `createAppointmentSchema` (patient_id uuid, ISO starts/ends, `.refine` ends_at > starts_at, PT-BR message) + `updateAppointmentStatusSchema` (id uuid, from/to enum) with inferred type exports.

**Task 3 [BLOCKING] — Live migration applied + verified (resolved by orchestrator):**
The migration was applied to the live Supabase DB and the schema verified. Do NOT re-apply. Verified live-DB state:
- enum `appointment_status` = exactly `{pending, confirmed, done, no_show, canceled}`.
- `public.appointments` table exists, RLS enabled, 4 owner-scoped policies (select/insert/update/delete).
- `btree_gist` extension enabled.
- Exclusion constraint `appointments_no_double_booking` present: `EXCLUDE USING gist (profile_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE status in ('pending','confirmed')`.
- `patient_id` FK ON DELETE = RESTRICT (r); `profile_id` = CASCADE.
- `get_advisors` (security): clean — no new warning for `appointments`.

## Verification

- `yarn test` → 547 pass, 0 fail (includes the 5 appointment-transition tests).
- `yarn typecheck` → clean (AppointmentStatus union aligns across types.ts, transitions, and the schema enum).
- Migration acceptance criteria (grep checks for btree_gist-before-table, exclude-using-gist, on-delete-restrict, partial predicate, 4 policies, no RPC) satisfied at commit time.
- Live DB schema verified by the orchestrator (enum, table, RLS+4 policies, btree_gist, partial exclusion constraint, patient FK RESTRICT, advisors clean).

## Deviations from Plan

None — plan executed exactly as written. The pinned deviation (`patient_id ON DELETE RESTRICT`) was part of the plan itself (D-08 / Pitfall 5), not an in-flight deviation.

## Requirements Progress

- **APPT-02** (status cycle) — foundation complete: enum + pure transition machine (legal cycle, final states) exist and are tested.
- **APPT-04** (non-double-booking) — DB invariant live: the partial GiST exclusion constraint rejects a second overlapping pending/confirmed appointment for the same profile_id (23P01).

## For the Next Plan (07-02)

- Build `modules/appointments/*` (create with `error.code` preservation, list-by-window, update-status compare-and-set) on the live schema.
- `createAppointmentAction` must map SQLSTATE `23P01` → friendly result union ("horário já ocupado"), never a raw error (STATE blocker + D-07).
- Stamp `profile_id` server-side (never from client); apply the `paid` gate + ownership filter + ownership test (Pitfall 17 / T-07-01).
- Use `isLegalTransition` to gate status changes before the DB write.

## Self-Check: PASSED

- supabase/migrations/20260722200000_appointments.sql — FOUND
- modules/appointments/types.ts — FOUND
- modules/appointments/appointment-transitions.ts — FOUND
- modules/appointments/appointment-transitions.spec.ts — FOUND
- lib/schemas/appointment.ts — FOUND
- Commit 29dcad2 — FOUND
- Commit 839939b — FOUND
