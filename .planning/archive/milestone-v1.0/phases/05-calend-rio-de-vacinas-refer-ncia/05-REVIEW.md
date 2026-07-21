---
phase: 05-calend-rio-de-vacinas-refer-ncia
reviewed: 2026-07-20T00:00:00Z
depth: standard
files_reviewed: 38
files_reviewed_list:
  - actions/index.ts
  - actions/patient-vaccine-doses/index.ts
  - actions/patient-vaccine-doses/toggle-patient-vaccine-dose.ts
  - app/dashboard/vaccines/page.tsx
  - components/app-sidebar.tsx
  - components/dashboard/patients/patient-detail-content.tsx
  - components/dashboard/patients/patient-detail-view.tsx
  - components/dashboard/patients/patient-vaccine-calendar-section.tsx
  - components/dashboard/vaccines/gestante-list.tsx
  - components/dashboard/vaccines/schedule-provenance.tsx
  - components/dashboard/vaccines/vaccine-calendar-view.tsx
  - components/dashboard/vaccines/vaccine-column.tsx
  - lib/compute-pediatric-age.ts
  - lib/schemas/patient-vaccine-dose.ts
  - lib/vaccine-band-carousel.spec.ts
  - lib/vaccine-band-carousel.ts
  - lib/vaccine-band-status.spec.ts
  - lib/vaccine-band-status.ts
  - lib/vaccine-current-band-items.spec.ts
  - lib/vaccine-current-band-items.ts
  - lib/vaccine-current-band.spec.ts
  - lib/vaccine-current-band.ts
  - modules/patient-vaccine-doses/get-taken-dose-ids-by-patient.spec.ts
  - modules/patient-vaccine-doses/get-taken-dose-ids-by-patient.ts
  - modules/patient-vaccine-doses/mark-dose-taken.spec.ts
  - modules/patient-vaccine-doses/mark-dose-taken.ts
  - modules/patient-vaccine-doses/types.ts
  - modules/patient-vaccine-doses/unmark-dose-taken.spec.ts
  - modules/patient-vaccine-doses/unmark-dose-taken.ts
  - modules/vaccines/get-vaccine-schedule-with-items.spec.ts
  - modules/vaccines/get-vaccine-schedule-with-items.ts
  - modules/vaccines/types.ts
  - supabase/migrations/20260720000000_vaccine_schedules.sql
  - supabase/migrations/20260720000100_rls_vaccine_schedules.sql
  - supabase/migrations/20260720000200_seed_vaccine_schedules.sql
  - supabase/migrations/20260720000300_seed_vaccine_schedules_sbim.sql
  - supabase/migrations/20260720000400_seed_vaccine_schedules_gestante.sql
  - supabase/migrations/20260720000500_patient_vaccine_doses.sql
findings:
  critical: 0
  warning: 4
  info: 4
  total: 8
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-07-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 38
**Status:** issues_found

## Summary

Reviewed the Phase 5 vaccine reference calendar: the global read-only reference tables (SUS/SBIm/gestante) with their global-read RLS and seeds, the owned `patient_vaccine_doses` table with owner-scoped RLS, the toggle action + its three modules, the pediatric-age engine and the pure band-resolution helpers, and the calendar / patient-ficha UI.

Overall the security posture is sound. The action follows the project contract exactly (auth → paid gate → Zod `safeParse` → `getPatientById` ownership verify → owner-scoped mutation → result union). The global-read reference tables are correctly documented and are NOT flagged (per review scope). The three dose modules apply the profile_id + patient_id scoping the IDOR defense requires, and the delete uses all three `.eq` filters. All 520 tests pass.

