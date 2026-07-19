---
phase: 05-calend-rio-de-vacinas-refer-ncia
plan: 04
subsystem: ui
tags: [nextjs, rsc, react, tailwind, age-engine, idor-guard, highlight, tdd]

requires:
  - phase: 05-calend-rio-de-vacinas-refer-ncia
    provides: "plan 05-03: Criança (SUS × SBIm) tabs + Gestante list, forward-compatible VaccineCalendarView prop surface; plan 05-01: vaccine_schedules/items + getVaccineScheduleWithItems"
  - phase: 01
    provides: "lib/compute-pediatric-age.ts — tested pediatric age engine (banded age, corrected age, local-midnight parsing)"
provides:
  - "Patient entry point (D-03): /dashboard/vaccines accepts an optional ?patientId, reads the owned patient (profile_id-scoped IDOR guard) and passes birthDate + gestationalAgeWeeks to the view"
  - "In-profile current-age vaccine card (PatientVaccineAgeCard): current-band vaccines in SUS+SBIm, highlighted, with provenance + a discreet 'Ver calendário completo' link to /dashboard/vaccines?patientId (revised D-03 entry point — replaces the removed toolbar nav link)"
  - "Position-only current-age-band highlight (D-02/D-11): matching age band emphasized (border-l-2 border-primary + bg-primary/10 + 'Idade atual' badge) identically in SUS and SBIm columns"
  - "lib/vaccine-current-band.ts — pure, tested helpers (computeCurrentMonths, isBandCurrent) projecting a PediatricAge onto the schedule month axis"
  - "Calendário vacinal carousel section (PatientVaccineCalendarSection): one slide per ordered age band across SUS+SBIm, initial slide = current band, prev/next + N/M indicator, checkbox per row persisting applied doses per patient (VAC-05, pulled forward from Phase 6, position-only)"
  - "patient_vaccine_doses owned table (profile_id + patient_id, owner-scoped RLS mirroring patient_measurements) + modules (get taken ids / mark idempotent upsert / unmark delete) + togglePatientVaccineDoseAction — the applied-dose persistence layer Phase 6 dose-diff builds on"
  - "lib/vaccine-band-carousel.ts — pure computeOrderedBands (shared with the calendar) + resolveCurrentBandIndex (carousel initial slide)"
affects: ["phase 06 (vaccination record — dose diff / pendência builds on this position-only anchor + the applied-dose marks persisted here via VAC-05)"]

tech-stack:
  added: []
  patterns:
    - "Optional ?patientId RSC searchParam resolved via the existing owner-scoped getPatientById (profile_id guard) — foreign/guessed id → null → standalone render, no leak (T-05-05)"
    - "Reuse the Phase 1 age engine for positioning only (computePediatricAge → project onto months) — never re-implement date math, never new Date('YYYY-MM-DD') (Pitfall 5)"
    - "Extract the band-matching predicate into a pure lib helper (TDD RED→GREEN) so the React components stay declarative and the logic is unit-tested under tsx --test"
    - "Same-band emphasis across two parallel columns: resolve one current age_label in the parent view, pass it to both columns so 'onde estamos' reads across"

key-files:
  created:
    - lib/vaccine-current-band.ts
    - lib/vaccine-current-band.spec.ts
    - lib/vaccine-current-band-items.ts
    - lib/vaccine-current-band-items.spec.ts
    - lib/vaccine-band-carousel.ts
    - lib/vaccine-band-carousel.spec.ts
    - lib/schemas/patient-vaccine-dose.ts
    - supabase/migrations/20260720000500_patient_vaccine_doses.sql
    - modules/patient-vaccine-doses/types.ts
    - modules/patient-vaccine-doses/get-taken-dose-ids-by-patient.ts
    - modules/patient-vaccine-doses/get-taken-dose-ids-by-patient.spec.ts
    - modules/patient-vaccine-doses/mark-dose-taken.ts
    - modules/patient-vaccine-doses/mark-dose-taken.spec.ts
    - modules/patient-vaccine-doses/unmark-dose-taken.ts
    - modules/patient-vaccine-doses/unmark-dose-taken.spec.ts
    - actions/patient-vaccine-doses/index.ts
    - actions/patient-vaccine-doses/toggle-patient-vaccine-dose.ts
    - components/dashboard/patients/patient-vaccine-calendar-section.tsx
  removed:
    - components/dashboard/patients/patient-vaccine-age-card.tsx
  modified:
    - app/dashboard/vaccines/page.tsx
    - components/dashboard/vaccines/vaccine-calendar-view.tsx
    - components/dashboard/vaccines/vaccine-column.tsx
    - components/dashboard/patients/patient-detail-toolbar.tsx
    - components/dashboard/patients/patient-detail-view.tsx
    - components/dashboard/patients/patient-detail-content.tsx
    - actions/index.ts

