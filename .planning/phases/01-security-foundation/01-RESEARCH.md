# Phase 1: Security Foundation - Research

**Researched:** 2026-06-04
**Domain:** Supabase RLS, IDOR fix, GitHub Actions CI, dependency pinning
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**RLS rollout**
- D-01: Rollout is incremental per domain — one migration per table group (patients → prescriptions → medical_certificates → cases/case_messages → templates...), validating the app's flows between steps. NOT a single big-bang migration.
- D-02: Migrations are applied and validated via the Supabase MCP server — `rowsecurity` queries, SQL-level ownership tests, and app smoke tests after each step.
- D-03: There is only one Supabase project and it is live production. No staging project, no DB branch. Every incremental step must be individually safe and reversible.
- D-04: HARD CONSTRAINT: no existing data may be deleted or altered. All migrations are additive and non-destructive (enable RLS, create policies, create indexes if needed — never DML on existing rows, never drops of tables/columns).
- D-05: If a policy breaks an app flow in production: immediate rollback. Every incremental migration ships with a ready reversal script (disable RLS / drop policies for that table — data untouched), executed via MCP; investigate offline, reapply fixed.

**Delete behavior (IDOR fix paths)**
- D-06: This area concerns the app's own delete feature (doctor deleting their prescriptions/certificates), not existing data. Hard rules: deletes must never be able to touch another doctor's data (SEC-01), and every failure must be logged.
- D-07: DB-vs-storage ordering, bulk partial-failure semantics, and error messaging are Claude's discretion within SEC-01/SEC-04 (single `.in("id", ids)` DB delete + single batched `storage.remove`).

**CI pipeline**
- D-08: Platform is GitHub Actions (repo `github.com/falaped/falaped`, no existing workflows).
- D-09: Pipeline runs typecheck, lint, test and `next build` — every push must be deployable, not just type-correct. `yarn install --frozen-lockfile` per TEST-03.
- D-10: Branch protection on `main`: merges blocked unless CI is green. Setting up the GitHub branch-protection rule is part of this phase.

**Cleanup & pinning**
- D-11: `supabase/migrations/run_prescriptions_manual.sql` is moved out of `migrations/` into a docs/history location (e.g., `supabase/docs/`) as a historical record. It is NOT converted into a real migration (double-apply risk on the live DB) and NOT deleted.
- D-12: Dead scaffolds removed per HYG-04: empty `app/api/consultation-audio/transcribe/`, `app/api/consultation-audio/presigned-upload/`, and empty `modules/consultation-audio/`.

### Claude's Discretion
- Delete ordering (DB-first vs storage-first), orphan-PDF handling, bulk partial-failure UX and PT-BR error messaging (within D-06/D-07 rules).
- Supabase package pinning strategy — caret range vs exact pin (lockfile + `--frozen-lockfile` enforce reproducibility either way).
- RLS policy granularity (per-operation vs `FOR ALL`), domain ordering for the incremental rollout, helper functions for the `cases` two-hop `user_phone` join, policies for auxiliary tables (`phone_link_codes`, `discussions`, templates).
- CI details: Node version, dependency caching, placeholder env vars for `next build` in CI.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-01 | Doctor can only delete prescriptions/certificates from their own profile — deletes filter by `profile_id` | IDOR fix: add `.eq("profile_id", profileId)` to delete queries; thread `profile.id` from action into module; confirmed IDOR is active at `modules/prescriptions/delete-prescription.ts:34` and `modules/medical-certificates/delete-medical-certificate.ts:34` |
| SEC-02 | All public data tables have RLS enabled with ownership policies (enable + policies in same migration; anchor via `profiles.auth_user_id = auth.uid()`; `cases` via join `user_phone`) | Confirmed zero RLS in any migration; storage RLS pattern exists as template; `cases` uses `user_phone` two-hop via `authenticated_users.phone`; `profile_id` anchor confirmed in table schemas |
| SEC-03 | Admin client (service-role) not used in user-triggered delete paths — storage deleted via user client with RLS; admin restricted to `auth.admin.deleteUser` | 4 action files import `createAdminClient` for storage; storage buckets already have user-scoped delete policies — removing admin client from delete actions will work with existing storage RLS |
| SEC-04 | Bulk delete executes in single batch (`.in("id", ids)` + `storage.remove([...])` batch) without partial inconsistent state on failure | Confirmed: current code uses per-item `for` loop; both DB and storage deletions need to be batched; new module signatures required |
| HYG-04 | `@supabase/ssr` and `@supabase/supabase-js` pinned to explicit semver; dead scaffolds removed (empty consultation-audio dirs, manual SQL out of `migrations/`) | yarn.lock has 0.10.0 / 2.101.1; registry latest is 0.10.3 / 2.107.0; empty scaffold dirs confirmed at `app/api/consultation-audio/{transcribe,presigned-upload}/` and `modules/consultation-audio/`; manual SQL confirmed at `supabase/migrations/run_prescriptions_manual.sql` |
| TEST-03 | CI runs typecheck, lint, and test on every push/PR with `yarn install --frozen-lockfile` | No `.github/workflows/` exists; scripts `typecheck`, `lint`, `test` all defined in `package.json`; `next build` requires placeholder env vars; `yarn` available at v1.22.22 |

