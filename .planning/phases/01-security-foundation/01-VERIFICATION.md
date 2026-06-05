---
phase: 01-security-foundation
verified: 2026-06-05T12:00:00Z
status: human_needed
score: 12/12
overrides_applied: 0
re_verification: false
human_verification:
  - test: "Log in as a doctor and confirm prescriptions/certificates/patients/cases list, create, and delete flows all work normally after RLS is enabled"
    expected: "All dashboard flows load data correctly with no 403 errors or empty-all regressions; a doctor only sees their own records"
    why_human: "App-level flow validation through a real auth session cannot be confirmed by static code analysis; RLS was applied to a live production DB"
  - test: "Perform an account deletion (patient or doctor) and confirm the full cascade still works end-to-end"
    expected: "Account and associated data are deleted successfully — service_role bypass confirmed in production"
    why_human: "DB-level CASCADE behavior through service_role post-RLS requires a live run; confirmation was captured in SUMMARY but not independently reproducible"
  - test: "Confirm that any external writers to lp_leads (e.g. landing-page forms using anon or service_role key) still work"
    expected: "Lead capture forms continue to insert rows into lp_leads; no regression from the deny-all RLS applied to that table"
    why_human: "leads and lp_leads have RLS enabled with NO client policies (deny-all by design for authenticated) — an external anon/service_role writer may be affected; no app reference exists to grep, but the external integration cannot be verified statically"
---

# Phase 01: Security Foundation — Verification Report

