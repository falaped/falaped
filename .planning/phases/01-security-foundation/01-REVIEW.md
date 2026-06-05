---
phase: 01-security-foundation
reviewed: 2026-06-05T00:00:00Z
depth: standard
files_reviewed: 27
files_reviewed_list:
  - .github/workflows/ci.yml
  - actions/medical-certificates/delete-medical-certificate.ts
  - actions/medical-certificates/delete-medical-certificates-bulk.ts
  - actions/prescriptions/delete-prescription.ts
  - actions/prescriptions/delete-prescriptions-bulk.ts
  - app/dashboard/layout.tsx
  - components/dashboard/cases/case-empty-state.tsx
  - components/dashboard/patients/patients-table.tsx
  - modules/falaped-assistant/handlers/chat-handler.ts
  - modules/falaped-assistant/handlers/review-guardian-alert-handler.ts
  - modules/falaped-assistant/handlers/suggest-guardian-questions-handler.ts
  - modules/falaped-assistant/lib/patient-profile-parsers.ts
  - modules/medical-certificates/delete-medical-certificate.spec.ts
  - modules/medical-certificates/delete-medical-certificate.ts
  - modules/medical-certificates/delete-medical-certificates-bulk.spec.ts
  - modules/medical-certificates/delete-medical-certificates-bulk.ts
  - modules/prescriptions/delete-prescription.spec.ts
  - modules/prescriptions/delete-prescription.ts
  - modules/prescriptions/delete-prescriptions-bulk.spec.ts
  - modules/prescriptions/delete-prescriptions-bulk.ts
  - supabase/docs/rls-reversals.sql
  - supabase/docs/run_prescriptions_manual.sql
  - supabase/migrations/20260604000000_rls_prescriptions.sql
  - supabase/migrations/20260604000001_rls_medical_certificates.sql
  - supabase/migrations/20260604000002_rls_patients.sql
  - supabase/migrations/20260604000003_rls_cases.sql
  - supabase/migrations/20260604000004_rls_auxiliary.sql
findings:
  critical: 1
  warning: 7
  info: 6
  total: 14
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-06-05T00:00:00Z
**Depth:** standard
**Files Reviewed:** 27
**Status:** issues_found

## Summary

Phase 01 closes a real IDOR (delete paths now scoped by `profile_id`, admin client removed) and lays down RLS across the public schema. The delete modules and migrations are generally well-constructed and the ownership-scoping logic is correct. However, the review surfaced one Critical correctness defect in the bulk-delete success-count semantics under RLS (which now actively masks failed/partial deletes), and several Warnings around storage-path handling that re-introduce a narrower form of the IDOR class the phase set out to kill.

No `<structural_findings>` block was provided, so all findings below are narrative. No `CLAUDE.md` or skills directory was found in the working tree; review applied general best practice plus the phase's stated security intent.

## Critical Issues

### CR-01: Bulk delete `deletedCount` over-reports and silently masks RLS/partial-delete failures

**File:** `modules/prescriptions/delete-prescriptions-bulk.ts:42` and `modules/medical-certificates/delete-medical-certificates-bulk.ts:44`

