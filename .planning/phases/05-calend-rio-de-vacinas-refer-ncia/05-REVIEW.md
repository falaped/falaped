---
phase: 05-calend-rio-de-vacinas-refer-ncia
reviewed: 2026-07-19T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - app/dashboard/vaccines/page.tsx
  - components/app-sidebar.tsx
  - components/dashboard/patients/patient-detail-toolbar.tsx
  - components/dashboard/vaccines/gestante-list.tsx
  - components/dashboard/vaccines/schedule-provenance.tsx
  - components/dashboard/vaccines/vaccine-calendar-view.tsx
  - components/dashboard/vaccines/vaccine-column.tsx
  - lib/vaccine-current-band.spec.ts
  - lib/vaccine-current-band.ts
  - modules/vaccines/get-vaccine-schedule-with-items.spec.ts
  - modules/vaccines/get-vaccine-schedule-with-items.ts
  - modules/vaccines/types.ts
  - supabase/migrations/20260720000000_vaccine_schedules.sql
  - supabase/migrations/20260720000100_rls_vaccine_schedules.sql
  - supabase/migrations/20260720000200_seed_vaccine_schedules.sql
  - supabase/migrations/20260720000300_seed_vaccine_schedules_sbim.sql
  - supabase/migrations/20260720000400_seed_vaccine_schedules_gestante.sql
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
resolved:
  - CR-01
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-07-19
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Reviewed the vaccine reference calendar phase: a read-only global dataset (schedules + items), the patient-aware route, the age-band highlight engine, and the calendar UI.

The security posture is sound. The deliberate D-07 divergence (global reference data, no `profile_id`, global-read RLS `using (true)`, no write policies) is applied consistently and is NOT flagged. The owned `patients` read at the entry point is correctly scoped via `getPatientById(supabase, id, profile.id)` (IDOR guard T-05-05 holds — a foreign id resolves to `null`). Auth + paid gate is present. No SQL injection surface (parameterized seeds/queries), no client-reachable write path to the reference tables.

The one blocker is a correctness bug: the corrected-age input for preterm infants is threaded all the way through the call chain but silently ignored by the highlight, so a preterm child's "Idade atual" band is computed from chronological age. The rest are robustness/quality issues around error fallback, band-overlap resolution, and a missing DB uniqueness guard behind `.maybeSingle()`.

## Critical Issues

### CR-01: Corrected age is threaded through but never applied to the highlight (preterm infants highlight the wrong band)

**Status:** ✅ RESOLVED (fix commit `8f4a4d7`, RED test `222408c`)
**Resolution:** Physician decision was to FIX (keep corrected-age support, position-only).
`compute-pediatric-age.ts` now exposes `corrected.totalDays` (the corrected days
the engine already computes), and `computeCurrentMonths` prefers
`age.corrected?.totalDays ?? age.totalDays`. A preterm infant now highlights the
corrected band; term infants / no gestational age fall back to chronological.
The `gestationalAgeWeeks` plumbing (page → VaccineCalendarView) is now live-effect.
Covered by `lib/vaccine-current-band.spec.ts` (preterm-wins + term-fallback cases).
Remains position-only — no dose-diff/pending logic (D-11, Phase 6).

**File:** `lib/vaccine-current-band.ts:19-22`, `components/dashboard/vaccines/vaccine-calendar-view.tsx:55-59`
**Issue:**
The route reads `gestational_age_weeks` and passes it to `VaccineCalendarView`, which forwards it to `computePediatricAge(birthDate, new Date(), gestationalAgeWeeks)`. The intent (see the prop JSDoc "Corrected-age input for preterm infants") is that the highlight respects the corrected age. But `computeCurrentMonths` derives months from `age.totalDays`:

```ts
return Math.floor((age.totalDays ?? 0) / AVG_DAYS_PER_MONTH)
```

`computePediatricAge` only ever sets `totalDays` to the **chronological** value (`differenceInDays(today, birth)`, compute-pediatric-age.ts:163-166). The prematurity correction is stored on a *separate* field, `result.corrected` (compute-pediatric-age.ts:184-189), which `computeCurrentMonths` never reads. Net effect: passing `gestationalAgeWeeks` has zero impact on the highlight — a 40-week-chronological / ~32-week-corrected preterm infant is highlighted on the 40-week (chronological) band instead of the corrected band.