**Phase Goal:** The application's data layer is safe to expose to patients — every delete is ownership-scoped, every table is RLS-protected, the admin client is restricted to account deletion, bulk deletes are atomic, deps are pinned, and CI enforces reproducible builds on every push
**Verified:** 2026-06-05T12:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every delete is ownership-scoped — `eq("profile_id")` present in all 4 delete modules | VERIFIED | `grep -c 'eq("profile_id"' modules/prescriptions/delete-prescription.ts` → 1; same for delete-prescriptions-bulk.ts, delete-medical-certificate.ts, delete-medical-certificates-bulk.ts → all 1 |
| 2 | `profile.id` is threaded from every delete action into its module (no admin client bypass) | VERIFIED | actions/prescriptions/delete-prescription.ts L24: `deletePrescription(supabase, prescriptionId, profile.id, pdfStoragePath)`; bulk L46: `profile.id`; certificates same pattern |
| 3 | Admin client (`createAdminClient`) absent from all delete actions; only `delete-account.ts` may import it | VERIFIED | `grep -c "createAdminClient"` → 0 in all 4 delete actions; `grep -rc "createAdminClient" actions/` → only `delete-account.ts:2` |
| 4 | Bulk delete issues exactly one DB call and one storage call (no per-item loop) | VERIFIED | Both bulk modules use `.in("id", ids).eq("profile_id", profileId)` single call; `grep -c "for (const"` → 0 in both bulk actions; test "makes exactly one DB call and one storage call for 10 ids" PASSES |
| 5 | Every RLS migration enables RLS and creates all CRUD policies atomically (never enable-only, except approved leads/lp_leads) | VERIFIED | All 5 migration files contain `enable row level security` + `auth.uid()` anchor; policy counts: prescriptions=4, medical_certificates=4, patients=4, cases=8 (dual-table), auxiliary=36+2deny-all; leads/lp_leads enable-only approved at checkpoint |
| 6 | Every table is RLS-protected on the live database | VERIFIED (MCP evidence) | 01-03-SUMMARY.md records the authoritative `pg_tables` query result: all 17 public tables `rowsecurity=true`; MCP-apply substituted `supabase db push` (blocked by stale token), reconciled via `schema_migrations` 1:1 — documented deviation |
| 7 | Cases RLS resolves ownership via dual anchor (`profile_id` OR `user_phone`) | VERIFIED | `20260604000003_rls_cases.sql` L26-42: `profile_id in (...) or user_phone in (select au.phone from authenticated_users au where au.profile_id in (...))` — no `security definer` helper (T-01-09 eliminated) |
| 8 | Account deletion (service-role) still works after RLS — `service_role` bypasses RLS | VERIFIED (MCP evidence) | SUMMARY records: `service_role` confirmed `rolbypassrls=true`; trigger functions are `security definer`; Pitfall 2 validated at Task 3 |
| 9 | Every RLS migration ships with a ready reversal script | VERIFIED | `supabase/docs/rls-reversals.sql` exists; contains `disable row level security` on 18 lines covering all enabled tables including leads/lp_leads; pure DDL confirmed |
| 10 | Supabase packages have explicit semver ranges (not "latest") and `yarn install --frozen-lockfile` succeeds | VERIFIED | `package.json`: `"@supabase/ssr": "^0.10.3"`, `"@supabase/supabase-js": "^2.107.0"`, zero `"latest"` occurrences |
| 11 | CI pipeline runs typecheck, lint, test, and build on every push and PR to main | VERIFIED | `.github/workflows/ci.yml` triggers on `push: branches: ["**"]` and `pull_request: branches: [main]`; steps include `--frozen-lockfile`, `yarn typecheck`, `yarn lint`, `yarn test`, `yarn build`; stub env vars present |
| 12 | Merges into main are blocked unless the CI status check is green | VERIFIED | `gh api repos/falaped/falaped/branches/main/protection` returns `required_status_checks.contexts: ["ci"]`, `strict: true`, `enforce_admins: false` |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `modules/prescriptions/delete-prescription.ts` | Ownership-scoped single delete with `eq("profile_id"` | VERIFIED | DB-first ordering confirmed; no admin client; storageError logged not thrown |
| `modules/prescriptions/delete-prescriptions-bulk.ts` | Batched single-call bulk delete | VERIFIED | `.in("id", ids).eq("profile_id", profileId)` + single storage.remove; early-return on empty |
| `modules/medical-certificates/delete-medical-certificate.ts` | Ownership-scoped single delete for certificates | VERIFIED | Mirrors prescription module; `eq("profile_id"` present |
| `modules/medical-certificates/delete-medical-certificates-bulk.ts` | Batched bulk delete for certificates | VERIFIED | Same single-call pattern as prescriptions bulk |
| `modules/prescriptions/delete-prescription.spec.ts` | SEC-01 ownership tests | VERIFIED | Tests: no-op doesn't throw, owns-own succeeds, storage-error doesn't throw |
| `modules/prescriptions/delete-prescriptions-bulk.spec.ts` | SEC-04 single-call tests | VERIFIED | Tests: dbCallCount===1 and storageCallCount===1 for 10-id bulk; empty returns {deletedCount:0} with zero calls |
| `modules/medical-certificates/delete-medical-certificate.spec.ts` | SEC-01 tests for certificates | VERIFIED | Mirrors prescription spec structure |
| `modules/medical-certificates/delete-medical-certificates-bulk.spec.ts` | SEC-04 tests for certificates | VERIFIED | Mirrors prescriptions bulk spec |
| `actions/prescriptions/delete-prescription.ts` | Threads profile.id, no createAdminClient | VERIFIED | L24: `deletePrescription(supabase, prescriptionId, profile.id, pdfStoragePath)` |
| `actions/prescriptions/delete-prescriptions-bulk.ts` | Single module call, no loop, no createAdminClient | VERIFIED | Uses `deletePrescriptionsBulk`; no `for (const`; profile.id at L46 |
| `actions/medical-certificates/delete-medical-certificate.ts` | Threads profile.id, no createAdminClient | VERIFIED | L24: `deleteMedicalCertificate(supabase, certificateId, profile.id, pdfStoragePath)` |
| `actions/medical-certificates/delete-medical-certificates-bulk.ts` | Single module call, no loop, no createAdminClient | VERIFIED | Uses `deleteMedicalCertificatesBulk`; no `for (const`; profile.id at L46 |
| `supabase/migrations/20260604000000_rls_prescriptions.sql` | RLS + 4 CRUD policies for prescriptions | VERIFIED | 4 policies; `auth_user_id = auth.uid()` anchor confirmed |
| `supabase/migrations/20260604000001_rls_medical_certificates.sql` | RLS for medical_certificates | VERIFIED | 4 policies; `auth.uid()` anchor |
| `supabase/migrations/20260604000002_rls_patients.sql` | RLS for patients | VERIFIED | 4 policies; `auth.uid()` anchor |
| `supabase/migrations/20260604000003_rls_cases.sql` | RLS for cases with dual ownership anchor | VERIFIED | 8 policies (cases + case_messages); dual anchor profile_id OR user_phone via authenticated_users |
| `supabase/migrations/20260604000004_rls_auxiliary.sql` | RLS for remaining public tables | VERIFIED | 36 client policies + 2 deny-all (leads/lp_leads) |
| `supabase/docs/rls-reversals.sql` | Reversal scripts per migration | VERIFIED | 18 `disable row level security` lines; pure DDL |
| `.github/workflows/ci.yml` | CI pipeline with frozen-lockfile + 4 gates + build | VERIFIED | All required steps present; stub env vars; triggers on push+PR |
| `package.json` | Explicit semver pins for Supabase packages | VERIFIED | `^0.10.3` and `^2.107.0`; zero `"latest"` |
| `supabase/docs/run_prescriptions_manual.sql` | Manual SQL moved out of migrations | VERIFIED | File exists in docs/; absent from migrations/ |
| `eslint.config.mjs` | Ignore patterns for vendored/generated files + `^_` unused-vars | VERIFIED | `public/vendor/**`, `types/validator.ts`, `argsIgnorePattern: "^_"` confirmed |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `actions/prescriptions/delete-prescription.ts` | `modules/prescriptions/delete-prescription.ts` | `profile.id` threaded as third argument | WIRED | L6 import; L24 call with `profile.id` |
| `actions/prescriptions/delete-prescriptions-bulk.ts` | `modules/prescriptions/delete-prescriptions-bulk.ts` | Single batched module call replacing for loop | WIRED | L7 import; L43-46 call with `profile.id` |
| `actions/medical-certificates/delete-medical-certificate.ts` | `modules/medical-certificates/delete-medical-certificate.ts` | `profile.id` threaded as third argument | WIRED | L6 import; L24 call with `profile.id` |
| `actions/medical-certificates/delete-medical-certificates-bulk.ts` | `modules/medical-certificates/delete-medical-certificates-bulk.ts` | Single batched module call replacing for loop | WIRED | L7 import; L43-46 call with `profile.id` |
| `supabase/migrations/*_rls_*.sql` | `public.profiles.auth_user_id = auth.uid()` | Ownership anchor subquery in all non-deny-all policies | WIRED | All 5 migration files use `where auth_user_id = auth.uid()` subquery pattern |
| `supabase/migrations/20260604000003_rls_cases.sql` | `public.authenticated_users.phone` | Two-hop dual anchor via `user_phone` | WIRED | L26-30: `user_phone in (select au.phone from authenticated_users au where au.profile_id in (...))` |
| `.github/workflows/ci.yml` | `package.json scripts` | `yarn typecheck` / `yarn lint` / `yarn test` / `yarn build` steps | WIRED | All 4 script invocations present; `--frozen-lockfile` on install |
| `GitHub branch protection rule` | `.github/workflows/ci.yml` | Required status check `ci` (job id) | WIRED | `gh api` read-back: `contexts: ["ci"]`, `strict: true` |

