---
phase: 05-calend-rio-de-vacinas-refer-ncia
verified: 2026-07-20T00:00:00Z
status: passed
score: 8/8 must-haves verified
behavior_unverified: 0
overrides_applied: 0
mode: mvp
goal_format_note: >
  Phase is mode:mvp in ROADMAP, but the phase goal is a descriptive
  reference-calendar statement, not the "As a ..., I want to ..., so that ..."
  user-story format MVP mode expects. Verified goal-backward against the three
  ROADMAP Success Criteria (the contract) plus the plan must_haves instead.
  Not blocking — recorded for the maintainer.
re_verification:
  previous_status: human_needed
  previous_score: 8/9 (1 behavior-unverified)
  gaps_closed:
    - "CR-01 corrected-age highlight for preterm infants — now uses corrected days (fix 8f4a4d7), verified live-effect with a passing behavioral test"
    - "Behavior-unverified preterm-highlight item — now covered by passing test + UAT #5"
  gaps_remaining: []
  regressions: []
---

# Phase 5: Calendário de Vacinas (Referência) Verification Report

**Phase Goal:** O médico consulta, durante o atendimento, o calendário de vacinas por idade — SUS/PNI e particular/SBIm lado a lado, mais a referência da gestante — modelado como dado versionado com fonte e data de vigência, somente leitura, para responder "o que está previsto nesta idade?".
**Verified:** 2026-07-20T00:00:00Z
**Status:** passed
**Re-verification:** Yes — verifies the CURRENT codebase (05-04 carousel/timeline redesign + CR-01 fix + security audit), superseding the stale 2026-07-19T21:00 report.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | ------- | ---------- | -------------- |
| 1 | Paid, authenticated doctor opens `/dashboard/vaccines` and sees the SUS/PNI calendar by age band, rendered from seed tables (VAC-01, SC1) | ✓ VERIFIED | `app/dashboard/vaccines/page.tsx` auth+paid gate (l.20-24) → 3 global reads (l.35-39) → `VaccineCalendarView`. UAT #1 pass on running app. |
| 2 | SUS/PNI and Particular (SBIm) shown as two parallel columns aligned by age band, `—` where a band is absent (VAC-02, SC2) | ✓ VERIFIED | `vaccine-calendar-view.tsx` `md:grid-cols-2` (l.82) + shared `computeOrderedBands` union; `vaccine-column.tsx` renders every band, empty marker `—` (l.103). UAT #1 pass. |
| 3 | Each dataset shows its own provenance caption + fixed advisory "Confira sempre contra o calendário oficial atual." (VAC-04, SC3) | ✓ VERIFIED | `schedule-provenance.tsx` renders `Fonte: {version} · vigência {mmm/yyyy}` (l.29-31) + fixed advisory (l.32-34), per-dataset (D-09). UAT #3 pass. |
| 4 | Gestante tab lists vaccines with gestational-week window in text — Hepatite B, dTpa (≥20 sem), Influenza, COVID-19, VSR/Abrysvo (28–36 sem) (VAC-03, SC2) | ✓ VERIFIED | `gestante-list.tsx` behind Criança/Gestante tabs; seed `20260720000400_...gestante.sql` l.31-35 has all 5 vaccines with `week_min/week_max` + text windows. UAT #2 pass. |
| 5 | Reference tables modeled as versioned data (source/version/effective_date), read-only; client writes rejected (VAC-04) | ✓ VERIFIED | `20260720000000_vaccine_schedules.sql` has NO `profile_id`; `20260720000100_rls_...sql` has 3× `using (true)` SELECT policies, zero write policies; grep confirms no client-reachable write path to the reference tables. |
| 6 | From a patient profile, doctor sees the child's current age band highlighted in both SUS+SBIm columns; whole calendar stays visible (D-02/D-11) | ✓ VERIFIED | `vaccine-calendar-view.tsx` `computePediatricAge → computeCurrentMonths → resolveCurrentBandLabel` (l.57-62) → both `VaccineColumn`; `vaccine-column.tsx` `border-l-2 border-primary bg-primary/10` + "Idade atual" badge + `aria-current` (l.59-75), no filtering. UAT #5 pass. |
| 7 | Corrected age (prematurity) drives the highlight for preterm (<37 wk); chronological fallback for term/unknown (CR-01 RESOLVED) | ✓ VERIFIED | `lib/vaccine-current-band.ts` `computeCurrentMonths` reads `age.corrected?.totalDays ?? age.totalDays` (l.26); engine exposes `corrected.totalDays` (compute-pediatric-age.ts l.41,192). Behavioral test "preterm: corrected age wins over chronological (CR-01)" PASSES. UAT #5 pass. |
| 8 | In-profile "Calendário vacinal" carousel/timeline opens on the current band with per-row applied-dose marking persisted per patient (VAC-05 pulled forward, position-only) | ✓ VERIFIED | `patient-vaccine-calendar-section.tsx` wired in `patient-detail-view.tsx` (l.140); `resolveCurrentBandIndex` initial slide (l.110), `togglePatientVaccineDoseAction` optimistic toggle (l.179); owner-scoped modules + RLS. UAT #4 pass. |

