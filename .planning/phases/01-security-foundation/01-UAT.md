---
status: testing
phase: 01-security-foundation
source: [01-VERIFICATION.md]
started: 2026-06-05T16:30:00Z
updated: 2026-06-05T16:30:00Z
---

## Current Test

number: 1
name: App flow smoke test post-RLS
expected: |
  Logged in as a doctor, the list/create/delete flows for prescriptions,
  medical certificates, patients, and cases all work correctly — no 403
  errors, no lists suddenly showing empty (empty-all regression).
awaiting: user response

## Tests

### 1. App flow smoke test post-RLS
expected: Logged in as a doctor, list/create/delete flows for prescriptions, certificates, patients, and cases work correctly with no 403 errors or empty-all regressions.
result: [pending]

### 2. Account deletion end-to-end
expected: Triggering account deletion for a test account still cascades correctly — the service_role admin client bypasses RLS, so the full delete path (profile, cases, prescriptions, storage) completes as before.
result: [pending]

### 3. External lead capture (lp_leads)
expected: External writers to lp_leads (landing-page forms) still insert rows. leads/lp_leads have RLS enabled with NO client policies (deny-all by design). If the external writer uses the anon key instead of service_role, inserts will fail — reversal block in supabase/docs/rls-reversals.sql is ready if so.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