</phase_requirements>

---

## Summary

This phase is exclusively a security hardening and infrastructure phase with no patient-facing feature work. It has five distinct problem areas that must be executed in a careful order due to the live-only production database: (1) fix the active IDOR in prescription and certificate delete actions, (2) remove the admin client from user-triggered storage deletions, (3) convert single-item delete loops into batched DB+storage operations, (4) enable Row Level Security on all public data tables incrementally via Supabase MCP, and (5) establish the GitHub Actions CI pipeline with frozen-lockfile enforcement.

The codebase has strong existing patterns to build on: storage buckets already have correct user-scoped RLS policies that serve as migration templates; the `profiles.auth_user_id = auth.uid()` anchor is already in the storage policies; and the action layer already extracts `profile.id` from `getAuthenticatedUser` — the fix is threading that value into module function signatures and the DB query. The `cases` table uses a two-hop tenancy (`cases.user_phone` joins to `authenticated_users.phone` for a given `profile_id`), requiring a helper function in RLS policies.

The most operationally dangerous item is the incremental RLS rollout on live production. Each migration must be individually safe: enabling RLS without policies would deny all access immediately. Every migration must enable RLS and add policies atomically, and a reversal script must be drafted before applying.

**Primary recommendation:** Fix IDOR and admin-client misuse in code first (no DB changes required, zero risk), then roll out RLS domain by domain starting with `prescriptions` and `medical_certificates` (already have `profile_id` FK and existing storage policy patterns), then set up CI (no production risk).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| IDOR fix (ownership filter on delete) | API / Backend (Server Action + Module) | Database (RLS as backstop) | Delete actions are server-side; the fix is adding `.eq("profile_id", profileId)` in the `modules/` layer |
| Admin client restriction | API / Backend (Server Action) | — | `createAdminClient` is only instantiated in server actions; fix is removing import from delete actions |
| Bulk delete batching | API / Backend (Module) | — | The `for` loop is in server action + module layer; batched `.in()` and `storage.remove([...])` are server-side Supabase calls |
| RLS enablement | Database / Storage | — | Migrations applied directly to Postgres via Supabase MCP; ownership enforced at DB layer |
| CI pipeline | CDN / Static (build gate) | — | GitHub Actions workflow runs on push; no runtime component |
| Dep pinning | API / Backend (build time) | — | `package.json` change; yarn.lock enforced in CI |
| Scaffold cleanup | API / Backend (code) | — | Remove empty directories from `app/api/` and `modules/` |

---

## Standard Stack

### Core (already installed, no new packages needed for this phase)
| Library | Version in lockfile | Registry Latest | Purpose | Notes |
|---------|--------------------|--------------------|---------|-------|
| `@supabase/supabase-js` | 2.101.1 (pinned to `latest`) | 2.107.0 [VERIFIED: npm registry] | DB + Storage + Auth client | Pin to `^2.107.0` or exact `2.107.0` |
| `@supabase/ssr` | 0.10.0 (pinned to `latest`) | 0.10.3 [VERIFIED: npm registry] | Cookie-based SSR session management | Pin to `^0.10.3` or exact `0.10.3` |
| `tsx` | present (see `test` script) | — | Node test runner for `.spec.ts` files | Already used for existing 33 specs |
| `typescript` | `^5` | — | Type safety | Already in devDependencies |
| `eslint` | `^9` | — | Lint | Already configured |

### New (CI only, no Node.js dependencies added)
| Tool | Purpose | Notes |
|------|---------|-------|
| GitHub Actions runner | CI workflow execution | Managed by GitHub, no install needed |

**No new npm packages are required for this phase.** All fixes are code changes, SQL migrations, and GitHub Actions YAML.

**Version verification:**
```bash
# Confirmed via npm view:
# @supabase/ssr: 0.10.3 (registry latest as of 2026-06-04)
# @supabase/supabase-js: 2.107.0 (registry latest as of 2026-06-04)
# yarn.lock currently locks: 0.10.0 / 2.101.1
```

After pinning `package.json`, run `yarn install` to update lockfile to latest versions within the specified range.

---

## Package Legitimacy Audit

> This phase installs no new npm packages. The only dependency version changes are to existing `@supabase/*` packages (pinning from `latest` to explicit semver).

