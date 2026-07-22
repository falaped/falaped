---
phase: 06-disponibilidade-calend-rio-do-m-dico
reviewed: 2026-07-22T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - actions/availability/save-availability.ts
  - app/dashboard/agenda/page.tsx
  - components/dashboard/agenda/availability-cell-menu.tsx
  - components/dashboard/agenda/calendar-day-week-grid.tsx
  - components/dashboard/agenda/calendar-editor.tsx
  - components/dashboard/agenda/calendar-month-indicator.tsx
  - components/ui/context-menu.tsx
  - lib/expand-availability.ts
  - lib/expand-availability.spec.ts
  - lib/schemas/availability.ts
  - modules/availability/create-availability-override.ts
  - modules/availability/delete-availability-override.ts
  - modules/availability/list-availability-overrides.ts
  - modules/availability/types.ts
  - supabase/migrations/20260722000000_availability_overrides_hybrid.sql
findings:
  critical: 2
  warning: 6
  info: 3
  total: 11
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-07-22T00:00:00Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Reviewed the v2 redesign of the availability/calendar feature: the batch-save action, the hybrid slot-expansion function, the Zod schema, the migration, and the client CalendarEditor / grid / menu.

The server-side pure core (`expand-availability.ts`), the Zod schema, and the module ownership scoping are largely solid: precedence (template → additive union → subtractive-wins) is correct, half-open intervals are respected, the DST-safe wall-clock helper works for the fixed clinic zone, and delete is double-scoped by `profile_id + id`.

However, there are two BLOCKERs. The most severe is a **timezone-parsing bug in the client `weekdayOf` helper** that makes the client and server disagree on which weekday a calendar date belongs to whenever the host TZ differs from the clinic TZ — which is exactly the production case (Vercel host = UTC, clinic = America/Sao_Paulo). This silently maps every recurring band to the wrong weekday. The second is that `saveAvailabilityAction` performs a multi-step, non-transactional reconcile that can leave the doctor's schedule half-written on any mid-flight failure.

## Critical Issues

### CR-01: Client `weekdayOf` parses the date string in the HOST timezone, not the clinic zone — wrong weekday on Vercel

**File:** `components/dashboard/agenda/calendar-editor.tsx:193-195`
**Issue:**
```ts
function weekdayOf(localDate: string, timeZone: string): number {
  return new TZDate(new Date(`${localDate}T00:00:00`), timeZone).getDay()
}
```
`new Date("2026-07-20T00:00:00")` (no offset/`Z`) is parsed in the **host process** timezone. On Vercel the host is UTC, so this becomes the instant `2026-07-20T00:00:00Z`. Converting that instant into `America/Sao_Paulo` (UTC-3) yields `2026-07-19 21:00` — the **previous day**, and therefore potentially the previous weekday. Verified: `weekdayOf("2026-07-20", "America/Sao_Paulo")` returns `0` (Sunday) instead of the correct `1` (Monday) when the host is UTC.

This helper is the single source of weekday for the entire client editor: `cellStateOf` (rendering the template), `addRecurringPeriod` (writing `rulePainted`), `clearAvailabilityForDates`, and — most damaging — `computeDiff` implicitly via `rulePainted` keys. The server `expandAvailability` uses the correct `new TZDate(day, timeZone).getDay()` on a zone-anchored `day`, so **server and client will disagree about which weekday a painted band belongs to**. A band painted on a Monday cell can be persisted/rendered as Sunday, corrupting the recurring template. This is silent (no error) and TZ-dependent, so it will not reproduce on a developer machine set to America/Sao_Paulo but will misbehave in production.

**Fix:** Derive the weekday from the date components directly, or anchor via `TZDate.tz` instead of parsing a bare string in host time:
```ts
function weekdayOf(localDate: string, timeZone: string): number {
  const [y, m, d] = localDate.split("-").map(Number)
  // Anchor at clinic-zone midday to avoid any DST/offset edge at midnight,
  // constructing the instant directly in the named zone.
  return new TZDate(y, m - 1, d, 12, 0, 0, timeZone).getDay()
}
```
`handleCellMenu` (line 458) has the identical bug with `format(new TZDate(new Date(\`${localDate}T00:00:00\`), timeZone), "EEEE", ...)` for the weekday label — fix both call sites with the same anchoring approach.

### CR-02: `saveAvailabilityAction` reconcile is non-transactional — a mid-flight failure leaves the schedule half-written

**File:** `actions/availability/save-availability.ts:49-71`
**Issue:** The reconcile runs three independent Supabase round-trips with no transaction:
1. `upsertAvailabilityRules` — internally does a `delete` then an `insert` (see `modules/availability/upsert-availability-rules.ts`), itself non-atomic.
2. a loop of `createAvailabilityOverride` inserts.
3. a loop of `deleteAvailabilityOverride` deletes.