**Score:** 8/8 truths verified (0 present, behavior-unverified). Truths 6 & 7 are behavior-dependent (state-projection / corrected-age invariant) and are VERIFIED on passing behavioral tests (`lib/vaccine-current-band.spec.ts`) plus UAT #5, not on symbol presence alone.

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `supabase/migrations/20260720000000_vaccine_schedules.sql` | 2 tables, NO profile_id | ✓ VERIFIED | grep `profile_id` → 0 occurrences |
| `supabase/migrations/20260720000100_rls_vaccine_schedules.sql` | global-read SELECT-only RLS | ✓ VERIFIED | 3× `using (true)`, 0 write policies |
| `supabase/migrations/20260720000200/0300/0400_seed_*.sql` | physician-approved SUS/SBIm/gestante seeds | ✓ VERIFIED | idempotent `where not exists`, no cross join/profile; SUS 30 / SBIm 34 rows + gestante 5 vaccines |
| `modules/vaccines/get-vaccine-schedule-with-items.ts` | read module, no profile_id filter | ✓ VERIFIED | `.eq("source", source)` only, throws `[VACCINES]` |
| `app/dashboard/vaccines/page.tsx` | RSC route, auth+paid gate, ?patientId | ✓ VERIFIED | gate + owner-scoped patient read (IDOR guard) |
| `components/dashboard/vaccines/{vaccine-calendar-view,vaccine-column,gestante-list,schedule-provenance}.tsx` | two-column + tabs + gestante + provenance | ✓ VERIFIED | all present, wired |
| `lib/vaccine-current-band{,-items}.ts`, `vaccine-band-carousel.ts`, `vaccine-band-status.ts` | pure tested helpers | ✓ VERIFIED | present, unit-tested (520/520 pass) |
| `modules/patient-vaccine-doses/*` + `actions/patient-vaccine-doses/*` + `supabase/migrations/20260720000500_patient_vaccine_doses.sql` | VAC-05 owned dose layer | ✓ VERIFIED | owner-scoped modules, action with paid gate + ownership verify, RLS-secured table |
| `components/dashboard/patients/patient-vaccine-calendar-section.tsx` | carousel/timeline section | ✓ VERIFIED | wired into patient-detail-view; old `patient-vaccine-age-card.tsx` removed |
| `components/app-sidebar.tsx` | nav entry | ✓ VERIFIED | `{ title: "Vacinas", url: "/dashboard/vaccines" }` (l.73) |

### Key Link Verification