| Package | Registry | Age | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| `@supabase/ssr` | npm | 2+ yrs (created 2023-09-06) [VERIFIED: npm registry] | github.com/supabase/ssr [VERIFIED: npm registry] | N/A — not new install | Approved (existing dep, pinning only) |
| `@supabase/supabase-js` | npm | 6+ yrs (created 2020-01-17) [VERIFIED: npm registry] | github.com/supabase/supabase-js [VERIFIED: npm registry] | N/A — not new install | Approved (existing dep, pinning only) |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none
**Note:** slopcheck was unavailable at research time; however, both packages are official Supabase packages with verified GitHub repositories under the `supabase` org and multi-year registry history. No checkpoint needed.

---

## Architecture Patterns

### System Architecture Diagram

```
Doctor browser
    │
    │ Server Action call
    ▼
actions/ ("use server")
    │ getAuthenticatedUser(supabase) → profile.id
    │ Zod validation
    │ paid gate
    │
    ├─→ modules/prescriptions/delete-prescriptions-bulk.ts
    │       .delete().in("id", ids).eq("profile_id", profileId)  [IDOR fix]
    │       storage.remove([...paths])                            [batch fix]
    │       No createAdminClient()                                [SEC-03 fix]
    │
    └─→ Supabase Postgres
            ↕ RLS policy: profiles.auth_user_id = auth.uid()     [SEC-02]
            ↕ (cases: user_phone two-hop join)
            ↕ Storage bucket RLS already enforces ownership
```

```
GitHub push
    │
    ▼
.github/workflows/ci.yml
    ├─ yarn install --frozen-lockfile
    ├─ yarn typecheck (tsc --noEmit)
    ├─ yarn lint (eslint .)
    ├─ yarn test (tsx --test glob)
    └─ yarn build (next build + placeholder env vars)
         │
         └─ branch protection gate on main
```

### Recommended Project Structure Changes

```
.github/
└── workflows/
    └── ci.yml            (new)

supabase/
├── migrations/
│   ├── ...existing...
│   ├── 20260604000000_rls_prescriptions.sql    (new, per domain)
│   ├── 20260604000001_rls_medical_certificates.sql  (new)
│   ├── 20260604000002_rls_patients.sql         (new)
│   ├── 20260604000003_rls_cases.sql            (new — two-hop helper)
│   ├── 20260604000004_rls_auxiliary.sql        (new — templates, phone_link_codes)
│   └── ...
└── docs/                 (new directory)
    └── run_prescriptions_manual.sql   (moved from migrations/)

modules/
├── prescriptions/
│   ├── delete-prescription.ts           (modified — add profileId param)
│   └── delete-prescriptions-bulk.ts     (new — batched module)
└── medical-certificates/
    ├── delete-medical-certificate.ts    (modified — add profileId param)
    └── delete-medical-certificates-bulk.ts  (new — batched module)

actions/
├── prescriptions/
│   ├── delete-prescription.ts           (modified — remove admin client)
│   └── delete-prescriptions-bulk.ts     (modified — remove loop, use batch module)
└── medical-certificates/
    ├── delete-medical-certificate.ts    (modified — remove admin client)
    └── delete-medical-certificates-bulk.ts  (modified — remove loop, use batch module)
```

### Pattern 1: IDOR Fix — Threading profileId into module

**What:** Add `profileId` parameter to module functions so DB delete always includes an ownership filter.
**When to use:** Any delete or destructive mutation in `modules/` layer.
**Current broken pattern:**
```typescript
// modules/prescriptions/delete-prescription.ts (CURRENT — BROKEN)
export async function deletePrescription(
  supabase: SupabaseClient,
  prescriptionId: string,
  pdfStoragePath: string | null,
  storageClient?: SupabaseClient,   // admin client — remove this
): Promise<void> {
  // storage delete (storage-first is wrong: if storage fails, DB never cleaned)
  // DB delete: .delete().eq("id", prescriptionId)  // NO ownership filter!
}
```

**Fixed pattern (recommended — DB-first, ownership-scoped, no admin client):**
```typescript
// modules/prescriptions/delete-prescription.ts (FIXED)
// Source: CONCERNS.md + storage RLS migration patterns
export async function deletePrescription(
  supabase: SupabaseClient,    // user-scoped client; storage RLS handles bucket
  prescriptionId: string,
  profileId: string,            // NEW — ownership anchor
  pdfStoragePath: string | null,
): Promise<void> {
  // 1. Delete DB row first (ownership-scoped; if fails, storage untouched)
  const { error } = await supabase
    .from("prescriptions")
    .delete()
    .eq("id", prescriptionId)
    .eq("profile_id", profileId)   // IDOR fix

  if (error) {
    throw new Error(`[PRESCRIPTIONS] Failed to delete prescription: ${error.message}`)
  }

  // 2. Remove PDF from storage (user client; storage RLS "Prescriptions delete own" applies)
  if (pdfStoragePath?.trim()) {
    const { error: storageError } = await supabase.storage
      .from(PRESCRIPTIONS_BUCKET)
      .remove([pdfStoragePath])

    if (storageError) {
      // Log but do NOT throw — DB row is gone, orphan PDF is preferable to IDOR
      console.error(`[PRESCRIPTIONS] Orphan PDF not removed: ${storageError.message}`)
    }
  }
}
```

