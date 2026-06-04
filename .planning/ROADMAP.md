# Roadmap: Falaped — v1.1 Hardening & Experiência do Paciente

## Overview

This milestone secures the multi-tenant foundation before any patient-facing surface is exposed: first close the live IDOR and enable RLS across all data tables plus lock down CI and dep-pinning; then clean up code hygiene and decompose oversized components; then ship the patient share-link feature and the patient timeline (which converges on share at its inline share button); finally close the milestone with ownership regression tests and share-link unit tests that verify the security work holds.

## Milestones

- 🚧 **v1.1 Hardening & Experiência do Paciente** — Phases 1–5 (in progress)

## Phases

- [ ] **Phase 1: Security Foundation** — IDOR fix, RLS on all data tables, admin client restricted, bulk delete batched, deps pinned, CI pipeline established
- [ ] **Phase 2: Code Hygiene & Refactoring** — Duplicate routes unified, env centralised, silent catches logged, oversized components decomposed
- [ ] **Phase 3: Patient Share-Links** — Doctor generates/copies/revokes expiring links; patient downloads PDF on public page without a Falaped account
- [ ] **Phase 4: Patient Timeline** — Doctor views chronological unified feed of cases, prescriptions, and certificates with inline share buttons
- [ ] **Phase 5: Test Verification** — Ownership regression tests for delete actions; share-link token unit tests; CI green

## Phase Details

### Phase 1: Security Foundation
**Goal**: The application's data layer is safe to expose to patients — every delete is ownership-scoped, every table is RLS-protected, the admin client is restricted to account deletion, bulk deletes are atomic, deps are pinned, and CI enforces reproducible builds on every push
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, HYG-04, TEST-03
**Success Criteria** (what must be TRUE):
  1. A doctor calling a delete action with another doctor's document UUID gets a no-op (row untouched) — confirmed by a manual test against staging
  2. Every `public.*` data table has `rowsecurity = true` when queried with `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`
  3. The admin Supabase client (`server-admin.ts`) is invoked only by `delete-account.ts` — no other action file imports it
  4. Deleting 10 prescriptions in bulk issues exactly one DB delete and one storage remove call (no per-item loop)
  5. `@supabase/ssr` and `@supabase/supabase-js` show explicit semver ranges (not `latest`) in `package.json`; `yarn install --frozen-lockfile` succeeds in CI; typecheck, lint, and test all pass on push
**Plans**: TBD

### Phase 2: Code Hygiene & Refactoring
**Goal**: The codebase has one canonical route per resource, all environment variables flow through validated `lib/env.ts`, errors in critical paths are logged, and the three largest components are decomposed into testable hooks and subcomponents
**Depends on**: Phase 1
**Requirements**: HYG-01, HYG-02, HYG-03, REF-01, REF-02, REF-03
**Success Criteria** (what must be TRUE):
  1. Navigating to the removed route (e.g. `/dashboard/patients/novo`) redirects to the canonical route — no 404
  2. Starting the dev server with a missing env var produces an aggregated Zod validation error from `lib/env.ts`, not a runtime crash with `!`
  3. A PDF generation failure in `generate-prescription.ts` or `generate-medical-certificate.ts` produces a `console.error` log with error context — no silent swallow
  4. `new-case-workspace.tsx` is under 400 lines; prescription and certificate wizards each have extracted hooks with no resulting file over 400 lines
**Plans**: TBD
**UI hint**: yes

### Phase 3: Patient Share-Links
**Goal**: A doctor can generate a time-limited, revocable link for any prescription or medical certificate and copy it to send to a patient; the patient opens the link on a branded public page and downloads the PDF without needing a Falaped account; the doctor can revoke the link at any time and see expiry countdowns and one-click regeneration
**Depends on**: Phase 1
**Requirements**: SHARE-01, SHARE-02, SHARE-03, SHARE-04
**Success Criteria** (what must be TRUE):
  1. Doctor clicks "Gerar link" on a prescription or certificate and receives a copyable URL of the form `{APP_URL}/share/{token}` within the dashboard
  2. Pasting the link into an incognito browser (no Falaped session) opens a branded page and allows downloading the PDF — the download goes through `/api/share/[token]/download` and never exposes a raw Supabase storage URL
  3. Doctor clicks "Revogar" — the link immediately stops working (patient gets an error page, not the PDF) and `accessed_at` is populated for any link that was opened at least once
  4. Doctor sees "expira em N dias" for active links and can regenerate with one click (old token revoked, new token created)
**Plans**: TBD
**UI hint**: yes

### Phase 4: Patient Timeline
**Goal**: Doctor opens a patient's detail page and sees a single chronological feed of all cases, prescriptions, and certificates grouped by month, can filter by event type, and can trigger a share-link generation inline from any document row
**Depends on**: Phase 1, Phase 3
**Requirements**: TLINE-01, TLINE-02, TLINE-03
**Success Criteria** (what must be TRUE):
  1. Doctor opens a patient detail page and sees cases, prescriptions, and certificates interleaved in reverse-chronological order, grouped under month/year headings
  2. Doctor clicks a filter pill ("Consultas", "Receitas", "Atestados") and the feed instantly narrows to that event type — no page reload
  3. Doctor clicks "Compartilhar" inline on a document row in the timeline and receives a share link (same flow as Phase 3 SHARE-01) without leaving the patient page
**Plans**: TBD
**UI hint**: yes

### Phase 5: Test Verification
**Goal**: The ownership guarantees introduced in Phase 1 and the token lifecycle of Phase 3 are locked in by automated tests, and the CI pipeline (from Phase 1) runs all of them on every push
**Depends on**: Phase 1, Phase 3
**Requirements**: TEST-01, TEST-02
**Success Criteria** (what must be TRUE):
  1. Running `yarn test` executes ownership tests for delete and generate actions — a test that calls the action with a mismatched `profile_id` asserts the target row is untouched
  2. Running `yarn test` executes unit tests for share-link token create, validate, expiry, and revocation — all four scenarios have a passing spec
  3. The CI pipeline introduced in Phase 1 runs the new ownership and token tests on every push and fails the build if any assertion fails
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security Foundation | 0/TBD | Not started | - |
| 2. Code Hygiene & Refactoring | 0/TBD | Not started | - |
| 3. Patient Share-Links | 0/TBD | Not started | - |
| 4. Patient Timeline | 0/TBD | Not started | - |
| 5. Test Verification | 0/TBD | Not started | - |