If step 1's insert fails after its delete (e.g. a CHECK-constraint violation because a client band slipped past validation, or a transient network error), the doctor's **entire recurring grid is wiped with nothing inserted**. If step 2 fails on override N, some overrides are created and the old ones (step 3) are never removed, producing duplicated/merged availability. There is no rollback and no idempotency key, so a retry re-inserts duplicates. `computeDiff` also sends `overridesRemove = overrides.map(ov => ({ id: ov.id }))` (calendar-editor.tsx:597) — i.e. *remove every existing override and re-add the full draft* — so a partial failure here is a full-state corruption, not a small delta.

**Fix:** Wrap the whole reconcile in a single Postgres transaction so it is all-or-nothing. Since supabase-js has no client-side transaction, move the reconcile into a Postgres function (RPC) that does `delete rules / insert rules / delete overrides / insert overrides` atomically, scoped by `profile_id`, and call it once:
```ts
const { error } = await supabase.rpc("reconcile_availability", {
  p_profile_id: profile.id,
  p_rules: parsed.data.rules,
  p_overrides: parsed.data.overridesAdd,
})
if (error) return { ok: false, error: "Não foi possível salvar a disponibilidade." }
```
The `overridesRemove` list becomes unnecessary because the RPC deletes-all-then-inserts inside the transaction. At minimum, if an RPC is out of scope, reorder so inserts happen before the destructive rule delete and document the non-atomicity as accepted risk — but the delete-then-insert inside `upsertAvailabilityRules` cannot be made safe without a transaction.

## Warnings

### WR-01: Per-band custom slot duration is silently lost when band boundaries shift

**File:** `components/dashboard/agenda/calendar-editor.tsx:548`
**Issue:** `computeDiff` looks up the duration with `draft.ruleDurations[\`${weekday}:${band.start}\`] ?? slotMinutes`. `ruleDurations` is keyed by the band's *original* start minute (set in `buildInitialDraft` and `addRecurringPeriod`). But `band.start` here comes from `bandsFromMinutes`, which recomputes contiguous runs from `rulePainted`. If a doctor extends/merges an existing band (or paints an adjacent band that fuses), the merged band's `start` no longer matches the key where the duration was stored, so the lookup misses and silently falls back to the default 30 min — discarding the doctor's chosen 15/20/60-min duration (D-09). The custom duration is lost with no warning.
**Fix:** Store duration per painted cell (e.g. `ruleDurations` keyed by `"weekday:minute"` for every minute in the band) or, when emitting a band, resolve the duration from any stored key whose range overlaps `[band.start, band.end)`, rather than requiring an exact `band.start` match.

### WR-02: Full-day folga round-trips as an explicit `[0,1440)` partial subtract, drifting DB representation

**File:** `components/dashboard/agenda/calendar-editor.tsx:149-162, 566-593`
**Issue:** `buildInitialDraft` expands a stored full-day block (`start_minute === null`) into `subtractCells` covering `0..DAY_END`. On save, `computeDiff`'s `groupByDate` re-emits that as a partial subtract override `{ start_minute: 0, end_minute: 1440, slot_minutes: null }` instead of the canonical full-day `{ start_minute: null, end_minute: null }`. Functionally the day is still fully blocked (the partial range covers the whole day), but: (a) the DB representation silently changes on every save, (b) in `expandAvailability` a `[0,1440)` partial subtract takes the `subtractPartial` path, so when it removes all slots the day gets **no `byDay` entry at all** (line 253 `continue`), whereas a true full-day block writes `byDay[date] = { freeSlotCount: 0, hasAvailability: false }` (line 200). The month indicator treats "no entry" and "explicit zero" identically for now, so this is latent, but it defeats the full-day semantics the schema/migration deliberately model.
**Fix:** In `computeDiff`, detect a subtract band that spans the full day (`start === 0 && end === DAY_END`, or a marker set that the whole day was cleared) and emit `{ start_minute: null, end_minute: null }` so the canonical full-day representation is preserved.

### WR-03: `wallClock` collapses distinct wall-clock slots during a DST spring-forward gap (generic-zone hazard)

**File:** `lib/expand-availability.ts:86-95`
**Issue:** During a spring-forward transition, invalid wall-clock times are normalized. Verified in `America/New_York` on 2026-03-08: `wallClock(day, 120)` (02:00) and `wallClock(day, 180)` (03:00) both resolve to `07:00:00Z`. Because candidates are deduped by `start.getTime()` (line 249), two genuinely distinct wall-clock bands that straddle the gap collapse into one, and a slot like 02:30–03:00 can produce `end (07:00Z) < start (07:30Z)` — an inverted interval. The fixed clinic zone (America/Sao_Paulo, no DST since 2019) is not affected in production, but the function is documented and tested as timezone-agnostic (the NY DST test only exercises 08:00–12:00, safely past the 02:00–03:00 gap), so a future reuse in a DST zone would silently misbehave.
**Fix:** Either document that only non-gap wall-clock ranges are supported, or detect the invalid-time normalization (compare the resulting local hour/minute back against the requested `minuteOfDay`) and skip slots whose start falls in a spring-forward gap.

