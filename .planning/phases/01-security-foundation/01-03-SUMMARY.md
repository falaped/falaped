---
phase: 01-security-foundation
plan: 03
subsystem: database
tags: [postgres, rls, supabase, row-level-security, tenant-isolation, mcp]

# Dependency graph
requires:
  - phase: 01-security-foundation (plan 01-01)
    provides: delete actions pass profile_id so RLS does not break them
  - phase: 01-security-foundation (plan 01-02)
    provides: CI pipeline gating regressions during rollout
provides:
  - RLS enabled with ownership policies on all 17 public.* tables on the LIVE production database (SEC-02)
  - Five domain RLS migrations in supabase/migrations/ reconciled with production history
  - Reversal scripts per migration in supabase/docs/rls-reversals.sql (D-05)
affects: [patient-experience, any future phase touching public.* tables, account-deletion]

# Tech tracking
tech-stack:
  added: []
  patterns: [rls-ownership-anchor, rls-dual-anchor, rls-atomic-enable-plus-policies]

key-files:
  created:
    - supabase/migrations/20260604000000_rls_prescriptions.sql
    - supabase/migrations/20260604000001_rls_medical_certificates.sql
    - supabase/migrations/20260604000002_rls_patients.sql
    - supabase/migrations/20260604000003_rls_cases.sql
    - supabase/migrations/20260604000004_rls_auxiliary.sql
    - supabase/docs/rls-reversals.sql
  modified: []

key-decisions:
  - "Cases tenancy: DUAL anchor (profile_id OR user_phone) instead of profile_id-only — live data showed 32/32 dashboard cases with profile_id, but the app also queries cases/patients by user_phone (get-case-by-id, get-cases-by-patient-id, get-patients-by-user-phone), and future WhatsApp-origin rows may lack profile_id"
  - "No security definer auth_user_phone() helper — inline subqueries via authenticated_users suffice; eliminates threat T-01-09 entirely"
  - "incoming_webhook_events / trigger_buffer_runs got phone-scoped select+delete policies for authenticated — delete-case.ts cleans them with the USER client; deny-all would have silently broken that cleanup"
  - "leads / lp_leads: RLS enabled with NO client policies (deny-all by design) — zero app references; external writers assumed service_role. Deliberate deviation from the 'never enable-only' rule, approved at checkpoint"
  - "report_templates select policy allows is_default=true rows (shared project default has user_id NULL) — anchor is user_id = auth.uid() since user_id FK references profiles.auth_user_id"
  - "Migration history reconciled by updating supabase_migrations.schema_migrations versions (5 rows we created minutes earlier) to match local filenames — CLI db push blocked by revoked token hardcoded in ~/.zshrc"

patterns-established:
  - "RLS ownership anchor: profile_id in (select id from public.profiles where auth_user_id = auth.uid())"
  - "RLS dual anchor for phone-tenancy tables: profile_id anchor OR user_phone in (select au.phone from authenticated_users au where au.profile_id in (profiles anchor))"
  - "Child-table RLS via parent: case_id in (select c.id from cases c where <owner predicate>)"
  - "Live-apply protocol: apply one domain via MCP -> rowsecurity check -> row-count invariance -> owner-visibility + cross-profile SELECT/DELETE smoke (in rolled-back transaction) -> next domain"

requirements-completed: [SEC-02]

# Metrics
duration: ~50min
completed: 2026-06-05
---

# Phase 01 Plan 03: RLS Rollout Summary

**All 17 public.* tables on the live production DB now enforce row-level tenant isolation — cross-profile SELECT and DELETE verified as zero-row no-ops, with zero data rows touched (counts byte-identical to baseline).**

## Performance

- **Duration:** ~50 min (including two checkpoint interactions)
- **Started:** 2026-06-05 (Task 1 authoring)
- **Completed:** 2026-06-05
- **Tasks:** 3/3 (Task 2 = decision checkpoint, approved)
- **Files modified:** 6 created

## Accomplishments

- Authored 5 atomic RLS migrations (enable + all policies in the same file — never enable-only) covering all 17 public tables, grouped by domain (D-01)
- Applied incrementally to LIVE production via Supabase MCP (D-02, D-03), validating each domain before the next
- Reversal script per migration in `supabase/docs/rls-reversals.sql` — pure DDL, data untouched (D-05); never needed
- Production migration history reconciled 1:1 with the repo (versions 20260604000000–04)

## Authoritative pg_tables Inventory (required by acceptance criteria)

Final state — `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'` (2026-06-05, post-apply):