key-decisions:
  - "The patient read stays owner-scoped via getPatientById(supabase, patientId, profile.id) — the patient row IS owned (profile_id), unlike the GLOBAL schedule reads (D-07). A foreign id returns null and renders standalone (no highlight, no leak — T-05-05)."
  - "The paid gate (profile.status !== 'paid' → redirect) is retained on the route even with the new searchParam (T-05-01)."
  - "Highlight is position-only (D-11): computeCurrentMonths + isBandCurrent express 'onde estamos' only — no dose-diff, no 'já tomou', no pendência. That is Phase 6."
  - "The band-matching logic was extracted into lib/vaccine-current-band.ts (pure, 18 unit tests) rather than inlined in the client component, so the tdd='true' markers are honored under the project's tsx --test setup (which unit-tests pure fns, not JSX)."
  - "currentMonths = floor(totalDays / 30.4375) (avg days/month); isBandCurrent uses the inclusive window [age_months, age_months_max ?? age_months]. The Gestante tab (weeks axis) gets NO child-age highlight this phase."
  - "bg-primary/10 on the current band is the ONLY accent in the columns (UI-SPEC §Color); the 'Idade atual' badge pairs color with text (Accessibility — never color alone)."

patterns-established:
  - "Owner-scoped optional-patient RSC entry point layered over global reference reads (patient row scoped, reference data global — the D-07 divergence does not touch the owned row)"
  - "Pure highlight-predicate helper (computeCurrentMonths / isBandCurrent) reusable by Phase 6 as the age anchor for dose-diff"

requirements-completed: [VAC-01, VAC-02, VAC-05]

metrics:
  duration: "~15 min"
  completed: 2026-07-19
  tasks: 2
  files-created: 2
  files-modified: 4

status: complete
---

# Phase 05 Plan 04: Patient-Aware Route + Current-Age-Band Highlight Summary

Wired the patient-profile entry point and a position-only current-age-band highlight so a doctor opens the vaccine calendar from a child's ficha and immediately sees "onde estamos" emphasized in both the SUS and SBIm columns — reusing the Phase 1 age engine for positioning only (no diff logic; that is Phase 6).

## What Was Built

- **Task 1 — Patient-aware route + entry point (D-03):** `app/dashboard/vaccines/page.tsx` accepts an optional `?patientId` searchParam. When present it reads the patient via the owner-scoped `getPatientById(supabase, patientId, profile.id)` (IDOR guard T-05-05 — a foreign/guessed id resolves to `null` and the calendar renders standalone with no highlight). The paid gate is retained. Commit `3e07aa3`.

  > **Revised entry point (physician feedback, commits `fc60c98`/`fdbd153`/`2e2a7b0`):** the original toolbar nav button was disliked (it made the doctor leave the ficha). The D-03 entry point is now an **in-profile current-age vaccine card** (`PatientVaccineAgeCard`) mounted in `patient-detail-view.tsx` after the clinical overview: it shows, directly in the ficha, the vaccines scheduled for the child's CURRENT age band in BOTH datasets (SUS/PNI + Particular/SBIm), highlighted with the calendar's accent idiom (`border-l-2 border-primary` + `bg-primary/10`) and each panel's own provenance caption. Current-band resolution reuses the SAME engine + extracted helper as the calendar (`computeCurrentMonths` + `resolveCurrentBandLabel` in `lib/vaccine-current-band-items.ts`), so card and calendar agree; corrected age is used for preterm (CR-01) with chronological fallback. A **discreet** secondary `Ver calendário completo` link preserves patient context (`/dashboard/vaccines?patientId=…`). SUS+SBIm are read server-side in `patient-detail-content.tsx` inside an isolated try/catch that degrades to `null`, so a vaccine read error never crashes the ficha (pre-empts WR-01). The prominent `Calendário de vacinas` toolbar nav button was **removed**; the standalone `/dashboard/vaccines` route + its `?patientId` highlight are left intact (that is the "ver completo" target). Friendly PT-BR empty state ("Nenhuma vacina prevista para a faixa de idade atual"); no-DOB / no-data render nothing.
- **Task 2 — Current-age-band highlight, position-only (D-02/D-11):** New pure helper `lib/vaccine-current-band.ts` (`computeCurrentMonths`, `isBandCurrent`) built TDD (RED `edb120e` → GREEN `9bf35c0`, 18 unit tests). `VaccineCalendarView` reuses `computePediatricAge(birthDate, new Date(), gestationalAgeWeeks)` (no raw date parsing — Pitfall 5), projects onto the month axis, and resolves a single current `age_label` passed to BOTH columns. `VaccineColumn` emphasizes the matching band with `border-l-2 border-primary` + `bg-primary/10` + an `Idade atual` badge (`aria-current="true"`). The whole calendar stays visible; standalone mode shows no highlight.

