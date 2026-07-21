---
phase: 06-disponibilidade-calend-rio-do-m-dico
reviewed: 2026-07-21T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - actions/availability/create-availability-exception.ts
  - actions/availability/delete-availability-exception.ts
  - actions/availability/index.ts
  - actions/availability/save-availability-rules.ts
  - actions/index.ts
  - app/dashboard/agenda/page.tsx
  - components/app-sidebar.tsx
  - components/dashboard/agenda/agenda-view.tsx
  - components/dashboard/agenda/availability-grid.tsx
  - components/dashboard/agenda/exception-dialog.tsx
  - lib/clinic-timezone.ts
  - lib/expand-availability.spec.ts
  - lib/expand-availability.ts
  - lib/schemas/availability.ts
  - modules/availability/create-availability-exception.ts
  - modules/availability/delete-availability-exception.ts
  - modules/availability/list-availability-exceptions.ts
  - modules/availability/list-availability-rules.ts
  - modules/availability/types.ts
  - modules/availability/upsert-availability-rules.ts
  - supabase/migrations/20260721000100_availability_rules.sql
  - supabase/migrations/20260721000200_availability_exceptions.sql
findings:
  critical: 0
  warning: 5
  info: 4
  total: 9
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-07-21
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

The availability slice is well-structured and adheres closely to project conventions: every action calls `getAuthenticatedUser` + gates on `profile.status === "paid"`, validates with Zod `safeParse`, and returns discriminated result unions; modules receive `SupabaseClient` by injection, never import `next/cache`/`next/headers`, and throw `[AVAILABILITY]`-tagged errors; all queries are scoped by `profile_id`. RLS is correctly enabled with all four policies created in the same migration, mirroring `patient_vaccine_doses`, using the established `profiles.auth_user_id = auth.uid()` ownership anchor. The pure `expandAvailability` function is genuinely pure/deterministic and has a strong spec suite covering the documented decisions (D-02/04/07/09/10/11).

No BLOCKER-level defects were found. However, there are several correctness and robustness gaps worth fixing: a latent DST bug in slot expansion (currently masked by the fixed no-DST zone), a loose date validation that accepts non-ISO formats at a trust boundary, a data-integrity gap where the DB and schema permit rules exceeding 24h (`end_minute` has no upper bound), and a UI reachability gap for full-block-until-midnight exceptions. There is also a stale/misleading claim in a module docstring, and dead code paths.

## Warnings

### WR-01: DST-unsafe slot arithmetic in `expandAvailability` (latent, masked by fixed zone)

**File:** `lib/expand-availability.ts:120-131`
**Issue:** Slot boundaries are computed as `addMinutes(startOfDay(day), band.startMinute)` etc. `addMinutes` adds *absolute* minutes, not wall-clock minutes. On a DST transition day this drifts: verified empirically that in `America/New_York`, `addMinutes(startOfDay(2026-03-08), 480)` yields `09:00` local (spring-forward), not the intended `08:00`. This means on DST-transition days every slot after the transition is shifted by one hour, and `localDate`/`localMinuteOf` downstream would render slots in the wrong grid rows. The function is explicitly documented as timezone-agnostic ("recebe `window` e `timeZone` por parâmetro") and the spec asserts it "holds identically under TZ=UTC and TZ=America/New_York" — so the contract is broader than the current single fixed zone. It is only *masked* today because `CLINIC_TIME_ZONE = "America/Sao_Paulo"` has had no DST since 2019 and all inputs are 2026 dates.
**Fix:** Build each wall-clock boundary directly in the zone instead of adding minutes to `startOfDay`. E.g. derive hours/minutes from the band minute and construct a `TZDate` for that local wall-clock time, or use `setHours`/`setMinutes` with the tz context so the zone re-resolves the offset. At minimum, add a spec that runs a band across a real DST-transition day in a DST zone (e.g. `America/New_York`, 2026-03-08) and assert local minutes are preserved — the current suite would not catch this.

### WR-02: `exception_date` validation accepts non-ISO / ambiguous date formats at the action boundary

**File:** `lib/schemas/availability.ts:47-53`
**Issue:** `exception_date` is validated only with `.refine((v) => !Number.isNaN(Date.parse(v)))`. `Date.parse` is lenient and locale/engine-dependent: it accepts `"07/21/2026"` (US M/D/Y) and `"2026-7-1"` (unpadded) as valid (verified). Actions are a public trust boundary (the client `toIsoDate` always sends `YYYY-MM-DD`, but a crafted call need not). A value like `"07/21/2026"` passes Zod and is inserted straight into the Postgres `date` column, where it may be interpreted with a different day/month than the physician intended, silently corrupting which calendar day is blocked off. The column comment states the date is "fuso fixo da clínica" but nothing enforces the canonical wire format.
**Fix:** Constrain to strict ISO calendar date, e.g. `z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data da exceção inválida.")` and additionally verify it is a real date (reject `2026-02-30`). This mirrors the tight CHECK constraints already applied to the minute fields.

### WR-03: `end_minute` has no upper bound in schema or DB — rules/exceptions can exceed 24h

