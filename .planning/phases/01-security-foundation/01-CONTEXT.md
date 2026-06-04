# Phase 1: Security Foundation - Context

**Gathered:** 2026-06-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the application's data layer safe to expose to patients: fix the IDOR in prescription/certificate deletes (ownership filter by `profile_id`), enable RLS with ownership policies on every `public` data table, restrict the service-role admin client to `auth.admin.deleteUser` only, batch bulk deletes atomically, pin the Supabase dependencies, clean dead scaffolds, and establish a CI pipeline that enforces reproducible builds on every push. No patient-facing feature ships in this phase.

**Requirements covered:** SEC-01, SEC-02, SEC-03, SEC-04, HYG-04, TEST-03.

</domain>

<decisions>
## Implementation Decisions

### RLS rollout
- **D-01:** Rollout is **incremental per domain** — one migration per table group (e.g., patients → prescriptions → medical_certificates → cases/case_messages → templates...), validating the app's flows between steps. NOT a single big-bang migration.
- **D-02:** Migrations are applied and validated **via the Supabase MCP server** — `rowsecurity` queries, SQL-level ownership tests, and app smoke tests after each step.
- **D-03:** There is **only one Supabase project and it is live production**. No staging project, no DB branch. Every incremental step must be individually safe and reversible.
- **D-04:** **HARD CONSTRAINT: no existing data may be deleted or altered.** All migrations are additive and non-destructive (enable RLS, create policies, create indexes if needed — never DML on existing rows, never drops of tables/columns).
- **D-05:** If a policy breaks an app flow in production: **immediate rollback**. Every incremental migration ships with a ready reversal script (disable RLS / drop policies for that table — data untouched), executed via MCP; investigate offline, reapply fixed.

### Delete behavior (IDOR fix paths)
- **D-06:** This area concerns the app's own delete feature (doctor deleting their prescriptions/certificates), not existing data. Hard rules: deletes must never be able to touch another doctor's data (SEC-01), and every failure must be logged.
- **D-07:** DB-vs-storage ordering, bulk partial-failure semantics, and error messaging are **Claude's discretion** within SEC-01/SEC-04 (single `.in("id", ids)` DB delete + single batched `storage.remove`).

### CI pipeline
- **D-08:** Platform is **GitHub Actions** (repo `github.com/falaped/falaped`, no existing workflows).
- **D-09:** Pipeline runs typecheck, lint, test **and `next build`** — every push must be deployable, not just type-correct. `yarn install --frozen-lockfile` per TEST-03.
- **D-10:** **Branch protection on `main`**: merges blocked unless CI is green. Setting up the GitHub branch-protection rule is part of this phase.

### Cleanup & pinning
- **D-11:** `supabase/migrations/run_prescriptions_manual.sql` is **moved out of `migrations/`** into a docs/history location (e.g., `supabase/docs/`) as a historical record. It is NOT converted into a real migration (double-apply risk on the live DB) and NOT deleted.
- **D-12:** Dead scaffolds removed per HYG-04: empty `app/api/consultation-audio/transcribe/`, `app/api/consultation-audio/presigned-upload/`, and empty `modules/consultation-audio/`.

### Claude's Discretion
- Delete ordering (DB-first vs storage-first), orphan-PDF handling, bulk partial-failure UX and PT-BR error messaging (within D-06/D-07 rules).
- Supabase package pinning strategy — caret range vs exact pin (lockfile + `--frozen-lockfile` enforce reproducibility either way).
- RLS policy granularity (per-operation vs `FOR ALL`), domain ordering for the incremental rollout, helper functions for the `cases` two-hop `user_phone` join, policies for auxiliary tables (`phone_link_codes`, `discussions`, templates).
- CI details: Node version, dependency caching, placeholder env vars for `next build` in CI.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Security findings & codebase analysis
- `.planning/codebase/CONCERNS.md` — Authoritative security audit: IDOR locations (`modules/prescriptions/delete-prescription.ts:33`, `modules/medical-certificates/delete-medical-certificate.ts:33`), full list of tables lacking RLS, admin-client usage in user-triggered delete paths, storage-failure inconsistency bug, `latest`-pinned Supabase deps.
- `.planning/codebase/ARCHITECTURE.md` — Layered flow (`app/` → `actions/` → `modules/` → Supabase), per-request client factories, ownership-scoping pattern, anti-patterns to preserve (modules never construct clients).
- `.planning/codebase/INTEGRATIONS.md` — Supabase client inventory (`lib/supabase/server.ts`, `client.ts`, `proxy.ts`, `server-admin.ts`), storage buckets, env vars, absence of CI.

### Requirements anchor
- `.planning/REQUIREMENTS.md` — SEC-01..04, HYG-04, TEST-03 with exact acceptance details (RLS anchor `profiles.auth_user_id = auth.uid()`; `cases` via `user_phone` join; token/CI specifics).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/supabase/server-admin.ts` — admin client to be restricted; `actions/profile/delete-account.ts` is its only legitimate caller after this phase.
- Storage RLS migrations already exist as pattern references: `supabase/migrations/*_storage_*_rls.sql` (buckets already have policies — table RLS can mirror their style).
- `lib/env.ts` — Zod-validated env (full adoption is Phase 2, but CI/env work here must not conflict).
- 31 existing specs in `modules/`/`lib` run via `node:test` + tsx — the CI `test` job globs these.

### Established Patterns
- Every action: per-request client → `getAuthenticatedUser(supabase)` → paid gate → Zod → delegate to `modules/` with injected client; modules throw, actions return `{ ok }` unions.
- Ownership scoping by `profile_id` / `user_phone` exists in read paths (e.g., `app/api/prescriptions/[id]/download/route.ts`) — the delete paths are the inconsistency to fix.
- Migrations are timestamped files in `supabase/migrations/`.

### Integration Points
- Delete actions to fix: `actions/prescriptions/delete-prescription.ts`, `actions/prescriptions/delete-prescriptions-bulk.ts`, `actions/medical-certificates/delete-medical-certificate.ts`, `actions/medical-certificates/delete-medical-certificates-bulk.ts` + their `modules/` counterparts.
- RLS must not break the three app clients (SSR cookies, browser, proxy/session-refresh) nor the WhatsApp-bot flow that writes via `user_phone` tenancy.
- CI lands in `.github/workflows/` (currently absent); branch protection configured on GitHub `main`.

</code_context>

<specifics>
## Specific Ideas

- Use the **Supabase MCP server** as the operational tool for applying migrations and validating RLS state against the live project (user explicitly requested: "usar MCP supabase").
- User emphasized (twice) that the database is live production with real data — treat data preservation as the phase's top operational constraint.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Security Foundation*
*Context gathered: 2026-06-04*
