---
phase: 05-calend-rio-de-vacinas-refer-ncia
verified: 2026-07-19T21:00:00Z
status: human_needed
score: 8/9 must-haves verified
behavior_unverified: 1
overrides_applied: 0
mode: mvp
goal_format_note: >
  Phase is mode:mvp in ROADMAP, but the phase goal is a descriptive
  reference-calendar statement, not the "As a ..., I want to ..., so that ..."
  user-story format MVP mode expects. Verified goal-backward against the three
  ROADMAP Success Criteria (the contract) instead. Not blocking — recorded for
  the maintainer.
behavior_unverified_items:
  - truth: "From a patient's profile the child's current age band is highlighted in both columns (05-04 highlight)"
    test: "Open /dashboard/vaccines?patientId={a real preterm child} and a real term child; observe which band shows the 'Idade atual' badge + accent border in the SUS and SBIm columns."
    expected: "Term child: the band matching chronological age is emphasized in BOTH columns. Preterm child (with gestational_age_weeks set): the band matching the CORRECTED age should be emphasized — but per CR-01 it currently emphasizes the chronological band (see WR/CR note below)."
    why_human: "The highlight is a runtime state projection (birthDate → months → matching band) that depends on live patient data and rendered DOM; grep confirms the wiring exists but cannot observe which band actually lights up, and no test exercises the corrected-age path."
human_verification:
  - test: "Open /dashboard/vaccines as a paid doctor and view the Criança tab."
    expected: "SUS/PNI and Particular (SBIm) render as two aligned columns grouped by age band; bands read across at the same vertical rhythm; where a dataset lacks a band an explicit — marker shows."
    why_human: "Two-column visual alignment and the empty-marker rhythm are rendering concerns only a human viewing the running app can confirm; deferred by plans 05-01/05-02."
  - test: "Switch to the Gestante tab."
    expected: "A single list by vaccine shows Hepatite B, dTpa (a partir de 20 semanas), Influenza, COVID-19, VSR/Abrysvo (28–36 semanas), each with its gestational-week window in text and its own provenance caption."
    why_human: "Gestante list rendering + week-window text presentation is a visual item deferred by plan 05-03."
  - test: "On any column/list, read the footer caption."
    expected: "Each dataset shows 'Fonte: {version} · vigência {mmm/yyyy}' distinct per dataset, plus the fixed advisory 'Confira sempre contra o calendário oficial atual.'"
    why_human: "Caption formatting and per-dataset distinctness confirmed in code; on-screen legibility/placement is a visual check."
  - test: "From a patient's ficha, click 'Calendário de vacinas'; then open /dashboard/vaccines with no patientId."
    expected: "With patientId: calendar opens with the current age band emphasized. Without patientId: no band is highlighted (standalone)."
    why_human: "Navigation + conditional highlight is a rendered-flow behavior deferred by plan 05-04."
  - test: "Open the calendar for a preterm patient (gestational_age_weeks set) whose corrected age differs from chronological age."
    expected: "Ideally the CORRECTED-age band is emphasized. CR-01 (code review) found corrected age is threaded through but ignored — chronological band is emphasized instead. Confirm whether this is acceptable for this phase (highlight is position-only, Phase 6 owns diff logic) or must be fixed."
    why_human: "Requires a real preterm patient and physician judgment on whether the chronological fallback is clinically acceptable for a position-only highlight."
---

# Phase 5: Calendário de Vacinas (Referência) Verification Report

**Phase Goal:** O médico consulta, durante o atendimento, o calendário de vacinas por idade — SUS/PNI e particular/SBIm lado a lado, mais a referência da gestante — modelado como dado versionado com fonte e data de vigência, somente leitura, para responder "o que está previsto nesta idade?".
**Verified:** 2026-07-19T21:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification
**Mode:** mvp (goal is descriptive, not user-story format — see frontmatter note)

## Goal Achievement