**CR-01 verification (was previously flagged as dead-effect, reported fixed):** VERIFIED WORKING. `compute-pediatric-age.ts:192` populates `corrected.totalDays` with `differenceInDays(today, correctedBirth)`, and `computeCurrentMonths` (`vaccine-current-band.ts:26`) consumes it via `age.corrected?.totalDays ?? age.totalDays`. The spec `vaccine-current-band.spec.ts:68` proves the corrected age wins over chronological (365 chronological days → month 11, but corrected 35 days → month 1). The fix is real and covered.

No BLOCKER-level defects found. The findings below are correctness/robustness (WARNING) and quality (INFO) items.

## Warnings

### WR-01: Timeline current-band index does not update when birth_date is edited in place

**File:** `components/dashboard/patients/patient-vaccine-calendar-section.tsx:109,129`
**Issue:** `initialIndex` is recomputed with `useMemo` from `orderedBands` + `currentBandLabel`, but the active slide is stored as `const [index, setIndex] = useState(initialIndex)`. React `useState` only reads its argument on the FIRST render — later changes to `initialIndex` are ignored. `PatientVaccineCalendarSection` is NOT remounted when a patient's `birth_date` / `gestational_age_weeks` is edited: `patient-detail-view.tsx` keeps the same `patient.id`, and the edit flow calls `router.refresh()` (`patient-detail-view.tsx:66`), which re-renders with new props but does not change the `key={patient.id}` set in `patient-detail-content.tsx:48`. Result: after correcting a DOB in the edit form, the timeline still opens on the band computed from the OLD birth date until a full navigation/remount. The "Idade atual" badge (driven by `currentBandLabel`, which IS reactive) will correctly move, so the badge and the auto-opened slide can disagree.
**Fix:** Sync the index to the resolved current band when it changes:
```tsx
useEffect(() => {
  setIndex(initialIndex)
}, [initialIndex])
```
If preserving deliberate user navigation matters, key the reset on `currentBandLabel` changing rather than on every `initialIndex` recompute.

### WR-02: patient_vaccine_doses RLS INSERT/UPDATE `with check` does not verify patient_id ownership

**File:** `supabase/migrations/20260720000500_patient_vaccine_doses.sql:47-66`
**Issue:** The INSERT and UPDATE policies only enforce `profile_id in (select id from profiles where auth_user_id = auth.uid())`. They do NOT verify that `patient_id` belongs to a patient owned by that profile. At the DB layer alone, an authenticated doctor could insert a dose row stamped with their own `profile_id` but a `patient_id` belonging to another doctor's patient (the `schedule_item_id` FK is global reference data, so it is not a constraint here). The row would be readable/writable only by the inserting doctor, so this is not a cross-tenant data leak, but it lets a doctor create dose rows referencing a foreign patient id, weakening the ownership invariant. The application action (`toggle-patient-vaccine-dose.ts:53`) DOES verify patient ownership via `getPatientById`, so the exploit is not reachable through the app — but RLS is the last line of defense and currently trusts the app. Note: this mirrors the existing `patient_measurements` policies exactly (`20260709000000_patient_measurements.sql:58-77`), so it is a repo-wide pattern, not a new regression introduced here.
**Fix:** Tighten the `with check` (and UPDATE `using`) to also assert patient ownership:
```sql
with check (
  profile_id in (select id from public.profiles where auth_user_id = auth.uid())
  and patient_id in (
    select p.id from public.patients p
    join public.profiles pr on pr.id = p.profile_id
    where pr.auth_user_id = auth.uid()
  )
)
```
If parity with `patient_measurements` is intentionally preferred over tightening, document the accepted risk explicitly; otherwise fix both tables.

### WR-03: Optimistic toggle reverts to assumed state on failure without reconciling server truth