This is a real behavioral defect: the feature advertises corrected-age support (the prop exists specifically for it) and delivers chronological age. The whole `gestationalAgeWeeks` plumbing (page.tsx:66 → view:35,57) is dead-effect today.

**Fix:** Either (a) derive `totalDays` from the corrected band when present, or (b) make the projection explicit. Cleanest is to compute corrected total days in `computeCurrentMonths` and prefer it when the child is still inside the corrected-age window:

```ts
export function computeCurrentMonths(age: PediatricAge): number | null {
  if (age.status !== "ok") return null
  // Prefer corrected age for preterm infants while still within the
  // corrected-age window (D-10) so the highlight matches the child's
  // physiologic age. Fall back to chronological when no correction applies.
  const days = age.corrected?.totalDays ?? age.totalDays ?? 0
  return Math.floor(days / AVG_DAYS_PER_MONTH)
}
```
Note `age.corrected` currently exposes `band`/`parts`/`appliesUntilMonths` but not `totalDays` — either add `totalDays` to the `corrected` shape in `compute-pediatric-age.ts`, or recompute months from `corrected.parts`. If corrected age is explicitly OUT of scope for this phase (position-only, Phase 6 owns the rest), then **remove the `gestationalAgeWeeks` prop and the `page.tsx` plumbing** so the code does not claim a capability it does not have. Do not ship the current half-wired state.

## Warnings

### WR-01: A Supabase read error surfaces as an unhandled page crash instead of the designed empty state

**File:** `app/dashboard/vaccines/page.tsx:35-39,60-81`, `modules/vaccines/get-vaccine-schedule-with-items.ts:30-34`
**Issue:**
The module returns `null` for unseeded data but `throw`s a `[VACCINES]` error on any Supabase failure. The page only guards the `null` case (`sus || sbim || gestante` → "Calendário indisponível"). Because the three reads run in `Promise.all`, a single transient DB error rejects the whole promise and the render throws. There is no `error.tsx` boundary under `app/dashboard/`, so the user gets a generic crash rather than the intended graceful fallback that this exact card was designed to provide.
**Fix:** Add an `app/dashboard/vaccines/error.tsx` boundary, or wrap the reads so a fetch failure degrades to `null` (same path as unseeded). Example:

```ts
const settle = async (p: Promise<VaccineScheduleWithItems | null>) =>
  p.catch(() => null)
const [sus, sbim, gestante] = await Promise.all([
  settle(getVaccineScheduleWithItems(supabase, "SUS")),
  settle(getVaccineScheduleWithItems(supabase, "SBIm")),
  settle(getVaccineScheduleWithItems(supabase, "gestante")),
])
```

### WR-02: `.maybeSingle()` will throw if two rows ever share a `source` — no DB uniqueness guard

**File:** `modules/vaccines/get-vaccine-schedule-with-items.ts:23-28`, `supabase/migrations/20260720000000_vaccine_schedules.sql:9-17`
**Issue:**
The read filters only `.eq("source", source)` and calls `.maybeSingle()`, which errors ("multiple rows returned") if more than one row matches. The seed is idempotent on `source + version`, but nothing at the schema level prevents a second `version` of the same `source` (e.g. a future "PNI 2026" alongside "PNI 2025"). The moment a second version lands, every read for that source throws — and per WR-01 that crashes the page. The invariant "one row per source" is assumed by the query but not enforced by the table.
**Fix:** Either add a partial/unique constraint if one-active-per-source is the true invariant, or make the read version-aware and deterministic (e.g. `.order("effective_date", { ascending: false }).limit(1).maybeSingle()`), or select the current version explicitly. Given the schema comment implies multiple versions are expected over time, prefer selecting the latest effective version rather than relying on there being exactly one row.

### WR-03: Overlapping bands make the "same band in both columns" invariant break for wide windows