The core reference-calendar goal is achieved in the codebase: a global, read-only, versioned dataset (SUS + SBIm on the child-age axis, gestante on the gestational-week axis) rendered end-to-end at `/dashboard/vaccines` with per-dataset provenance and the fixed advisory, behind the auth + paid gate. All structural and wiring truths pass. The only non-verified item is the patient-mode current-age highlight, a 05-04 nicety layered on top of the core goal — its corrected-age branch is dead-effect (CR-01) and the highlight is inherently a runtime-visual behavior deferred to human verification. Because plans deliberately deferred several visual items, the overall status is `human_needed` (not `passed`).

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Paid, authenticated doctor opens /dashboard/vaccines and sees the SUS/PNI calendar grouped by age band, rendered from seed tables | ✓ VERIFIED | `app/dashboard/vaccines/page.tsx:20-39` (auth+paid gate, `getVaccineScheduleWithItems('SUS')`), `VaccineColumn` renders items grouped by `age_label`; 27 SUS items live-seeded (`20260720000200`). On-screen render is a human-visual item. |
| 2 | Each dataset shows its own provenance caption + fixed advisory | ✓ VERIFIED | `schedule-provenance.tsx:29-34` renders `Fonte: {version} · vigência {date}` + `Confira sempre contra o calendário oficial atual.`; wired per column/list via `CardFooter`. |
| 3 | A second doctor sees the exact same rows (global, not owner-scoped) | ✓ VERIFIED | `get-vaccine-schedule-with-items.ts:22` NO `.eq(profile_id)`; RLS `using (true)` for authenticated (`20260720000100`). Orchestrator-confirmed live: no profile_id column, global-read policy. |
| 4 | Reference tables reject any client write (SELECT-only RLS) | ✓ VERIFIED | `20260720000100` enables RLS + creates ONLY SELECT policies; no INSERT/UPDATE/DELETE policy on either table. Orchestrator-confirmed: 2 SELECT-only policies, no write policies. |
| 5 | Criança view shows SUS + SBIm as two parallel columns aligned by age band (VAC-02) | ✓ VERIFIED | `vaccine-calendar-view.tsx:79-98` two-column grid; `computeOrderedBands` unions bands; `VaccineColumn` renders every band with `—` empty marker. Visual alignment is a human item. |
| 6 | Two tabs (Criança / Gestante); Gestante lists vaccines with gestational-week window in text (VAC-03) | ✓ VERIFIED | `vaccine-calendar-view.tsx:63-109` Tabs shell; `GestanteList` renders week window from `age_label`. |
| 7 | Gestante rows include Hep B, dTpa (≥20 sem), Influenza, COVID-19, VSR/Abrysvo (28–36 sem) | ✓ VERIFIED | `20260720000400` seeds exactly those 5 items with matching windows; 5 gestante items live-confirmed. |
| 8 | Standalone /dashboard/vaccines (no patientId) shows no highlight | ✓ VERIFIED | `vaccine-calendar-view.tsx:55-60` `currentMonths=null` when no birthDate → `resolveCurrentBandLabel` returns null → no band emphasized. |
| 9 | From patient profile, the child's current age band is highlighted in both columns (D-02/D-03) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Wiring present: toolbar link `?patientId` → page reads `birth_date`/`gestational_age_weeks` → `computePediatricAge` → highlight. Chronological path unit-tested (18 cases). BUT corrected-age branch is dead-effect (CR-01) and no test/render exercises the actual highlight. Routed to human verification. |