## Verification

- `yarn typecheck` — passes.
- `yarn test` — 483/483 pass (18 new in `lib/vaccine-current-band.spec.ts`).
- All plan `<verify>` grep checks pass: ROUTE_PATIENT_PARAM_OK, TOOLBAR_LINK_OK, PAID_GATE_RETAINED_OK, ENGINE_REUSED_OK, NO_RAW_DATE_PARSE_OK, BADGE_OK, HIGHLIGHT_STYLE_OK.

## Deviations from Plan

**1. [Rule 3 — Blocking issue] TDD unit target for React components.** The plan marks both tasks `tdd="true"`, but the project's test runner (`tsx --test`) unit-tests pure functions in `lib/`/`modules/` and has no JSX/component test infra. To honor the RED→GREEN cycle, the band-matching logic was extracted into a pure, unit-testable helper `lib/vaccine-current-band.ts` (RED commit `edb120e`, GREEN `9bf35c0`) and the components consume it declaratively. Task 1 (route/toolbar wiring) has no isolable pure logic, so it was verified via the plan's `<verify>` grep + typecheck checks as written. No behavior change vs. plan intent.

## Requirements Delivered

- **VAC-01 / VAC-02** (already Complete from plan 05-02) — the consultation experience is now anchored to the child's age mid-consultation via the two entry points (standalone sidebar + the in-profile current-age vaccine card) and the age-band highlight (D-02/D-03/D-11).

## Human-Judgment Deferrals

These need a running app + a real patient to confirm visually (not machine-verifiable here):

- **Visual highlight on the running app:** open `/dashboard/vaccines?patientId={id}` for a child and confirm the correct band shows the accent border + `bg-primary/10` + `Idade atual` badge in BOTH columns, and that the whole calendar stays visible (no filtering).
- **In-profile vaccine card:** from a patient ficha, confirm the `Vacinas para a idade atual` card shows the current age band's vaccines highlighted in BOTH datasets (SUS/PNI + SBIm) with provenance, and that the discreet `Ver calendário completo` link opens the full calendar with that child's age highlighted.
- **Standalone shows no highlight:** open `/dashboard/vaccines` (no patientId) and confirm no band is emphasized.

## Threat Surface

No new security surface beyond the plan's `<threat_model>`. T-05-05 (IDOR) mitigated via the owner-scoped patient read; T-05-01 (paid gate) retained; no packages installed (T-05-SC N/A).

## Evolution — Calendário vacinal carousel + applied-dose marking (VAC-05, pulled forward)

Per **explicit physician request**, the in-profile single-band card (`PatientVaccineAgeCard`) was replaced by a full **"Calendário vacinal" section** built as a **carousel**, and applied-dose marking (**VAC-05**, originally Phase 6) was **pulled forward** — kept **position-only** for the reference display (the checkbox stores applied doses but drives NO pending/late/next-due diff; that remains Phase 6).

### What changed

- **New owned table `public.patient_vaccine_doses`** (migration `20260720000500_patient_vaccine_doses.sql`, committed but **NOT applied** — the orchestrator applies it to production). Mirrors the `patient_measurements` ownership idiom exactly: `profile_id` + `patient_id` columns, `on delete cascade`, RLS enabled + SELECT/INSERT/UPDATE/DELETE owner-scoped policies all in the same file (D-14). Boolean grain: a row's presence = the physician marked that specific `schedule_item_id` as taken. `unique (profile_id, patient_id, schedule_item_id)` + index on `(profile_id, patient_id)`; `taken_at` / `created_at` default `now()`. No date/lote/local (Phase 6). `schedule_item_id` FKs `vaccine_schedule_items(id) on delete cascade`.
- **Modules `modules/patient-vaccine-doses/`** — one exported fn per file, client injected, JSDoc, every query scoped by `profile_id` + `patient_id` (IDOR guard, unit-tested with a mock client asserting the `.eq()` filters):
  - `getTakenDoseIdsByPatient` → `Set<string>` of taken reference-item ids (SELECT scoped by profile_id + patient_id).
  - `markDoseTaken` → **idempotent** `upsert` on the unique mark constraint (`ignoreDuplicates`).
  - `unmarkDoseTaken` → DELETE scoped by all three of profile_id + patient_id + schedule_item_id (never item alone).
