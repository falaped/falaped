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
affects: ["phase 06 (vaccination record — dose diff / pendência builds on this position-only anchor)"]

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
    - components/dashboard/patients/patient-vaccine-age-card.tsx
  modified:
    - app/dashboard/vaccines/page.tsx
    - components/dashboard/vaccines/vaccine-calendar-view.tsx
    - components/dashboard/vaccines/vaccine-column.tsx
    - components/dashboard/patients/patient-detail-toolbar.tsx
    - components/dashboard/patients/patient-detail-view.tsx
    - components/dashboard/patients/patient-detail-content.tsx

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

requirements-completed: [VAC-01, VAC-02]

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

## Self-Check: PASSED

- Files: all 6 present (2 created, 4 modified).
- Commits: `3e07aa3`, `edb120e`, `9bf35c0` all present in git log.