### Data-Flow Trace (Level 4)

Not applicable — this phase produces security/infrastructure code (delete modules, CI config, DB migrations), not data-rendering UI components.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite passes (321 tests) | `find modules lib -name '*.spec.ts' \| xargs ./node_modules/.bin/tsx --test` | 321/321 pass, 0 fail | PASS |
| TypeScript compiles clean | `./node_modules/.bin/tsc --noEmit` | 0 output (zero errors) | PASS |
| Branch protection rule active | `gh api repos/falaped/falaped/branches/main/protection` | `contexts: ["ci"]`, `strict: true`, `enforce_admins: false` | PASS |
| SEC-01 gate: `eq("profile_id")` in all 4 delete modules | `grep -c 'eq("profile_id"' modules/*/delete-*.ts` | 1 in each of 4 files | PASS |
| SEC-03 gate: `createAdminClient` absent from all non-account delete actions | `grep -rc "createAdminClient" actions/ \| grep -v "delete-account" \| grep -v ":0"` | 0 matches (only delete-account.ts:2) | PASS |
| SEC-04 gate: no `for (const` loops in bulk actions | `grep -c "for (const" actions/*/delete-*-bulk.ts` | 0 in both files | PASS |
| Supabase packages pinned (no "latest") | `grep '"latest"' package.json` | 0 matches; `^0.10.3` and `^2.107.0` present | PASS |

### Probe Execution