**Rationale for DB-first ordering:** If DB delete succeeds and storage remove fails, we have an orphan PDF but no IDOR. If storage remove runs first and DB delete fails (e.g., row not found due to race), we have deleted a PDF the doctor may still see. DB-first keeps the data layer consistent; orphan PDFs can be cleaned up asynchronously.

### Pattern 2: Batched Bulk Delete Module

**What:** Replace the per-item `for` loop with a single DB `.in()` and a single `storage.remove()` call.
**When to use:** Any bulk destructive operation across multiple rows.

```typescript
// modules/prescriptions/delete-prescriptions-bulk.ts (NEW MODULE)
// Source: CONCERNS.md recommendation + Supabase JS client pattern
export async function deletePrescriptionsBulk(
  supabase: SupabaseClient,
  ids: string[],
  profileId: string,
  pdfStoragePaths: (string | null)[],
): Promise<void> {
  if (ids.length === 0) return

  // Single DB delete — atomic, ownership-scoped
  const { error } = await supabase
    .from("prescriptions")
    .delete()
    .in("id", ids)
    .eq("profile_id", profileId)

  if (error) {
    throw new Error(`[PRESCRIPTIONS] Bulk delete failed: ${error.message}`)
  }

  // Single storage batch remove (DB is already committed at this point)
  const paths = pdfStoragePaths.filter((p): p is string => !!p?.trim())
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(PRESCRIPTIONS_BUCKET)
      .remove(paths)

    if (storageError) {
      console.error(`[PRESCRIPTIONS] Orphan PDFs not removed after bulk delete: ${storageError.message}`)
    }
  }
}
```

**Key insight:** The `.in("id", ids).eq("profile_id", profileId)` pattern means rows belonging to other doctors are silently skipped — the operation is a no-op for them, satisfying SEC-01's "no-op" acceptance criterion. No error is needed; the affected count from DB can be returned to the action.

### Pattern 3: RLS Migration Template

**What:** Enable RLS and add ownership policies atomically in a single migration.
**When to use:** Each domain migration (must not enable RLS without policies — instant denial).

```sql
-- supabase/migrations/20260604000000_rls_prescriptions.sql
-- Source: existing storage RLS patterns in 20260315010000_storage_prescriptions.sql

-- ENABLE RLS (safe even if already enabled — idempotent in Postgres)
alter table public.prescriptions enable row level security;

-- SELECT: doctor sees only their prescriptions
create policy "Prescriptions select own"
on public.prescriptions for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

-- INSERT: doctor can only insert under their own profile_id
create policy "Prescriptions insert own"
on public.prescriptions for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

-- UPDATE: doctor can only update their own rows
create policy "Prescriptions update own"
on public.prescriptions for update to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

-- DELETE: doctor can only delete their own rows
create policy "Prescriptions delete own"
on public.prescriptions for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);
```

**Reversal script (must be ready before applying):**
```sql
-- REVERSAL: drop policies, disable RLS — data untouched
drop policy if exists "Prescriptions select own" on public.prescriptions;
drop policy if exists "Prescriptions insert own" on public.prescriptions;
drop policy if exists "Prescriptions update own" on public.prescriptions;
drop policy if exists "Prescriptions delete own" on public.prescriptions;
alter table public.prescriptions disable row level security;
```

### Pattern 4: Cases RLS — Two-hop user_phone join

**What:** The `cases` table uses `user_phone` as its tenancy key, not `profile_id` directly. This requires a helper function or a subquery join through `authenticated_users`.
**When to use:** Any RLS policy on `cases` or `case_messages` tables.

```sql
-- supabase/migrations/20260604000003_rls_cases.sql
-- Helper function: resolve user_phone for the current auth.uid()
-- security definer so it runs with elevated privilege for the join
create or replace function public.auth_user_phone()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select au.phone
  from public.authenticated_users au
  join public.profiles p on p.id = au.profile_id
  where p.auth_user_id = auth.uid()
  limit 1
$$;

alter table public.cases enable row level security;

-- Cases owned by this doctor's phone (dashboard + whatsapp cases)
create policy "Cases select own"
on public.cases for select to authenticated
using (user_phone = public.auth_user_phone());

create policy "Cases update own"
on public.cases for update to authenticated
using (user_phone = public.auth_user_phone());

-- Note: INSERT policy may need to also allow profile_id-based insert
-- (dashboard creates cases with both user_phone and profile_id)
create policy "Cases insert own"
on public.cases for insert to authenticated
with check (user_phone = public.auth_user_phone());

create policy "Cases delete own"
on public.cases for delete to authenticated
using (user_phone = public.auth_user_phone());
```