| From | To | Via | Status |
| ---- | --- | --- | ------ |
| `page.tsx` | `vaccine_schedules` | `getVaccineScheduleWithItems(supabase, 'SUS'\|'SBIm'\|'gestante')` × 3 | ✓ WIRED |
| RLS `using (true)` | any authenticated user | SELECT succeeds globally, no profile_id | ✓ WIRED |
| `app-sidebar.tsx` | `/dashboard/vaccines` | navMain entry (l.73) | ✓ WIRED |
| `patient-detail-view.tsx` | `PatientVaccineCalendarSection` | mount l.140 + taken-ids fetch in content | ✓ WIRED |
| `vaccine-calendar-view.tsx` | both `VaccineColumn` | single `currentBandLabel` from `resolveCurrentBandLabel` | ✓ WIRED |
| `computePediatricAge` | preterm highlight | `computeCurrentMonths` reads `corrected.totalDays` | ✓ WIRED (CR-01 live-effect) |
| `patient-vaccine-calendar-section` | `togglePatientVaccineDoseAction` | optimistic toggle → owner-scoped upsert/delete | ✓ WIRED |
| `patient-detail-view.tsx` | corrected-age (CR-01) | `gestationalAgeWeeks={patient.gestational_age_weeks}` (l.143) | ✓ WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data Source | Produces Real Data | Status |
| -------- | ------ | ------------------ | ------ |
| `VaccineCalendarView` (sus/sbim/gestante) | seed migrations applied to live DB (blocking "pushed" checkpoints) | Yes — UAT #1/#2/#3 rendered real SUS/SBIm/gestante rows on a running app | ✓ FLOWING |
| `PatientVaccineCalendarSection` (bands + taken ids) | `getVaccineScheduleWithItems` + `getTakenDoseIdsByPatient` | Yes — UAT #4 confirmed checkbox persistence across reload | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Typecheck | `yarn typecheck` | Done, 0 errors | ✓ PASS |
| Full suite (run once) | `yarn test` | 520/520 pass, 0 fail | ✓ PASS |
| CR-01 corrected-age invariant (single named test) | `tsx --test --test-name-pattern="corrected age wins"` | 1 pass | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| VAC-01 | 05-01, 05-04 | Tabela SUS/PNI por idade | ✓ SATISFIED | SUS column renders from seed; UAT #1 |
| VAC-02 | 05-02, 05-04 | SBIm lado a lado com SUS | ✓ SATISFIED | two-column aligned grid; UAT #1 |
| VAC-03 | 05-03 | Referência da gestante (5 vacinas + janelas) | ✓ SATISFIED | gestante tab + seed rows; UAT #2 |
| VAC-04 | 05-01/02/03 | Dado versionado + fonte/vigência na UI | ✓ SATISFIED | versioned schedules + provenance caption; UAT #3 |
| VAC-05 (out-of-phase, pulled forward) | 05-04 | Marcar doses aplicadas (position-only) | ✓ SATISFIED | `patient_vaccine_doses` + toggle action; UAT #4. See note below. |

All four STATED phase requirement IDs (VAC-01, VAC-02, VAC-03, VAC-04) are declared in plan frontmatter and satisfied. No orphaned requirements. VAC-05 was not a stated Phase-5 ID; it was pulled forward from Phase 6 at physician request and is fully delivered here.

**Traceability note (informational, non-blocking):** `.planning/REQUIREMENTS.md` still maps VAC-05 → Phase 6 / Pending (l.44, l.102) despite its pull-forward and delivery in this phase. This is a bookkeeping drift, not a functional gap — recommend updating the REQUIREMENTS.md coverage table to VAC-05 → Phase 5 / Complete when convenient.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (none) | — | — | — | No TODO/FIXME/XXX/TBD/HACK/PLACEHOLDER debt markers in phase files (grep hits were Portuguese "NÃO", false positives). |

Code-review items (05-REVIEW.md) WR-01..04 / IN-01..03 are robustness/quality observations, not goal blockers. The sole critical, CR-01, is RESOLVED and verified live-effect. WR-01 (Promise.all crash) is mitigated on the in-profile path (isolated try/catch degrades to null, per 05-04-SUMMARY); the standalone route retains a raw `Promise.all` behind the null empty-state guard — a hardening opportunity, not a goal gap (UAT #1/#2/#3 passed on the running app).

### Security

Verified via 05-SECURITY.md: SECURED, 11/11 threats CLOSED, 0 open, 0 unregistered flags. Independently confirmed key mitigations in code: paid gate on route + write action, SELECT-only global-read RLS with zero write policies, owner-scoped `getPatientById` IDOR guard, owner-scoped `patient_vaccine_doses` (profile_id + patient_id) with 4-policy RLS, zod-validated action inputs.

### Human Verification Required

None outstanding. All visual/runtime items (highlight rendering, two-column alignment, gestante windows, provenance, carousel navigation + dose persistence, preterm corrected-band) were exercised by the completed **05-UAT.md** — 5/5 passed, 0 issues, against the CURRENT implementation. The behavior-dependent invariants (CR-01 corrected-age, dose-mark persistence) additionally have passing behavioral tests, so the previously behavior-unverified item is now fully verified.

### Gaps Summary

No gaps. The phase goal is achieved end-to-end in the current codebase: a paid doctor consults the versioned, read-only SUS/PNI + SBIm side-by-side calendar plus the gestante reference, each with its own provenance and the fixed advisory, and — from a patient's ficha — the current age band (corrected for prematurity, CR-01) is highlighted with the whole calendar visible. Typecheck + 520/520 tests pass, the CR-01 corrected-age invariant has a passing behavioral test, security is SECURED (11/11), and human UAT passed 5/5 with 0 issues. The only note is the VAC-05 REQUIREMENTS.md traceability drift, which is informational bookkeeping, not a functional gap.

---

_Verified: 2026-07-20T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