### WR-04: `end_minute` in the rule schema has no lower bound; a negative/zero end only caught by the cross-field refine

**File:** `lib/schemas/availability.ts:50-54, 92-97`
**Issue:** `start_minute` has `.min(0)` but `end_minute` (in both `availabilityRuleSchema` and `createAvailabilityOverrideSchema`) has only `.max(MINUTE_CEILING)` and the multiple-of-30 refine — no `.min(0)`. A negative `end_minute` (e.g. `-30`) passes the field-level checks; it is only rejected by the `end_minute > start_minute` refine. That refine works for the common case, but the missing floor is an inconsistency that weakens defense-in-depth and produces a less specific error message. The DB `availability_rules_minute_ceiling` CHECK (migration line 87-89) also only bounds the ceiling (`<= 1440`), not a floor, so a negative end could reach the table if the refine is ever restructured.
**Fix:** Add `.min(0, "O horário final não pode ser negativo.")` to every `end_minute` and mirror it in the DB CHECK (`start_minute >= 0 and end_minute >= 0`).

### WR-05: `beforeunload` guard uses deprecated `returnValue` only and can flag "unsaved" spuriously after full-day folga normalization

**File:** `components/dashboard/agenda/calendar-editor.tsx:272-281, 602-615`
**Issue:** Two coupled problems. (1) After a successful save, `setSavedDraft(cloneDraft(draft))` snapshots `draft`, but because of WR-02 the *reloaded* server state (full-day null) re-expands to a different `subtractCells` shape than the just-saved draft; on the next page load the draft and a freshly-derived baseline can differ, so `isDirty` can read true immediately after a reload with no user edits, arming the `beforeunload` prompt spuriously. (2) The handler sets only `event.returnValue = ""` alongside `preventDefault()`; this is fine on modern browsers but the empty string is the deprecated path — acceptable, noted for consistency. The primary concern is (1), which stems from the representation drift in WR-02.
**Fix:** Fix WR-02 so the save round-trip is representation-stable; then `savedDraft` and a reload-derived baseline match and `isDirty` is accurate.

### WR-06: `overridesRemove` re-sends every existing override id on each save — O(n) deletes and a widening race window

**File:** `components/dashboard/agenda/calendar-editor.tsx:597`; `actions/availability/save-availability.ts:66-68`
**Issue:** `computeDiff` unconditionally removes all currently-loaded overrides and re-adds the entire draft, rather than computing an actual add/remove delta. Combined with CR-02's non-transactional execution, this maximizes the blast radius of any partial failure (the whole override set is in flight every save) and means a second tab / concurrent save that added an override between page load and this save will have that override deleted (last-writer-wins with no detection). `removedOverrideIds` (line 229) is declared and `.clear()`-ed (line 611) but never read — dead state that suggests the intended delta-based design was abandoned.
**Fix:** Compute a real delta (ids present at load but absent from the draft → remove; new draft ranges → add) and/or move to the transactional RPC in CR-02, which sidesteps id bookkeeping entirely. Remove the unused `removedOverrideIds` ref.

## Info

### IN-01: Dead / unused state and imports

**File:** `components/dashboard/agenda/calendar-editor.tsx:229, 611`
**Issue:** `removedOverrideIds` ref is written (`.clear()`) but never read anywhere; it is dead state (see WR-06). `slotMinutes` is a `useState` whose setter is never used (line 238) — could be a plain constant.
**Fix:** Delete `removedOverrideIds`; convert `slotMinutes` to `const slotMinutes = DEFAULT_SLOT`.

### IN-02: `app/dashboard/agenda/page.tsx` computes a server-side expansion and discards it

**File:** `app/dashboard/agenda/page.tsx:68-73`
**Issue:** `expandAvailability({...})` is called for the default week window but its return value is never assigned or used; the client re-expands from the raw rows. The call is pure and side-effect-free, so it is wasted work (and misleading — the comment says "Expansão SERVER-SIDE da semana default").
**Fix:** Remove the dead call, or actually pass its result to the client as the initial week render if server-side expansion is intended.

### IN-03: `context-menu.tsx` is a full shadcn primitive but the feature uses a Popover instead

**File:** `components/ui/context-menu.tsx` (whole file); `components/dashboard/agenda/availability-cell-menu.tsx:76-89`
**Issue:** `availability-cell-menu.tsx` documents that it deliberately does NOT use `ContextMenu` (radix only opens on right-click and lacks controllable `open`/anchor) and reimplements on `Popover`. The `context-menu.tsx` primitive appears unused by this feature. Not a defect, but confirm no orphaned import path was introduced; if `context-menu.tsx` is unused project-wide it is dead code.
**Fix:** Verify usages of `components/ui/context-menu` across the repo; remove if fully unused, otherwise no action.

---

_Reviewed: 2026-07-22T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
