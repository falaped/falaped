---
phase: 05-calend-rio-de-vacinas-refer-ncia
fixed_at: 2026-07-20T00:00:00Z
review_path: .planning/phases/05-calend-rio-de-vacinas-refer-ncia/05-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 3
skipped: 1
status: partial
---

# Phase 5: Code Review Fix Report

**Fixed at:** 2026-07-20T00:00:00Z
**Source review:** .planning/phases/05-calend-rio-de-vacinas-refer-ncia/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (all WARNING; 0 CRITICAL, INFO out of scope)
- Fixed: 3
- Skipped: 1

## Fixed Issues

### WR-01: Timeline current-band index does not update when birth_date is edited in place

**Files modified:** `components/dashboard/patients/patient-vaccine-calendar-section.tsx`
**Commit:** 61351d3
**Applied fix:** Added a `useEffect` that resets the carousel `index` to the freshly resolved `initialIndex` whenever `currentBandLabel` changes. Because `useState(initialIndex)` only reads its argument on the first render and `router.refresh()` re-renders without remounting (the `key={patient.id}` is unchanged), editing a patient's `birth_date` / `gestational_age_weeks` previously left the slide frozen on the band computed from the OLD DOB while the reactive "Idade atual" badge moved — the two could disagree. Keying the reset on `currentBandLabel` (rather than every `initialIndex` recompute) preserves deliberate user navigation within the same current-band context. Imported `useEffect` from React.

**Requires human verification:** this changes reactive UI state-sync behavior (a logic/effect change, not pure syntax). Confirm in the app that editing a DOB moves the auto-opened slide to match the badge, and that manual band navigation is not clobbered on unrelated re-renders.

### WR-03: Optimistic toggle reverts to assumed state on failure without reconciling server truth

**Files modified:** `components/dashboard/patients/patient-vaccine-calendar-section.tsx`
**Commit:** 61351d3
**Applied fix:** On a failed toggle, kept the immediate optimistic revert for responsiveness but added `router.refresh()` so the authoritative doses are re-read. Because the `taken` Set is seeded via `useState(() => new Set(takenItemIds))` (init-only, same reactivity gap as WR-01), a refresh alone would not reconcile it — so also added a `useEffect` keyed on a stable sorted key of `takenItemIds` that rebuilds the `taken` Set whenever the authoritative prop changes. This resolves the lost-response divergence (action fails but the DB row was written) instead of leaving the local Set stale until the next ficha load. Imported `useRouter` from `next/navigation`.

**Requires human verification:** effect-driven state reconciliation; confirm a failed toggle re-reads server truth and that the sorted-key effect does not thrash on unrelated re-renders.

### WR-04: `parseEffectiveDate` accepts impossible calendar dates (silent JS Date normalization)

**Files modified:** `components/dashboard/vaccines/schedule-provenance.tsx`
**Commit:** 8d2cabb
**Applied fix:** Added the same round-trip guard `localMidnightFromIso` uses in `compute-pediatric-age.ts`: after constructing `new Date(year, month-1, day)`, verify `isValid` and that `getFullYear()/getMonth()/getDate()` round-trip the parsed components, returning `null` otherwise. A malformed `effective_date` such as `2025-13-40` now returns `null` (falling back to the raw string) instead of silently normalizing to a misleading month/year. Imported `isValid` from `date-fns` (already a dependency of this file). The two date parsers in this phase now reject impossible dates identically.

## Skipped Issues

### WR-02: patient_vaccine_doses RLS INSERT/UPDATE `with check` does not verify patient_id ownership

**File:** `supabase/migrations/20260720000500_patient_vaccine_doses.sql:47-66`
**Reason:** Skipped by design. The migration `20260720000500_patient_vaccine_doses.sql` is ALREADY APPLIED to the live database, and editing an applied migration in place is not safe (it would diverge the file from the deployed schema without changing the live policy). The only correct way to tighten it would be a NEW forward migration, which is out of scope for a WARNING-level finding in this phase. The issue is not app-reachable: the action `toggle-patient-vaccine-dose.ts` verifies patient ownership via `getPatientById` before mutating, and the RLS policy still scopes rows by `profile_id`, so this is not a cross-tenant data leak. It also mirrors the existing `patient_measurements` policies exactly (`20260709000000_patient_measurements.sql:58-77`) — i.e. a repo-wide accepted pattern, not a regression introduced here. **Accepted risk:** a doctor could, at the DB layer, insert a dose row stamped with their own `profile_id` but a foreign `patient_id`; the row remains readable/writable only by that doctor, weakening the ownership invariant without leaking data. If parity with `patient_measurements` is later abandoned, tighten both tables together via a single new forward migration.

---

_Fixed: 2026-07-20T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