**Score:** 8/9 truths verified (1 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260720000000_vaccine_schedules.sql` | Two tables, NO profile_id | ✓ VERIFIED | Both tables, no owner column, cascade FK, index on (schedule_id, sort_order). |
| `supabase/migrations/20260720000100_rls_vaccine_schedules.sql` | Global-read SELECT-only RLS | ✓ VERIFIED | RLS enabled + 2 SELECT policies `using (true)`, no write policies. |
| `supabase/migrations/20260720000200_...sql` | SUS seed (metadata + items) | ✓ VERIFIED | 3 schedule metadata rows + 27 SUS items, idempotent. |
| `supabase/migrations/20260720000300_...sbim.sql` | SBIm items | ✓ VERIFIED | 34 SBIm items, idempotent, `::integer` casts. |
| `supabase/migrations/20260720000400_...gestante.sql` | Gestante items (weeks axis) | ✓ VERIFIED | 5 items on week_min/week_max axis, matches VAC-03. |
| `modules/vaccines/get-vaccine-schedule-with-items.ts` | Read module, no profile_id | ✓ VERIFIED | Global read, `.maybeSingle()`, `[VACCINES]` error tag. |
| `modules/vaccines/types.ts` | Domain types | ✓ VERIFIED | Source/axis/schedule/item types, snake_case. |
| `app/dashboard/vaccines/page.tsx` | RSC route, auth+paid gate, ?patientId | ✓ VERIFIED | Gate present, IDOR-safe patient read, 3 schedule reads, empty-state card. |
| `components/dashboard/vaccines/vaccine-calendar-view.tsx` | Tabs + two columns + highlight | ✓ VERIFIED | Tabs, two-column grid, band union, highlight resolution. |
| `components/dashboard/vaccines/vaccine-column.tsx` | Column with band grouping + highlight | ✓ VERIFIED | Bands, empty marker, `Idade atual` badge + accent. |
| `components/dashboard/vaccines/gestante-list.tsx` | Gestante list by vaccine | ✓ VERIFIED | Table by vaccine + week window text. |
| `components/dashboard/vaccines/schedule-provenance.tsx` | Per-dataset caption + advisory | ✓ VERIFIED | Source/vigência + fixed advisory. |
| `lib/vaccine-current-band.ts` | Age projection + band predicate | ⚠️ HALF-WIRED | Functions correct for chronological age; ignores corrected age (CR-01). |
| `components/dashboard/patients/patient-detail-toolbar.tsx` | Link to calendar with patientId | ✓ VERIFIED | Link `?patientId={id}` present. |
| `components/app-sidebar.tsx` | Nav entry → /dashboard/vaccines | ✓ VERIFIED | "Vacinas" nav entry present. |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| page.tsx | vaccine_schedules + items | `getVaccineScheduleWithItems(supabase, source)` join | ✓ WIRED |
| global-read RLS | any authenticated SELECT | `using (true)` | ✓ WIRED |
| sidebar navMain | /dashboard/vaccines | nav entry | ✓ WIRED |
| VaccineCalendarView | SUS + SBIm columns | two-column grid + band union | ✓ WIRED |
| patient-detail-toolbar | /dashboard/vaccines?patientId | `Link href` | ✓ WIRED |
| page.tsx | birthDate + gestationalAgeWeeks | `getPatientById` → props | ✓ WIRED (but gestationalAgeWeeks is dead-effect per CR-01) |
| computePediatricAge | currentMonths → band | `computeCurrentMonths` / `resolveCurrentBandLabel` | ⚠️ PARTIAL (chronological only; corrected-age ignored) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| VaccineColumn (SUS) | `schedule.vaccine_schedule_items` | `getVaccineScheduleWithItems('SUS')` → live table (27 items) | Yes | ✓ FLOWING |
| VaccineColumn (SBIm) | `schedule.vaccine_schedule_items` | `getVaccineScheduleWithItems('SBIm')` → live table (34 items) | Yes | ✓ FLOWING |
| GestanteList | `schedule.vaccine_schedule_items` | `getVaccineScheduleWithItems('gestante')` → live table (5 items) | Yes | ✓ FLOWING |
| highlight | `currentBandLabel` | `birthDate`/`gestationalAgeWeeks` from owned patient | Chronological yes; corrected no | ⚠️ PARTIAL |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Age-band primitives correct | `tsx --test lib/vaccine-current-band.spec.ts` | 18 cases | ✓ PASS |
| Read module behavior (null/join/error) | `tsx --test modules/vaccines/get-vaccine-schedule-with-items.spec.ts` | 5 cases | ✓ PASS |
| Full vaccine test run | `yarn tsx --test <both specs>` | 23 pass / 0 fail | ✓ PASS |
| Types compile | `yarn typecheck` | clean | ✓ PASS |
| Corrected-age highlight path | (no test exists) | — | ? SKIP (routed to human; CR-01) |
| Live calendar render | (needs running app) | — | ? SKIP (human) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| VAC-01 | 05-01 | SUS/PNI reference table by age | ✓ SATISFIED | SUS column end-to-end, 27 live items. |
| VAC-02 | 05-02 | SBIm side by side with SUS | ✓ SATISFIED | Two-column grid, 34 SBIm items. |
| VAC-03 | 05-03 | Gestante reference | ✓ SATISFIED | Gestante tab + 5 matching items. |
| VAC-04 | 05-01/02/03/04 | Versioned data w/ source + vigência | ✓ SATISFIED | schedules.version/effective_date + ScheduleProvenance. |

All 4 declared requirement IDs (VAC-01..04) accounted for and SATISFIED. REQUIREMENTS.md maps exactly VAC-01..04 to Phase 5 — no orphaned requirements. VAC-05/06/07 are correctly mapped to Phase 6 (not this phase's scope).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| lib/vaccine-current-band.ts + vaccine-calendar-view.tsx | (CR-01) | Half-wired corrected-age plumbing | ⚠️ Warning | Preterm infants highlight chronological band; feature advertises corrected-age support it does not deliver. Highlight is not part of the core reference-calendar goal. |
| app/dashboard/vaccines/page.tsx | 35-39 | Promise.all read error → page crash, not empty state (WR-01) | ⚠️ Warning | Transient DB error bypasses the designed "Calendário indisponível" fallback. |
| get-vaccine-schedule-with-items.ts | 23-28 | `.maybeSingle()` throws if 2 versions share a source (WR-02) | ⚠️ Warning | No DB uniqueness guard; a future second version breaks reads. |
| vaccine-calendar-view.tsx | 146-160 | Band resolution is scan-order dependent; wide windows (WR-03/WR-04) | ⚠️ Warning | Alignment invariant is fragile; SBIm-only child could highlight wide influenza band. |

No `TBD`/`FIXME`/`XXX` debt markers. No stubs. No hardcoded empty data flowing to render.

### Human Verification Required

5 items (see frontmatter `human_verification`), summarized:

1. **Criança two-column render + alignment** — visual, deferred by 05-01/05-02.
2. **Gestante tab list + week windows** — visual, deferred by 05-03.
3. **Provenance captions + advisory on screen** — visual legibility.
4. **Patient-entry navigation + standalone-no-highlight** — rendered flow, deferred by 05-04.
5. **Preterm corrected-age highlight (CR-01)** — physician judgment on whether the chronological fallback is acceptable for a position-only highlight, or CR-01 must be fixed / the `gestationalAgeWeeks` prop removed.

### Gaps Summary

No BLOCKERS. The three ROADMAP Success Criteria (SUS by age; SBIm side by side + gestante reference; each dataset labeled with source + vigência + advisory) are all structurally verified against the codebase and backed by the live-seeded datasets (27 SUS / 34 SBIm / 5 gestante) and SELECT-only global RLS. All 4 requirements (VAC-01..04) SATISFIED.

One truth is `PRESENT_BEHAVIOR_UNVERIFIED`: the patient-mode current-age highlight (05-04). Its wiring exists and the chronological primitives are unit-tested, but (a) it is inherently a runtime-visual behavior that no test/render exercises, and (b) CR-01 shows the corrected-age branch is dead-effect. This is a 05-04 nicety layered on the core reference-calendar goal, not part of the ROADMAP contract — so it is a WARNING routed to human verification, not a blocker.

Overall status is `human_needed` because the plans deliberately deferred multiple visual items (Step 9 decision tree: human items take priority over passed once the human-verification section is non-empty). Recommend the human checkpoint confirm the render items and rule on CR-01 (fix corrected age, or remove the `gestationalAgeWeeks` prop so the code does not claim a capability it lacks).

---

_Verified: 2026-07-19T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