**File:** `lib/schemas/availability.ts:25-28`, `supabase/migrations/20260721000100_availability_rules.sql:27-29`, `supabase/migrations/20260721000200_availability_exceptions.sql:22-30`
**Issue:** `end_minute` (and `start_minute`) are validated only as `int`, multiple of 30, and `end > start`; there is no `max`. The DB CHECKs likewise only enforce `> start`, `% 30 = 0`, and `between 0 and 6` for weekday — no ceiling on minutes. A rule with `start_minute: 0, end_minute: 3000` (50h) passes both Zod and the DB. `expandAvailability` would then emit slots on the intended day up to `bandEnd = startOfDay + 3000min`, i.e. spilling ~26h past midnight into the next calendar day, but all tagged with the original `localDate` — producing slots whose `localDate` disagrees with their actual local day, and inflating `freeSlotCount`. `smallint` tolerates these values (max 32767), so there is no DB-level backstop.
**Fix:** Add `.max(1440, ...)` to `start_minute`/`end_minute` in the schema (and `<= 24*60` for exceptions) and mirror with DB CHECKs `start_minute <= 1440 and end_minute <= 1440`. Decide and document whether the max-inclusive value is `1440` (24:00 end) or `1410`.

### WR-04: Full-day-until-midnight partial exception is unreachable from the UI but permitted everywhere else

**File:** `components/dashboard/agenda/exception-dialog.tsx:62`
**Issue:** `TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => i * 30)` produces 00:00–23:30 (max 1410). The end-time Select therefore cannot express "block from X until end of day" (24:00 = 1440), yet the spec/tests (`expand-availability.spec.ts:144`) explicitly model `endMinute: 24*60` as the canonical "saio 16:00 até o fim do dia" case, and `expandAvailability` relies on it. A physician who wants to leave mid-afternoon and block the rest of the day cannot do so via the partial-block UI; they can only pick an end no later than 23:30, leaving a 23:30–24:00 slot un-blocked if one exists.
**Fix:** Either add a `24:00` option to the end-time Select (label it distinctly, e.g. "24:00 (fim do dia)") or document that "Dia inteiro" is the intended path and confirm no band can produce a 23:30 slot. Keep UI, schema, and DB bounds consistent with the WR-03 decision.

### WR-05: Misleading docstring claims RLS handles UPDATE for a delete-then-insert table; unused UPDATE policy

**File:** `modules/availability/delete-availability-exception.ts:6` (comment) and `supabase/migrations/20260721000100_availability_rules.sql:73-84`
**Issue:** Two related doc/consistency issues. (1) The `save-availability-rules` flow is strictly delete-then-insert (`upsert-availability-rules.ts`), and exceptions are only ever created/deleted (no update action exists). The `UPDATE` RLS policies on both tables are therefore dead — never exercised by any code path. This is not a security hole (they are correctly owner-scoped), but it is unused surface that can drift. (2) The delete-exception docstring's IDOR reasoning is correct, but no automated test asserts the double-scope (`profile_id` AND `id`) behavior; the ownership backstop is documented but unverified.
**Fix:** Either drop the unused `UPDATE` policies (they can be re-added when an update path lands) or add a comment noting they are intentionally forward-looking. Add a module/integration test asserting that deleting another profile's exception id is a no-op (0 rows affected, no throw), locking in the D-13 backstop.

## Info

### IN-01: Duplicate/redundant "Agenda" label in sidebar nav group

**File:** `components/app-sidebar.tsx:57-62`
**Issue:** The "Agenda" group has a single child also titled "Agenda" pointing at the same section, producing a collapsible group whose only item repeats the group name. Every other group has multiple distinct children. This is a minor UX redundancy.
**Fix:** Either promote "Agenda" to a direct (non-collapsible) menu item, or add the sibling views (e.g. future "Consultas") so the group earns its nesting.

### IN-02: `isNavItemActive` uses `startsWith(url)` — prefix collision risk for future routes

**File:** `components/app-sidebar.tsx:103`
**Issue:** The fallback `pathname.startsWith(url)` will mark `/dashboard/agenda-foo` (hypothetical) as active for `/dashboard/agenda`. Not a bug today (no colliding routes), but a latent correctness trap as routes grow — `/dashboard/prescriptions` vs `/dashboard/prescriptions/new?mode=blank` already share a prefix and both would light up.
**Fix:** Match on exact path or `pathname === url || pathname.startsWith(url + "/")`, as already done specially for `/dashboard/cases`.

### IN-03: `formatExceptionDate` silently defaults malformed dates to month 1 / day 1

**File:** `components/dashboard/agenda/exception-dialog.tsx:65-69`
**Issue:** `const [year, month, day] = isoDate.split("-").map(Number)` with `(month ?? 1)` / `(day ?? 1)` fallbacks means a malformed stored value (e.g. missing parts) renders as a plausible-but-wrong date rather than an obvious error. Given WR-02 allows non-ISO dates through the action, a value could reach here that formats misleadingly. Display-only, but masks upstream corruption.
**Fix:** Once WR-02 tightens the write path this is moot; otherwise guard and render a neutral placeholder on parse failure instead of coercing to Jan 1.

### IN-04: Redundant re-wrap `new TZDate(day, timeZone)` when `day` is already zoned

**File:** `lib/expand-availability.ts:98`
**Issue:** `day` comes from `eachDayOfInterval(..., context)` and is already a zoned instance; `new TZDate(day, timeZone).getDay()` re-wraps it. Harmless (produces the correct zoned weekday) but slightly obscures intent and duplicates the tz application already carried by `context`.
**Fix:** Prefer `getDay(day, context)` from date-fns, or add a one-line comment that the re-wrap is intentional to read the weekday in-zone.

---

_Reviewed: 2026-07-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