| Table | rowsecurity | Policies | Rows (before = after) |
|---|---|---|---|
| authenticated_users | true | 4 | 2 |
| case_messages | true | 4 | 541 |
| case_reports | true | 4 | 17 |
| cases | true | 4 | 32 |
| discussion_messages | true | 4 | 0 |
| discussions | true | 4 | 0 |
| incoming_webhook_events | true | 2 (select/delete own-phone) | 23 |
| leads | true | 0 (deny-all by design) | 1 |
| lp_leads | true | 0 (deny-all by design) | 4 |
| medical_certificates | true | 4 | 0 |
| patients | true | 4 | 26 |
| phone_link_codes | true | 4 | 1 |
| prescription_templates | true | 4 | 5 |
| prescriptions | true | 4 | 25 |
| profiles | true | 4 | 2 |
| report_templates | true | 4 | 4 |
| trigger_buffer_runs | true | 2 (select/delete own-phone) | 0 |

All tables `rowsecurity = true` (SEC-02). Row counts identical to pre-apply baseline (D-04).

## Cases Ownership Model (required by acceptance criteria)

Live check `SELECT origin, count(*), count(profile_id) FROM cases GROUP BY origin` → `dashboard: 32 total, 32 with profile_id`. Chosen model: **dual anchor** (`profile_id` OR `user_phone` via `authenticated_users`) because the app demonstrably reads cases/patients by `user_phone` and future WhatsApp-origin rows may lack `profile_id`. No `security definer` helper created. `authenticated_users.phone` index pre-existed (Pitfall 3) — no new indexes needed.

## Verification Evidence (per-domain smoke tests, simulated authenticated contexts)

Profile A (`08f59617…`, owns all data) / Profile B (`c717d390…`, owns none):

| Domain | Owner sees | Cross-profile sees | Cross-profile could DELETE |
|---|---|---|---|
| prescriptions | 25/25 | 0 | 0 |
| medical_certificates | 0/0 (select OK, no denial) | — | — |
| patients | 26/26 | 0 | 0 |
| cases / case_messages | 32/32 and 541/541 (incl. by-user_phone path) | 0 / 0 | 0 / 0 |
| auxiliary | profile=1, phone lookup OK, case_reports=17, rx_templates=5, report_templates=4 (incl. default), link_codes=1, webhook_events=23 | profile=1 (own only), 0 elsewhere, default template visible | 0 webhook events |

- Cross-profile delete tests ran an **unrestricted `DELETE ... RETURNING`** as profile B inside a rolled-back transaction — 0 rows affected in every domain.
- `leads`/`lp_leads`: authenticated sees 0 (deny-all working).
- Account deletion safe: `service_role` confirmed `rolbypassrls = true`; trigger functions (`handle_new_auth_user`, `handle_auth_user_deleted`) are `security definer` — profile lifecycle unaffected (Pitfall 2).

## Deviations from Plan

1. **Dual anchor for cases/patients/discussions** instead of plan's "profile_id directly if populated" — justified by app's user_phone query paths; approved at Task 2 checkpoint.
2. **leads/lp_leads enable-only (deny-all)** — deviation from "never enable-only" rule; intentional for system tables with zero client access; approved at Task 2 checkpoint. **Residual risk:** if any external writer uses the anon key (e.g., landing-page form inserting lp_leads directly), inserts will fail — reversal block ready; monitor lead capture.
3. **`supabase db push` not run** — CLI auth blocked by a revoked `SUPABASE_ACCESS_TOKEN` hardcoded in `~/.zshrc:15` (it poisons `supabase login`, which re-saves the stale token). Reconciliation achieved via MCP instead: migrations applied with byte-identical SQL and `supabase_migrations.schema_migrations` versions updated (only the 5 rows created by this plan) to match local filenames — verified 1:1. User directed: "use o mcp conectado". Follow-up: remove the stale export, re-login, run `supabase db push` to confirm no-op.
4. **Pre-existing version drift in older migrations** (e.g., local `20260327120000_patients_sex_enum` vs remote `20260327173238`) — predates this plan, out of scope, noted for hygiene backlog.

## Human Verification Still Required (from plan's human-check)

- Log into the dashboard and confirm list/create/delete flows for prescriptions, certificates, patients, and cases work normally.
- Confirm account deletion still works end-to-end.
- Confirm external lead capture (lp_leads writers) still works.

## Self-Check: PASSED

- All 5 migration files exist with `enable row level security` + `auth.uid()` policies ✓
- rls-reversals.sql has a `disable row level security` line per enabled table, pure DDL ✓
- pg_tables shows rowsecurity=true for all 17 tables ✓
- Row counts unchanged across the entire rollout ✓
- 2 commits (Task 1 authoring; Task 3 evidence is in this SUMMARY) ✓