**Issue:** The function returns `count ?? ids.length`. With RLS now enabled, a bulk delete request can legitimately match **fewer rows than requested** (cross-profile ids, already-deleted rows, ids the RLS policy rejects). The delete call returns no `error` in those cases — it just deletes the subset the policy allows. The intent (per the file's own comment, "Unauthorized ids are silently skipped") is that `count` reflects the *actual* rows removed. But PostgREST returns `count: null` in several non-error conditions (e.g. when the prefer header/count negotiation does not yield an exact count, or on certain RLS-filtered responses). When `count` is `null`, the `?? ids.length` fallback reports that **every** requested id was deleted, even when zero rows were touched.

Concretely, this means:
- The UI optimistically hides all selected rows (`prescription-table.tsx:146-150` adds every `idToRemove` to `hiddenRowIds`) and shows "N receitas excluídas."
- A user (or an attacker probing another tenant's ids) gets a success toast and a row that disappears from view, while the row was never actually deleted. `router.refresh()` will bring it back, producing a confusing, trust-eroding "ghost delete," and — worse — a false confirmation that data was destroyed when it was not. For a medical-records app this is a data-integrity/auditability defect: the user believes a certificate/prescription is gone when it is not.

The single-row path (`delete-prescription.ts`) sidesteps this because it does not report a count, but the bulk path elevates an ambiguous DB signal into an affirmative "deleted" claim.

**Fix:** Do not fabricate a count. Treat `null` as unknown rather than "all":

```ts
const { error, count } = await supabase
  .from("prescriptions")
  .delete({ count: "exact" })
  .in("id", ids)
  .eq("profile_id", profileId)

if (error) {
  throw new Error(`[PRESCRIPTIONS] Bulk delete failed: ${error.message}`)
}

// count is authoritative under { count: "exact" }; null means "unknown", never "all"
return { deletedCount: count ?? 0 }
```

Then drive the optimistic UI hide off the actual `deletedCount` (or re-fetch) rather than off the locally-built `idsToRemove`, so the table never hides rows that were not removed. If a partial delete is possible, surface "N de M excluídos." Apply the same change to both bulk modules.

## Warnings

### WR-01: Bulk storage removal trusts client-supplied paths decoupled from the deleted ids

**File:** `actions/prescriptions/delete-prescriptions-bulk.ts:43-48`, `actions/medical-certificates/delete-medical-certificates-bulk.ts:43-48`, and the module `remove(paths)` calls (`modules/prescriptions/delete-prescriptions-bulk.ts:29-34`)

**Issue:** The action accepts `items: { id, pdfStoragePath }[]` straight from the client and forwards `pdfStoragePath` to `storage.remove(paths)` without any server-side verification that each path actually belongs to the row being deleted (or to the caller's profile). The DB delete is ownership-scoped, but the storage paths are an independent, attacker-controllable array. An authenticated user can submit `{ id: <their own id>, pdfStoragePath: "<otherProfileId>/secret.pdf" }` and attempt to delete another tenant's PDF. The only thing standing between this and a cross-tenant storage delete is the storage-bucket RLS policy (`(storage.foldername(name))[1] in (select id::text from profiles ...)`), which — if present and correct on every bucket — blocks it. That means the storage layer's RLS is now the *sole* control for an input the server forwards verbatim. This re-creates a narrow IDOR surface in the exact subsystem the phase was hardening; it should be defense-in-depth, not single-point.

**Fix:** Derive the storage paths server-side from the rows actually deleted (e.g. `.delete(...).select("pdf_storage_path")`), or at minimum validate each supplied path has the caller's `profile.id` as its first path segment before calling `remove`:

```ts
const ownedPrefix = `${profileId}/`
const paths = pdfStoragePaths.filter(
  (p): p is string => !!p?.trim() && p.startsWith(ownedPrefix),
)
```

### WR-02: Single-delete path forwards an unvalidated client storage path (same class as WR-01)

**File:** `actions/prescriptions/delete-prescription.ts:24`, `actions/medical-certificates/delete-medical-certificate.ts:24`, forwarded to `delete-prescription.ts:29-32`

**Issue:** `pdfStoragePath` is taken directly from the action argument and passed to `storage.remove([pdfStoragePath])` with no check that it belongs to `profileId`. Same reasoning as WR-01: even though the DB row delete is ownership-scoped, the storage path is independent and client-controlled, and the only guard is bucket RLS. Note this path also runs the storage removal even when the DB delete matched **zero** rows (a no-op because the row was not owned) — so an attacker can pass their own (non-existent / wrong) id together with a victim's PDF path and trigger only the storage removal attempt.

**Fix:** Validate the path prefix against `profileId` before removal, or fetch the stored path from the row during the delete and remove only that. At minimum, gate the storage removal on the DB delete having actually removed the row (see WR-03).

### WR-03: Single delete cannot distinguish "deleted" from "not owned / not found" — storage cleanup fires on no-op

**File:** `modules/prescriptions/delete-prescription.ts:16-32`, `modules/medical-certificates/delete-medical-certificate.ts:16-32`

**Issue:** The `.delete().eq().eq()` call requests no `count` and no `.select()`, so the function has no idea whether a row was actually removed. It then unconditionally proceeds to `storage.remove(pdfStoragePath)`. Combined with WR-02, this means a delete request for an id the caller does not own (0 rows affected) still issues a storage delete for whatever path the caller supplied. The action also returns `{ ok: true }` for a request that deleted nothing, telling the user the record was removed when it never existed / was not theirs.

**Fix:** Request the count and only attempt storage cleanup when a row was actually deleted:

```ts
const { error, count } = await supabase
  .from("prescriptions")
  .delete({ count: "exact" })
  .eq("id", prescriptionId)
  .eq("profile_id", profileId)

if (error) throw new Error(...)
if (!count) return // nothing owned/deleted — do not touch storage, do not claim success
```

### WR-04: `report_templates` UPDATE policy allows changing a row to another arbitrary owner via NULL `user_id`

**File:** `supabase/migrations/20260604000004_rls_auxiliary.sql:194-197`

**Issue:** The SELECT policy is `user_id = auth.uid() OR is_default = true`, so any authenticated user can *read* the shared default template (`user_id` NULL, `is_default` true). The UPDATE policy's `USING` clause is `user_id = auth.uid()`, which correctly blocks updating the shared default (NULL ≠ uid). That is fine. But verify the shared-default row is genuinely immutable to clients: because every authenticated user can SELECT it, any client code that issues an update without re-asserting ownership will silently no-op (good), but there is no explicit guard preventing a future INSERT of a second `is_default = true` row by a user — the INSERT `WITH CHECK (user_id = auth.uid())` permits a user to insert their own row with `is_default = true`, which would then be globally readable by every tenant via the SELECT policy. A user-authored row leaking into every other tenant's "default template" lookup (`get-default-report-template`) is a cross-tenant data-exposure path.

**Fix:** Constrain the INSERT/UPDATE `WITH CHECK` to forbid clients setting `is_default = true`, e.g. `with check (user_id = auth.uid() and coalesce(is_default, false) = false)`, and provision the single shared default via service_role/migration only.

### WR-05: `patients-table` navigation guard relies on a magic 450ms timer that can desync from real navigation

**File:** `components/dashboard/patients/patients-table.tsx:35-39`

**Issue:** `onRowOpenProfile` sets `rowNavigatingId`, calls `router.push`, then unconditionally clears the busy state after a hard-coded `450` ms via `window.setTimeout`. If navigation is slower than 450 ms (slow network, heavy target page) the row stops showing busy state while the app is still navigating; if the component unmounts before the timer fires, the timeout is never cleared (no cleanup), and `setRowNavigatingId` may run after unmount. The 450 is an unexplained magic number tuned to nothing in particular.

**Fix:** Clear the busy flag on actual navigation/unmount rather than a fixed timer — capture the timer id and clear it in a `useEffect` cleanup, or reset `rowNavigatingId` when `patients`/route changes. At minimum extract `450` into a named constant with a comment.

### WR-06: `run_prescriptions_manual.sql` duplicates schema/policy DDL that diverges from migrations with no single source of truth

**File:** `supabase/docs/run_prescriptions_manual.sql:1-78`

**Issue:** This doc file re-declares the `prescriptions` table, trigger, bucket, and four storage policies as copy-paste DDL meant to be run by hand in the SQL editor. It overlaps with (but is not generated from) the committed migrations, and uses bare `create policy` (not `create policy if not exists` / no drop guard) — re-running it after the migration has applied will error on duplicate policy names, and any future change to the real migration will silently drift from this doc. Hand-run DDL that diverges from migrations is a recurring source of prod/dev schema mismatch.

**Fix:** Either delete this file in favor of `supabase db push`, or clearly mark it as a frozen one-time bootstrap (with a header stating it must not be re-run and is not authoritative), and add `if not exists` / `drop policy if exists` guards so re-execution is idempotent.

### WR-07: `parseBloodTypeFromMessage` accepts impossible ABO groups and mis-parses ambiguous input

**File:** `modules/falaped-assistant/lib/patient-profile-parsers.ts:48-63`

**Issue:** The regexes `[aboab]{1,2}` / `[abio]{1,2}` followed by `replace(/[^ABO]/g, "")` and a `length >= 1 && length <= 2` check will accept clinically impossible blood groups (e.g. "AO", "BO", "OO", "OA") and write them straight into `updates.blood_type` for a patient medical record. There is no validation against the real ABO set (`A`, `B`, `AB`, `O`). For a medical app, persisting an invalid blood type into the patient profile is a data-quality defect with patient-safety implications.

**Fix:** Validate against an allow-list before accepting:

```ts
const ABO_GROUPS = new Set(["A", "B", "AB", "O"])
// ...
if (ABO_GROUPS.has(abo)) return `${abo}${rh}`
```

## Info

### IN-01: Empty/whitespace bulk-storage path filter differs subtly from intent

**File:** `modules/prescriptions/delete-prescriptions-bulk.ts:29`, `modules/medical-certificates/delete-medical-certificates-bulk.ts:31`

**Issue:** `pdfStoragePaths.filter((p): p is string => !!p?.trim())` keeps the original (possibly leading/trailing-whitespace) string, not the trimmed one, so a path like `" a/b.pdf"` passes the filter and is sent to storage with the whitespace intact. Likely harmless but inconsistent with the single-delete guard `pdfStoragePath?.trim()`.

**Fix:** Map to the trimmed value: `.map(p => p.trim()).filter(Boolean)` or filter then trim before `remove`.

### IN-02: `deletedCount` count semantics differ from per-id correlation — partial-delete UX

**File:** `components/dashboard/prescriptions/prescription-table.tsx:146-156` (and medical-certificate equivalent)

**Issue:** The UI hides every locally-selected id (`idsToRemove`) regardless of how many rows the server actually deleted, then shows `result.deletedCount`. When the two disagree (see CR-01), the rows hidden and the count shown contradict each other. Even after CR-01 is fixed, driving the hide off the local selection rather than the returned count leaves a UX inconsistency.

**Fix:** Hide based on what the server confirms deleted; otherwise re-fetch.

### IN-03: Repeated RLS predicate is duplicated ~30 times across migrations

**File:** `supabase/migrations/20260604000002_rls_patients.sql`, `..._cases.sql`, `..._auxiliary.sql`

**Issue:** The `profile_id in (select id from public.profiles where auth_user_id = auth.uid())` subquery (and the dual-anchor `user_phone` variant) is copy-pasted dozens of times. This is acceptable for additive RLS migrations (a `SECURITY DEFINER` helper was deliberately avoided per the T-01-09 note to reduce attack surface), but it is a maintenance hazard: a future correctness fix must be applied in ~30 places. Worth noting, not blocking.

**Fix:** Document the decision (already partially noted in `_cases.sql`) and consider a `STABLE` SQL helper (not `SECURITY DEFINER`) in a future phase if the predicate ever needs to change.

### IN-04: `app/dashboard/layout.tsx` formatting/markup oddities

**File:** `app/dashboard/layout.tsx:14-17`

**Issue:** Stray blank line inside `<SidebarInset>` and `{children}</div>` placed on the same line as preceding content; purely cosmetic but inconsistent with the rest of the codebase's formatting.

**Fix:** Run the formatter; place `{children}` on its own line.

### IN-05: Spec mocks do not exercise the `count: null` / partial-delete path that CR-01 depends on

**File:** `modules/prescriptions/delete-prescriptions-bulk.spec.ts:20-23`, `modules/medical-certificates/delete-medical-certificates-bulk.spec.ts:20-23`

**Issue:** The spy mock always returns `count: _vals.length` on success, so the tests can never catch the `count ?? ids.length` over-report (CR-01) or a partial-delete scenario. The "exactly one DB call" assertion is good, but the count semantics are untested.

**Fix:** Add a test where the mock returns `{ error: null, count: 0 }` and another returning `{ error: null, count: null }`, asserting `deletedCount` is `0` (after the CR-01 fix), not `ids.length`.

### IN-06: CI build injects a placeholder publishable key but no test/lint coverage gate

**File:** `.github/workflows/ci.yml:30-37`

**Issue:** The `Test` step runs `yarn test` but there is no coverage threshold or failure on no-tests-found, and the build step hardcodes placeholder Supabase env values inline. The placeholder key is non-sensitive (publishable, fake), so not a secret-leak, but inlining env in the workflow rather than using a documented `.env.ci` makes it easy to accidentally paste a real key here later.

**Fix:** Move CI build env to clearly-named placeholder constants with a comment that real keys must never be committed here; optionally add a coverage gate in a later phase.

---

_Reviewed: 2026-06-05T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