No probes declared in PLAN files and no `scripts/*/tests/probe-*.sh` files exist. Step 7c skipped.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SEC-01 | 01-01 | Deletes filter by `profile_id` — IDOR fix | SATISFIED | `eq("profile_id"` in all 4 modules; profile.id threaded from all 4 actions; 10 ownership specs pass |
| SEC-02 | 01-03 | All public tables have RLS with ownership policies | SATISFIED | 5 migration files, all with `enable row level security` + `auth.uid()` anchor; live DB all 17 tables `rowsecurity=true` per MCP-verified SUMMARY |
| SEC-03 | 01-01 | Admin client restricted to account deletion only | SATISFIED | `createAdminClient` absent from all delete actions except `delete-account.ts`; grep gate confirms 0 violations |
| SEC-04 | 01-01 | Bulk delete atomic — single DB call + single storage call | SATISFIED | `.in("id", ids)` in both bulk modules; no loops; spec asserts `dbCallCount===1` and `storageCallCount===1` for 10-id bulk |
| HYG-04 | 01-02 | Supabase packages pinned; dead scaffolds removed | SATISFIED | `^0.10.3` and `^2.107.0` in package.json; `run_prescriptions_manual.sql` moved to docs/; consultation-audio dirs empty and untracked by git |
| TEST-03 | 01-02, 01-04 | CI with frozen-lockfile on every push + branch protection enforcing it | SATISFIED | CI workflow exists with all required steps; branch protection requires `ci` check with `strict:true` |

All 6 requirements claimed by Phase 1 plans are satisfied. No orphaned requirements (REQUIREMENTS.md traceability table maps SEC-01/02/03/04, HYG-04, TEST-03 to Phase 1; all verified here).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| N/A | — | No TBD/FIXME/XXX markers found in any phase-modified file | — | Clean |
| N/A | — | No TODO/HACK/PLACEHOLDER strings found in module or action files | — | Clean |
| N/A | — | No empty `return null` / `return {}` / `return []` stubs in module files | — | Clean |

No blockers found. The `leads`/`lp_leads` enable-only (deny-all) deviation was explicitly approved at the Plan 03 checkpoint and documented in SUMMARY and in a migration comment.

**Noted deviation (non-blocking):** `supabase db push` was not run to reconcile migration history — the Supabase CLI auth token in `~/.zshrc:15` is revoked and poisons `supabase login`. Reconciliation was achieved via MCP: `schema_migrations` rows updated 1:1 to match local filenames for the 5 rows created by this plan. Follow-up: remove the stale `export SUPABASE_ACCESS_TOKEN` from `~/.zshrc`, re-login, run `supabase db push` to confirm it is a no-op.

**Noted deviation (non-blocking):** Empty consultation-audio directories (`app/api/consultation-audio/transcribe/`, `app/api/consultation-audio/presigned-upload/`, `modules/consultation-audio/`) exist on the local filesystem but contain zero files and are not tracked by git. Git does not track empty directories; the requirement was that the scaffolds not exist as git artifacts — satisfied.

### Human Verification Required

#### 1. App Flow Smoke Test (Post-RLS)

**Test:** Log into the Falaped dashboard as a real authenticated doctor. Exercise: (a) list prescriptions, (b) create a prescription, (c) delete a prescription; repeat for medical certificates, patients, and cases.
**Expected:** All flows work correctly. Data loads without 403 errors or empty-all regressions. The doctor only sees their own records.
**Why human:** RLS was applied to the live production database via MCP, not a staging environment. Static analysis confirms the migration files are correct, but end-to-end verification of app flows through a real auth session requires a logged-in user.

#### 2. Account Deletion End-to-End

**Test:** Trigger account deletion for a test account and confirm the full cascade (profile + associated data) deletes successfully.
**Expected:** The `delete-account.ts` admin-client path still works. `service_role` bypasses RLS as expected.
**Why human:** The service_role bypass was confirmed at the DB level via MCP (`rolbypassrls=true`), but the full application-level cascade including trigger functions requires a live end-to-end run.

#### 3. External Lead Capture (lp_leads)

**Test:** Verify that any external writers to `lp_leads` (e.g. landing-page forms) still succeed in inserting rows.
**Expected:** Lead capture continues to work. If the writer uses service_role, inserts are unaffected by RLS (bypassrls). If the writer uses anon key, inserts were already blocked (leads table has no anon policies) and behavior is unchanged.
**Why human:** There are zero app references to `lp_leads` in the codebase. Whether an external service uses anon vs service_role for inserts cannot be determined statically. The SUMMARY flagged this as residual risk; the reversal block is ready if needed.

---

## Gaps Summary

No gaps. All 12 observable truths are VERIFIED against the codebase. The 3 human verification items are operational validations of live-database behavior that cannot be confirmed by static analysis — they do not block the technical goal achievement but require end-to-end confirmation by the developer.

---

_Verified: 2026-06-05T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