- **Action `togglePatientVaccineDoseAction`** — auth + **paid gate**, zod-validates `{patientId, scheduleItemId, taken:boolean}` (UUIDs), **verifies patient ownership** via `getPatientById(supabase, patientId, profile.id)` before mutating, dispatches mark/unmark, `revalidatePath('/dashboard/patients/{patientId}')`. Discriminated-union return.
- **UI `PatientVaccineCalendarSection`** (replaces `PatientVaccineAgeCard`, which was **removed** along with its mount) — a **carousel**: one slide per ordered age band (the union of `age_label`s across BOTH datasets via the shared `computeOrderedBands`), prev/next controls + an `N/M` position indicator, keyboard/aria basics (`aria-label`ed nav, `aria-live` band heading). The **initial slide is the child's current band** (`resolveCurrentBandIndex`), resolved with the SAME engine as the calendar/card — `computeCurrentMonths(computePediatricAge(...))` → `resolveCurrentBandLabel` — so **corrected age (CR-01)** for preterm applies identically and positioning agrees. Each slide shows the band's SUS and SBIm vaccines together (reusing `ScheduleProvenance` + the accent/`Idade atual` highlight idiom), **each row with a checkbox** reflecting taken state. Toggling uses **optimistic UI** (local `Set`, `useTransition`) and **reverts + PT-BR sonner toast** on failure. Grain is per displayed row — SUS and SBIm items are independent. Server-side fetch of the taken ids added to `patient-detail-content.tsx` inside an isolated try/catch (graceful degradation, WR-01); passed down through `patient-detail-view.tsx`.
- **Refactor:** `computeOrderedBands` was lifted out of `vaccine-calendar-view.tsx` into the shared, tested `lib/vaccine-band-carousel.ts` so the calendar column order and the carousel slide order share one source of truth.

### How the carousel resolves the current band + reuses corrected age

`resolveCurrentBandIndex(orderedBands, currentBandLabel)` returns the index of the child's current band label within the ordered union (fallback `0`). `currentBandLabel` comes from `resolveCurrentBandLabel([sus, sbim], computeCurrentMonths(computePediatricAge(birthDate, new Date(), gestationalAgeWeeks)))` — the exact chain the full calendar and the former card use. `computeCurrentMonths` reads `age.corrected?.totalDays ?? age.totalDays` (CR-01), so a preterm infant opens on its **physiologic** band, not the chronological one; term / missing GA falls back to chronological. Standalone / no-DOB → `null` → the carousel opens on the first band.

### Commits (evolution)

- `dc12430` — `feat(05-04)`: `patient_vaccine_doses` owned table + owner-scoped RLS (migration, not applied).
- `129221c` — `feat(05-04)`: applied-dose modules + `togglePatientVaccineDoseAction` + carousel helpers (TDD RED→GREEN for `lib/vaccine-band-carousel.ts`; calendar refactored to shared `computeOrderedBands`).
- `6382748` — `feat(05-04)`: `PatientVaccineCalendarSection` carousel + wiring; old `PatientVaccineAgeCard` removed.

### Verification (evolution)

- `yarn typecheck` — passes. `yarn test` — **514/514** pass (new: 6 in `lib/vaccine-band-carousel.spec.ts` + 6+4+5 across the three module specs asserting profile_id + patient_id scoping / idempotency / triple-scope delete).
- `yarn eslint` on all new/changed files — clean. (Pre-existing `ds-bundle/` lint errors are out of scope and untouched.)
- Unit tests mock the Supabase client, so they pass **without** the table existing in the live DB.

### Requirement delivered (evolution)

- **VAC-05** — "marcar doses aplicadas" — pulled forward from Phase 6 at physician request, **position-only** (records applied doses; no pending/late/next-due diff — that stays Phase 6).

### Human-Judgment Deferrals (evolution)

- Confirm on a running app: the carousel opens on the child's current age band, prev/next walks all ages, checkboxes persist per patient across reload, and a preterm patient opens on the corrected band.
- Confirm ownership isolation with two doctors: marks made by one never appear for the other.

### Not applied (orchestrator action required)

The migration `supabase/migrations/20260720000500_patient_vaccine_doses.sql` is **committed but NOT applied**. Apply order: it is a single self-contained file (table + RLS together, per D-14) that runs **after** `20260720000400_seed_vaccine_schedules_gestante.sql` — its `schedule_item_id` FK requires `vaccine_schedule_items` (created by `20260720000000_vaccine_schedules.sql`) to exist. Full SQL is returned to the orchestrator below.

## Self-Check: PASSED

- Files (original): all 6 present (2 created, 4 modified).
- Files (evolution): migration, 4 module files + 3 specs, action + barrel, schema, carousel lib + spec, new section component all present; `patient-vaccine-age-card.tsx` removed.
- Commits: `3e07aa3`, `edb120e`, `9bf35c0` (original) and `dc12430`, `129221c`, `6382748` (evolution) all present in git log.