**File:** `components/dashboard/vaccines/vaccine-calendar-view.tsx:146-160`, `supabase/migrations/20260720000300_seed_vaccine_schedules_sbim.sql:51`
**Issue:**
`resolveCurrentBandLabel` returns the *first* item (in `sort_order`) whose window contains `currentMonths`, then highlights that single `age_label` in both columns. The SBIm dataset has a wide window — Influenza `age_months=6, age_months_max=72` ("6 meses a 5 anos", sort_order 54) — that overlaps every discrete band from 6 to 60 months. For a 12-month-old, when SUS is present it matches the SUS `12 meses` item first (SUS is scanned first) so it works; but the resolution depends entirely on scan order across datasets, not on which band is *most specific*. If SUS were absent/unseeded, the same child would highlight "6 meses a 5 anos" instead of "12 meses", and SUS-only children older than the last SUS band highlight nothing while SBIm highlights the wide influenza band — so the two columns emphasize different (or no) bands, contradicting the documented "SAME band emphasized in both columns" contract.
**Fix:** Prefer the most-specific (narrowest window) matching band rather than the first by sort order, and resolve the band label once from the union rather than per-dataset scan order. For example, collect all matching items across datasets and pick the one with the smallest `(age_months_max ?? age_months) - age_months` span (ties broken by `sort_order`). At minimum, document that wide windows are intentionally lower-priority and add a test covering the SBIm-only / no-SUS-match case.

### WR-04: `computeOrderedBands` collapses distinct age windows that share an `age_label`, and cross-dataset `sort_order` collisions are order-dependent

**File:** `components/dashboard/vaccines/vaccine-calendar-view.tsx:120-136`
**Issue:**
Bands are keyed purely by `age_label` string. Two datasets can legitimately use the same label for different windows (e.g. one dataset's "12 meses" is a single point, another's "12–15 meses" differs), and the union keeps only the smallest `sort_order` seen. Because SUS and SBIm use *different* `sort_order` numbering (SUS `12 meses`=70..72; SBIm `12–15 meses`=60..62, `12 meses`=63), the merged ordering is driven by whichever dataset happens to assign the lower number, not by actual age. This produces a correct-looking but fragile ordering that silently reorders if seed `sort_order` values are ever edited independently per dataset. Today the values line up by luck of authoring, not by construction.
**Fix:** Order the union by a robust age key (`age_months ?? derived-from-label`) with `sort_order` only as a tiebreaker, or document that the two datasets MUST keep a globally consistent `sort_order` numbering scheme and add a test asserting the merged order is ascending by `age_months`.

## Info

### IN-01: `parseEffectiveDate` accepts the fallback silently on malformed dates

**File:** `components/dashboard/vaccines/schedule-provenance.tsx:22-25,39-45`
**Issue:** When `effective_date` fails the `YYYY-MM-DD` regex, `vigencia` falls back to the raw string. Since the column is a NOT NULL `date`, this path is effectively unreachable from the DB, but the fallback renders an unformatted ISO string to the user if it ever fires. Minor.
**Fix:** Acceptable as a defensive fallback; consider rendering an em dash or "vigência não informada" instead of the raw ISO string for consistency with the PT-BR UI.

### IN-02: `age_months_max`/`week_max` casts rely on per-file `::integer`, easy to forget on future seed additions

**File:** `supabase/migrations/20260720000200_seed_vaccine_schedules.sql:33`, `...0300...:25`, `...0400...:29`
**Issue:** Each seed re-derives the `age_months_max::integer` / `week_min::integer` cast to work around Postgres inferring `text` from all-null `VALUES` columns (documented lesson from 05-01). This is correct but repeated, so a new seed author who omits the cast reintroduces the `42804` failure. Not a bug in current code.
**Fix:** Consider a short comment template or a helper note in the phase patterns doc so future seeds inherit the cast. No code change required here.

### IN-03: `resolveCurrentBandLabel` and `computeOrderedBands` are untested at the module boundary

**File:** `components/dashboard/vaccines/vaccine-calendar-view.tsx:120-160`
**Issue:** The two pure helpers that own the cross-dataset alignment and current-band resolution (the logic behind WR-03/WR-04) live inline in a client component and have no unit tests, while the simpler `isBandCurrent`/`computeCurrentMonths` primitives are well covered. The riskier composition logic is the untested part.
**Fix:** Extract `resolveCurrentBandLabel` and `computeOrderedBands` into `lib/` (or a testable module) and add cases for overlapping windows, SBIm-only children, and same-label/different-window collisions.

---

_Reviewed: 2026-07-19_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
