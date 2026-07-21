---
phase: 01-experi-ncia-da-consulta
plan: 04
subsystem: patients/ui
tags: [pediatric-age, gestational-age, corrected-age, patient-hero, case-header, assistant, pt-br]

# Dependency graph
requires:
  - phase: 01-01
    provides: patients.gestational_age_weeks column (live)
  - phase: 01-02
    provides: lib/compute-pediatric-age.ts + lib/format-pediatric-age.ts (engine + formatter)
provides:
  - "Gestational-age form field (20–42, PT-BR validation) persisted through schema → modules → actions"
  - "Pediatric age rendered from the engine on patient hero, case header, dashboard home, and assistant context"
  - "Corrected-age second badge for preterm children; chronological badge prefixed when corrected shown"
  - "Missing/invalid/future DOB states per UI-SPEC (D-09/D-12)"
affects: [Phase 5 (gestational age + corrected age feed vaccine-due logic)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "All age surfaces consume lib/compute-pediatric-age.ts; legacy formatAgeFromBirthDate reduced to a thin adapter (no remaining production component caller)"
    - "Engine result → component renders UI-SPEC copy for non-ok status (missing/invalid/future)"

key-files:
  created:
    - components/dashboard/patients/patient-form/patient-form-gestational-age-field.tsx
    - lib/schemas/patient.spec.ts
  modified:
    - lib/schemas/patient.ts
    - modules/patients/types.ts
    - modules/patients/create-patient.ts
    - modules/patients/update-patient.ts
    - actions/patients/create-patient.ts
    - actions/patients/update-patient.ts
    - components/dashboard/patients/patient-form/patient-form-personal-section.tsx
    - components/dashboard/patients/patient-form/patient-form-defaults.ts
    - components/dashboard/patients/patient-detail-hero.tsx
    - components/dashboard/patients/patient-detail-view.tsx
    - components/dashboard/cases/case-detail-header.tsx
    - components/dashboard/home/dashboard-home-content.tsx
    - modules/cases/get-case-by-id.ts
    - modules/falaped-assistant/lib/formatters.ts

key-decisions:
  - "Years band (≥24mo) now renders remaining days per the D-07 post-execution refinement: '2 anos, 1 mês e 13 dias' (committed in f29f15c on the engine/formatter; surfaced here)."
  - "'Completar cadastro' empty-state CTA opens the in-page edit toggle via an onEditRequest callback (no /edit route exists in the app)."
  - "Assistant formatAgeFromBirthDate kept as a thin adapter over the new engine so its existing spec stays green; no production component calls the legacy path."

patterns-established:
  - "Single age engine consumed by hero + case header + home + assistant — one source of truth for displayed age"

requirements-completed: [CONS-01]

# Metrics
duration: ~14min
completed: 2026-06-28
---

# Phase 1 Plan 04: Age Display Slice Summary

**The pediatric age engine is now wired end-to-end: a gestational-age field persists through the patient stack, and every age surface (patient hero, case header, dashboard home, assistant context) renders from `computePediatricAge` + `formatPediatricAge`, including corrected age for preterm children and the day-inclusive years band — fully replacing the legacy years+months-only formatter.**

## Performance

- **Duration:** ~14 min
- **Tasks:** 4 (1 RED + 3 implementation; Task 4 = human-verify checkpoint, approved)
- **Files created:** 2 · **modified:** 14

## Accomplishments

- **Gestational age persisted (D-10):** `gestational_age_weeks` added to the patient Zod schema (20–42, PT-BR error), `modules/patients` types + create/update, and the `actions/patients` create/update boundary. Column already live (Plan 01-01).
- **Form field:** `patient-form-gestational-age-field.tsx` ("Idade gestacional ao nascer", hint, placeholder "Ex.: 34") wired into the personal section + defaults.
- **Age rendering via the engine:** patient hero (`DD/MM/AAAA · <age>` full by-extenso), case header (abbreviated `Badge` + `Tooltip` with full text + DOB), dashboard-home active case, and assistant `- Idade:` line all route through `computePediatricAge`/`formatPediatricAge`. The ≥24-month band shows days ("2 anos, 1 mês e 13 dias").
- **Corrected age (D-10):** distinct "idade corrigida" badge for preterm children; chronological badge prefixed "idade cronológica" only when both shown; hidden for full-term / past 24 months corrected.
- **Edge states (D-09/D-12):** missing DOB → "Idade indisponível…" + "Completar cadastro" CTA (opens edit); invalid/future → destructive chip.
- **Legacy formatter retired:** no production component calls `formatAgeFromBirthDate`; the assistant keeps a thin adapter over the new engine (T12 noon-hack count = 0).

## Task Commits

| Task | Name | Type | Commit |
| ---- | ---- | ---- | ------ |
| RED | Failing gestational-age schema tests | test | 5187064 |
| 1 | Persist gestational age (schema → types → modules → actions) | feat | 3d878f7 |
| 2 | Gestational-age form field + defaults | feat | 1030641 |
| 3 | Render age on hero + case header + home + assistant via engine | feat | 9ef5b5f |

## Deviations from Plan

- **"Completar cadastro" CTA target:** implemented as an in-page edit toggle (`onEditRequest` from `patient-detail-view`) rather than a `/edit` route, because no such route exists. Surfaced at the checkpoint and accepted.

## Verification

- `yarn typecheck` → 0 errors · `yarn lint` → 0 errors (4 pre-existing unrelated warnings) · `yarn test` → 388/388 pass.
- No production caller of `formatAgeFromBirthDate` remains; T12 noon-hack count = 0.
- Human-verify checkpoint (Task 4): approved by user.

## Known Stubs

None for the age display. CONS-04 PDF boundary (Plan 01-03 Path A) and the consultation timer (Plan 01-05) are tracked separately.

## Self-Check: PASSED

- FOUND: components/dashboard/patients/patient-form/patient-form-gestational-age-field.tsx
- FOUND: lib/schemas/patient.spec.ts
- patient-detail-hero.tsx imports computePediatricAge + formatPediatricAge
- FOUND commits: 5187064, 3d878f7, 1030641, 9ef5b5f