**Reversal:**
```sql
drop policy if exists "Cases select own" on public.cases;
drop policy if exists "Cases insert own" on public.cases;
drop policy if exists "Cases update own" on public.cases;
drop policy if exists "Cases delete own" on public.cases;
alter table public.cases disable row level security;
drop function if exists public.auth_user_phone();
```

### Pattern 5: GitHub Actions CI Workflow

**What:** Minimal CI workflow for Next.js + Yarn with frozen lockfile.

```yaml
# .github/workflows/ci.yml
# Source: GitHub Actions official documentation [CITED: docs.github.com/en/actions]
name: CI

on:
  push:
    branches: ["**"]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "yarn"

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Typecheck
        run: yarn typecheck

      - name: Lint
        run: yarn lint

      - name: Test
        run: yarn test

      - name: Build
        run: yarn build
        env:
          # next build needs these env vars to parse; values are stubs for CI
          NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: placeholder-key-for-ci-build
          # SUPABASE_SERVICE_ROLE_KEY omitted — not needed for static build analysis
```

**Node version choice:** Node 20 LTS matches current `@types/node: "^20"` in devDependencies. [ASSUMED]

**Env stub rationale:** `lib/env.ts` validates `NEXT_PUBLIC_SUPABASE_URL` as a URL and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as a non-empty string. `next build` does not connect to Supabase at build time. The stubs satisfy Zod validation without real credentials. [ASSUMED — verify `next build` does not execute DB queries at build time]

### Anti-Patterns to Avoid

- **Enable RLS without policies simultaneously:** `alter table X enable row level security` alone with no policies immediately denies all access to authenticated users for that table. Always enable + add policies in the same transaction/migration.
- **Using admin client for storage in user-triggered paths:** `createAdminClient()` bypasses all RLS. Storage buckets already have user-scoped delete policies — the user Supabase client can delete its own PDFs without the admin key.
- **Storage-first delete ordering:** Deleting from storage before the DB row means a storage error leaves the DB row (user sees the document but PDF is gone). DB-first means a storage error leaves an orphan PDF — recoverable and non-IDOR.
- **Per-item loop in bulk delete:** Each iteration is an independent DB round-trip and creates partial failure states. A single `.in("id", ids)` is atomic at the Postgres level.
- **`security definer` functions without `set search_path = ''`:** Without this, an attacker can manipulate search_path to override function behavior. All existing trigger functions in this codebase correctly use `set search_path = ''`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tenant isolation at DB layer | Custom application-layer access checks everywhere | Postgres RLS with `auth.uid()` anchor | RLS is enforced by the DB engine regardless of app code path; can't be bypassed by a missing filter |
| Batched storage deletion | Loop of `storage.remove()` calls | Single `storage.remove([path1, path2, ...])` | Supabase Storage JS client accepts an array; single network call, atomic semantics |
| CI frozen-lockfile enforcement | Custom lockfile hash scripts | `yarn install --frozen-lockfile` | Built-in to Yarn 1.x; fails if lockfile diverges from package.json |
| RLS ownership helper for two-hop join | Re-implementing the join in every policy | `security definer` SQL function returning `phone` for `auth.uid()` | Centralizes join logic; policies stay readable; helper is callable from any policy |

**Key insight:** The storage bucket RLS policies already exist and are correct (`20260315010000_storage_prescriptions.sql`, `20260314010000_storage_medical_certificates.sql`). The admin client bypass in delete actions is unnecessary — the user client can delete storage objects under its own `profile_id` folder via these existing policies.

---

## Common Pitfalls

### Pitfall 1: Enabling RLS Without Policies (Lockout)
**What goes wrong:** Running `alter table X enable row level security` without simultaneously creating policies. Postgres default when RLS is enabled and no policies exist is DENY ALL for non-superuser roles. The app immediately loses read/write access to the table.
**Why it happens:** Operator applies the enable statement alone, planning to add policies in a follow-up step.
**How to avoid:** Always write enable + all four CRUD policies in the same migration file. Test with the MCP `rowsecurity` query and a read query immediately after applying.
**Warning signs:** App returns 403 or empty results for all rows on a table immediately after migration.

### Pitfall 2: Forgetting `service_role` Bypass in Policies
**What goes wrong:** Policies written with `to authenticated` correctly restrict regular users but the service-role client (admin) also becomes restricted if policies use restrictive `for all` with no role clause.
**Why it happens:** Confusion about Postgres RLS roles. `service_role` in Supabase has `bypassrls` privilege and is not subject to RLS policies by default.
**How to avoid:** Understand that `to authenticated` in policy targets only the `authenticated` role — `service_role` is exempt. The `delete-account.ts` admin path will continue to work through cascade deletes without needing policy changes.
**Warning signs:** Account deletion fails after RLS migration.