**File:** `components/dashboard/patients/patient-vaccine-calendar-section.tsx:168-200`
**Issue:** `handleToggle` guards concurrent clicks on the same row via `disabled={isPending}` (lines 448/453), preventing a second click while the first is in flight — good. However, the revert-on-failure logic (lines 191-196) blindly re-adds/removes based on the `nextTaken` captured at click time, reverting to the assumed prior state rather than re-reading server truth. In the common single-toggle case this is correct, but if the action fails while the DB actually applied the change (e.g. lost response), the local `taken` Set diverges from the DB until the next ficha load. Robustness edge, not data loss — the DB is authoritative on reload.
**Fix:** On failure prefer `router.refresh()` / refetch to reconcile the taken Set with server truth instead of a blind local revert, or document that the local revert is best-effort and the ficha reload is authoritative.

### WR-04: `parseEffectiveDate` accepts impossible calendar dates (silent JS Date normalization)

**File:** `components/dashboard/vaccines/schedule-provenance.tsx:40-45`
**Issue:** Unlike `localMidnightFromIso` in `compute-pediatric-age.ts:83` (which explicitly rejects rollovers like `2025-02-30`), `parseEffectiveDate` only regex-matches the shape then constructs `new Date(year, month-1, day)` without verifying the components round-trip. A malformed `effective_date` such as `2025-13-40` would silently normalize to a wrong month/year and render a misleading "vigência". The input is DB-seeded and currently trustworthy, so exploitation is not realistic, but the two date parsers in this phase diverge in strictness for no reason.
**Fix:** Reuse the round-trip guard the age engine uses, or extract a shared `localMidnightFromIso` helper and call it here so both parsers reject impossible dates identically.

## Info

### IN-01: `isBandCurrent` null-`age_months_max` single-point fallback is safe only because gestante items are never fed to it

**File:** `lib/vaccine-current-band.ts:52`
**Issue:** `isBandCurrent` treats a null `age_months_max` as a single point (`upper = ageMonths`). Gestante items (`gestational_weeks` axis) always have null `age_months`, so `isBandCurrent` returns `false` for them — but `resolveCurrentBandLabel` is only ever fed `[sus, sbim]` (child axis), so gestante never reaches it. No bug today; noting the coupling so a future caller does not pass gestante items into the age-band resolver expecting a match.
**Fix:** No change required. Optionally add a comment/assertion that `resolveCurrentBandLabel` must only receive `child_age`-axis schedules.

### IN-02: Clamp comment implies the stale-index case is handled when WR-01 shows it is not

**File:** `components/dashboard/patients/patient-vaccine-calendar-section.tsx:138-139`
**Issue:** The defensive clamp `Math.min(Math.max(index, 0), orderedBands.length - 1)` is correct and prevents an out-of-range crash, but its comment "in case the band list changed between renders" implies the changed-input scenario is handled — WR-01 shows the `index` re-initialization is NOT handled. Aligning the comment avoids implying full coverage.
**Fix:** Reword the comment, or implement WR-01's effect so clamp and reset are consistent.

### IN-03: `markDoseTaken` idempotent upsert always reports success even when nothing changed

**File:** `modules/patient-vaccine-doses/mark-dose-taken.ts:24-39`
**Issue:** The upsert with `ignoreDuplicates: true` on the unique `(profile_id, patient_id, schedule_item_id)` constraint is correct and idempotent. Because it never surfaces "already taken," the action always returns `{ ok: true, taken: true }` even when the row already existed. This is the intended boolean-grain behavior; noting it so a future "already recorded" affordance knows the module intentionally hides that distinction.
**Fix:** No change required.

### IN-04: Age timeline mixes `justify-between` with `overflow-x-auto`

**File:** `components/dashboard/patients/patient-vaccine-calendar-section.tsx:232-233`
**Issue:** `flex justify-between ... overflow-x-auto` mixes distribute-to-edges layout with horizontal scrolling. When summed step width exceeds the container, scrolling works, but on medium widths the steps can bunch with uneven gaps. Visual/UX nuance, not correctness; pure styling is outside this review's scope.
**Fix:** No change required for correctness. For polish, prefer `justify-start gap-*` for the scrollable track so spacing stays uniform.

---

_Reviewed: 2026-07-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