### Pitfall 3: `cases` Table Missing `profile_id` Index
**What goes wrong:** The `cases` table uses `user_phone` for tenancy. If the `auth_user_phone()` helper function is called per-row during RLS evaluation without an index on `authenticated_users.phone`, it becomes an O(n) scan per row.
**Why it happens:** Index exists on `profile_id` for cases but the RLS helper joins through `authenticated_users` by `phone`.
**How to avoid:** Verify `idx_phone_link_codes_code_unused` and similar indexes on `authenticated_users.phone`. Add an index if absent. [ASSUMED — query the live DB via MCP to confirm index existence before writing the migration]
**Warning signs:** Case list queries become slow after RLS is enabled.

### Pitfall 4: IDOR Fix Breaks Bulk Delete UX When IDs Are Mixed
**What goes wrong:** With `.in("id", ids).eq("profile_id", profileId)`, rows belonging to other doctors are silently skipped. The `deletedCount` returned to the UI may differ from the number of IDs passed in.
**Why it happens:** The DB delete silently no-ops on unauthorized IDs rather than returning an error.
**How to avoid:** Return the count of actually-deleted rows (from the Supabase response) and surface a neutral success message. Per SEC-01's acceptance criterion, the no-op behavior is correct and desired.
**Warning signs:** UI shows "deleted 3 of 10" — this is correct behavior, not a bug.

### Pitfall 5: `next build` in CI Fails Without Env Vars
**What goes wrong:** `lib/env.ts` throws at import time if `NEXT_PUBLIC_SUPABASE_URL` is missing or not a valid URL. `next build` imports this module, so the build fails with "Invalid environment variables."
**Why it happens:** Zod schema validates at module load time, not lazily.
**How to avoid:** Provide stub env vars in the CI workflow `env:` block. The stubs only need to pass Zod's shape validation (a valid URL string and a non-empty key string) — they are never used for actual DB connections during `next build`.
**Warning signs:** Build step fails with "Invalid environment variables: NEXT_PUBLIC_SUPABASE_URL."

### Pitfall 6: Running Both `run_prescriptions_manual.sql` and Real Migration
**What goes wrong:** If `run_prescriptions_manual.sql` is left in `supabase/migrations/` and anyone runs `supabase db push`, it may be applied as a migration (since Supabase tracks applied migrations by filename). The `create table if not exists` guards prevent a crash, but indexes may fail with "already exists."
**Why it happens:** The file is named like a migration but has no timestamp prefix.
**How to avoid:** Move it to `supabase/docs/` immediately as a first task. Do NOT add a timestamp prefix — that would make it a real migration candidate.

---

## Code Examples

### Verified: Storage RLS Policy Pattern (already in codebase)
```sql
-- Source: supabase/migrations/20260315010000_storage_prescriptions.sql
create policy "Prescriptions delete own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'prescriptions'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);
```
This confirms: (a) the anchor is `profiles.auth_user_id = auth.uid()`, (b) the pattern uses a subquery `in (select ...)`, (c) storage policies are per-operation (`for select`, `for insert`, etc.). Table RLS policies should mirror this pattern.

### Verified: Profile-based delete (read path — already correct)
```typescript
// Source: app/api/prescriptions/[id]/download/route.ts (ownership-correct pattern to match)
// The download route correctly filters by profile — this is what delete was supposed to do too.
// Confirmed: IDOR is the inconsistency between read (correct) and delete (missing filter).
```

### Verified: getAuthenticatedUser returns profile.id
```typescript
// Source: actions/prescriptions/delete-prescription.ts (existing pattern)
const supabase = await createClient()
const { profile } = await getAuthenticatedUser(supabase)
if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
// profile.id is already extracted — just needs to be passed into the module
```

### Verified: Bulk item schema and MAX_BULK
```typescript
// Source: actions/prescriptions/delete-prescriptions-bulk.ts
const MAX_BULK = 100
const bulkItemSchema = z.object({
  id: z.string().uuid(),
  pdfStoragePath: z.string().nullable(),
})
// Keep MAX_BULK = 100 in fixed version; Supabase .in() handles 100 IDs fine
```

### Verified: CI with actions/setup-node cache
```yaml
# Source: GitHub Actions official docs [CITED: docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs]
- uses: actions/setup-node@v4
  with:
    node-version: "20"
    cache: "yarn"   # Caches ~/.yarn/cache automatically
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Admin client for storage deletes | User-scoped client with storage RLS policies | Storage RLS policies already created | Admin client no longer needed for bucket operations once policy is in place |
| `for` loop bulk deletes | `.in("id", ids)` + `storage.remove([...paths])` | This phase | Single network round-trip, atomic DB semantics |
| `latest` semver tag | Explicit semver range | This phase | Lockfile becomes the reproducibility guarantee; `--frozen-lockfile` CI catches divergence |
| Application-only tenant isolation | RLS as defense-in-depth | This phase | DB-layer enforcement regardless of application code path |

**Deprecated/outdated in this codebase:**
- `storageClient?: SupabaseClient` parameter in delete module functions: was a workaround for missing storage RLS — no longer needed once admin client is removed from delete actions (storage RLS already handles ownership).
- `run_prescriptions_manual.sql` in `supabase/migrations/`: not a real migration, should not be in that directory.
- `@tanstack/react-query` reference in `dependency-stack` SKILL.md: not installed; skill doc is stale. (Out of scope for Phase 1 but noted for Phase 2.)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Node 20 is appropriate for CI (matches `@types/node: "^20"`) | Pattern 5: GitHub Actions | Minor — if Vercel uses Node 22, CI/prod may diverge; check `engines` field or Vercel project settings |
| A2 | `next build` does not execute DB queries at build time with these placeholder env vars | Pattern 5: GitHub Actions | Medium — if any page or RSC runs a DB query at build time, CI build will fail; confirm by running `next build` locally with stubs |
| A3 | `authenticated_users.phone` has a usable index for the RLS helper function join | Pitfall 3 / Pattern 4 RLS cases | Medium — if absent, RLS evaluation on `cases` table could be slow; verify via MCP before writing cases migration |
| A4 | `discussions` table (referenced in `20250313120000_discussions_add_title.sql`) has a `profile_id` or equivalent ownership column | Table inventory | Medium — if `discussions` uses a different tenancy model, its RLS policy pattern differs; inspect live schema via MCP |
| A5 | `case_messages` table uses `user_phone` tenancy (same as `cases`) | Table inventory | Medium — `case_messages` migration not found in repo; structure inferred from module patterns; confirm via MCP |
| A6 | `report_templates` table uses `profile_id` for ownership (referenced in profiles schema) | Table inventory | Low — highly likely given FK pattern seen in `profiles.report_template_id`, but should be verified via MCP before migration |

---

## Open Questions

1. **Full live table list with RLS status**
   - What we know: Migrations show `prescriptions`, `medical_certificates`, `prescription_templates`, `phone_link_codes`, `case_reports`, `patients` (with `profile_id`). `cases`, `case_messages`, `discussions`, `report_templates`, `profiles`, `authenticated_users` are referenced but their full creation migration is not in the repo (may predate the repo or be in Supabase dashboard).
   - What's unclear: Exact set of `public.*` tables on the live DB and their current `rowsecurity` status.
   - Recommendation: First task in the phase must be a Supabase MCP query: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`. This is the authoritative ground truth. Do not write migrations until this list is confirmed.

2. **`cases` table: does it have `profile_id` column?**
   - What we know: `get-cases-by-profile-id.ts` queries `cases` with `.eq("profile_id", profile.id)`. `get-case-row-for-profile.ts` also joins on `profile_id`. But `update-case-status.ts` uses a two-hop via `user_phone`. The type `CaseRowForProfile` includes `profile_id: string | null`.
   - What's unclear: Is `profile_id` always populated, or is it null for WhatsApp-origin cases? The RLS policy could use `profile_id` directly if always populated for dashboard cases, avoiding the two-hop entirely.
   - Recommendation: Check live data via MCP: `SELECT origin, count(*), count(profile_id) FROM cases GROUP BY origin`. If all dashboard cases have `profile_id`, use it directly. If WhatsApp cases (origin='whatsapp') lack `profile_id`, the two-hop `user_phone` helper is required.

3. **`next build` env var stubs behavior**
   - What we know: `lib/env.ts` validates at import time. `NEXT_PUBLIC_SUPABASE_URL` must be a valid URL.
   - What's unclear: Whether any RSC, route handler, or middleware runs DB queries during `next build` static analysis.
   - Recommendation: Run `NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=stub yarn build` locally before writing the CI workflow.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | CI workflow, `next build` | ✓ (local) | v20.19.2 | — |
| Yarn | `--frozen-lockfile` CI | ✓ (local) | 1.22.22 (in `packageManager`) | — |
| Supabase MCP server | Applying migrations, RLS validation | [ASSUMED] | — | Supabase Dashboard SQL Editor |
| GitHub Actions | CI workflow | ✓ (via `github.com/falaped/falaped` repo) | managed | — |

**Missing dependencies with no fallback:**
- Supabase MCP server access (required by D-02): If MCP is unavailable at execution time, the user must apply migrations manually via Supabase Dashboard SQL Editor. The migration SQL files are identical regardless — MCP is the delivery mechanism, not the SQL content.

**Missing dependencies with fallback:**
- If `next build` stubs fail, fall back to skipping the build step in CI until env configuration is confirmed.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` runner + `tsx` |
| Config file | none — inline script: `find modules lib -name '*.spec.ts' \| xargs tsx --test` |
| Quick run command | `yarn test` |
| Full suite command | `yarn test` (same — no separate integration suite) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 | Doctor deleting another doctor's prescription returns no-op (0 rows affected) | unit (mocked Supabase) | `tsx --test modules/prescriptions/delete-prescription.spec.ts` | ❌ Wave 0 |
| SEC-01 | Doctor deleting own prescription succeeds | unit | same file | ❌ Wave 0 |
| SEC-01 | Same ownership tests for `medical_certificates` | unit | `tsx --test modules/medical-certificates/delete-medical-certificate.spec.ts` | ❌ Wave 0 |
| SEC-03 | `server-admin.ts` is not imported by any action other than `delete-account.ts` | static (grep/regex) | `grep -r "createAdminClient" actions/ --include="*.ts" \| grep -v delete-account` | ❌ Wave 0 (static check, can be a test assertion) |
| SEC-04 | Bulk delete of 10 prescriptions produces exactly one DB call and one storage call | unit (spy/mock) | `tsx --test modules/prescriptions/delete-prescriptions-bulk.spec.ts` | ❌ Wave 0 |
| HYG-04 | `package.json` has explicit semver for `@supabase/*` | static | manual verify + `yarn install --frozen-lockfile` | ❌ Wave 0 |
| TEST-03 | CI workflow exists and passes | integration | GitHub Actions run | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `yarn test` (33 existing specs + new ones)
- **Per wave merge:** `yarn typecheck && yarn lint && yarn test && yarn build`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `modules/prescriptions/delete-prescription.spec.ts` — covers SEC-01 (ownership no-op), SEC-01 (own delete success)
- [ ] `modules/prescriptions/delete-prescriptions-bulk.spec.ts` — covers SEC-04 (single DB call, single storage call)
- [ ] `modules/medical-certificates/delete-medical-certificate.spec.ts` — covers SEC-01 for certificates
- [ ] `modules/medical-certificates/delete-medical-certificates-bulk.spec.ts` — covers SEC-04 for certificates
- [ ] `.github/workflows/ci.yml` — covers TEST-03

**Mocking pattern for existing specs:** The existing specs in `modules/` use pure unit testing with no Supabase mock infrastructure visible from file names. New delete specs will need a lightweight mock for `SupabaseClient` (return type matching Supabase query builder). The module pattern (injected client) makes this straightforward — pass a mock object implementing `.from().delete().eq().in()` chain.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Supabase Auth already handles this |
| V3 Session Management | no | Existing `@supabase/ssr` proxy handles session refresh |
| V4 Access Control | **yes** | RLS policies + `profile_id` ownership filter in delete queries |
| V5 Input Validation | yes | Zod already validates UUIDs in action layer (preserve existing guards) |
| V6 Cryptography | no | No new crypto in this phase |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR on delete by UUID | Spoofing / Tampering | Add `.eq("profile_id", profileId)` to all delete queries + RLS as backstop |
| Service-role key misuse | Elevation of Privilege | Restrict `createAdminClient()` to `delete-account.ts` only |
| Dependency substitution attack | Tampering | Pin semver + `yarn install --frozen-lockfile` in CI; do not use `latest` tag |
| RLS lockout (admin locked out too) | Denial of Service | Service-role has `bypassrls` — admin operations unaffected by table policies |
| Partial bulk delete state | Tampering | Atomic DB `.in()` + log orphan storage failures instead of aborting |

---

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection — all source files read directly from `/Users/goker1/falaped/`
- `.planning/codebase/CONCERNS.md` — authoritative security audit
- `.planning/codebase/ARCHITECTURE.md` — layered architecture reference
- `.planning/codebase/INTEGRATIONS.md` — Supabase client inventory
- `supabase/migrations/20260315010000_storage_prescriptions.sql` — existing storage RLS pattern to mirror
- `npm view @supabase/ssr` / `npm view @supabase/supabase-js` — registry version verification

### Secondary (MEDIUM confidence)
- [CITED: docs.github.com/en/actions] — GitHub Actions workflow structure, `actions/setup-node@v4` with Yarn cache
- `.cursor/skills/supabase-falaped/SKILL.md` — established project query conventions

### Tertiary (LOW confidence / assumed)
- Node 20 LTS appropriateness for CI (inferred from `@types/node: "^20"` in devDependencies)
- `next build` env stub behavior (not tested against live build)
- `cases` `profile_id` population completeness (inferred from query patterns, not confirmed against live data)

---

## Metadata

**Confidence breakdown:**
- IDOR fix (SEC-01, SEC-03, SEC-04): HIGH — source code read directly; fix is unambiguous code change
- RLS patterns (SEC-02): HIGH — existing storage migrations confirm exact pattern; `auth.uid()` anchor confirmed
- Cases two-hop RLS: MEDIUM — pattern is clear from `update-case-status.ts`; `profile_id` column presence on `cases` needs MCP confirmation
- CI workflow: MEDIUM — GitHub Actions structure is standard; env stub behavior for `next build` needs local verification
- Dep pinning (HYG-04): HIGH — yarn.lock versions confirmed; registry latest confirmed via `npm view`
- Scaffold cleanup (HYG-04): HIGH — empty directories confirmed to exist

**Research date:** 2026-06-04
**Valid until:** 2026-07-04 (stable domain; Supabase RLS API is stable across versions)
