---
phase: 01-security-foundation
plan: "01"
subsystem: prescriptions/medical-certificates delete paths
tags: [security, idor, sec-01, sec-03, sec-04, tdd]
dependency_graph:
  requires: []
  provides:
    - ownership-scoped single delete for prescriptions (deletePrescription)
    - ownership-scoped single delete for medical certificates (deleteMedicalCertificate)
    - batched bulk delete for prescriptions (deletePrescriptionsBulk)
    - batched bulk delete for medical certificates (deleteMedicalCertificatesBulk)
  affects:
    - actions/prescriptions/delete-prescription.ts
    - actions/prescriptions/delete-prescriptions-bulk.ts
    - actions/medical-certificates/delete-medical-certificate.ts
    - actions/medical-certificates/delete-medical-certificates-bulk.ts
tech_stack:
  added: []
  patterns:
    - DB-first delete ordering (row before storage PDF)
    - Ownership filter via eq("profile_id") on all deletes
    - Single-call batching via .in("id", ids).eq("profile_id", profileId)
    - Storage orphan-log pattern (no throw on storage failure)
    - User-scoped Supabase client throughout (no admin client in delete paths)
key_files:
  created:
    - modules/prescriptions/delete-prescriptions-bulk.ts
    - modules/medical-certificates/delete-medical-certificates-bulk.ts
    - modules/prescriptions/delete-prescription.spec.ts
    - modules/prescriptions/delete-prescriptions-bulk.spec.ts
    - modules/medical-certificates/delete-medical-certificate.spec.ts
    - modules/medical-certificates/delete-medical-certificates-bulk.spec.ts
  modified:
    - modules/prescriptions/delete-prescription.ts
    - modules/medical-certificates/delete-medical-certificate.ts
    - actions/prescriptions/delete-prescription.ts
    - actions/prescriptions/delete-prescriptions-bulk.ts
    - actions/medical-certificates/delete-medical-certificate.ts
    - actions/medical-certificates/delete-medical-certificates-bulk.ts
decisions:
  - "DB-first delete ordering chosen: DB failure leaves storage intact (no security issue); storage failure leaves orphan PDF (recoverable, logged) — per D-07 discretion"
  - "Storage errors log but do not throw in both single and bulk paths — orphan PDF preferable to IDOR or a false failure signal to the caller"
  - "Unauthorized IDs in bulk deletes silently no-op via ownership filter — SEC-01 acceptance criteria explicitly accepts this behavior"
metrics:
  duration: "5 minutes"
  completed_date: "2026-06-05"
  tasks_completed: 3
  files_modified: 12
---

# Phase 01 Plan 01: IDOR Fix + Admin Client Removal + Bulk Batching Summary

Closed the live IDOR in prescription and medical-certificate delete paths by adding ownership filters, removed service-role admin client from all user-triggered delete actions, and converted per-item bulk loops into single batched DB+storage operations — verified by 10 new TDD specs, 321/321 suite green.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write Wave-0 failing specs (RED) | 03d5423 | 4 spec files created |
| 2 | Fix IDOR in single-delete modules + remove admin client from actions | c89d3fb | 4 files modified |
| 3 | Create batched bulk-delete modules + rewire bulk actions | c4ca889 | 4 files created/modified |

## Verification Results

- `yarn typecheck` (tsc --noEmit): 0 errors in project source (pre-existing .next/ type errors excluded — unrelated to this plan)
- `yarn test` (full suite): 321/321 tests pass (311 pre-existing + 10 new)
- SEC-01 gate: `eq("profile_id")` present in all 4 delete module files
- SEC-03 gate: 0 delete actions import `createAdminClient` (only `delete-account.ts` may)
- SEC-04 gate: 0 `for (const` loops in bulk action files

## Deviations from Plan

None — plan executed exactly as written.

## TDD Gate Compliance

- RED gate (test commit): 03d5423 — `test(01-01): add failing RED specs...`
- GREEN gate (feat commit): c89d3fb — `fix(01-01): fix IDOR in single-delete modules...`
- GREEN gate (feat commit): c4ca889 — `feat(01-01): create batched bulk-delete modules...`

All three gates present in git log. RED specs failed correctly before implementation; all 10 specs GREEN after implementation.

## Known Stubs

None. All delete functions are fully implemented with real ownership filters and real storage calls.

## Threat Flags

No new security surface introduced. This plan closes existing IDOR threats (T-01-01, T-01-02, T-01-03) as catalogued in the plan's threat model.

## Self-Check: PASSED

All files verified present:
- modules/prescriptions/delete-prescription.ts: FOUND
- modules/prescriptions/delete-prescriptions-bulk.ts: FOUND
- modules/medical-certificates/delete-medical-certificate.ts: FOUND
- modules/medical-certificates/delete-medical-certificates-bulk.ts: FOUND
- modules/prescriptions/delete-prescription.spec.ts: FOUND
- modules/prescriptions/delete-prescriptions-bulk.spec.ts: FOUND
- modules/medical-certificates/delete-medical-certificate.spec.ts: FOUND
- modules/medical-certificates/delete-medical-certificates-bulk.spec.ts: FOUND
- actions/prescriptions/delete-prescription.ts: FOUND
- actions/prescriptions/delete-prescriptions-bulk.ts: FOUND
- actions/medical-certificates/delete-medical-certificate.ts: FOUND
- actions/medical-certificates/delete-medical-certificates-bulk.ts: FOUND

Commits verified:
- 03d5423: test(01-01) — Task 1 RED specs
- c89d3fb: fix(01-01) — Task 2 IDOR fix
- c4ca889: feat(01-01) — Task 3 bulk modules
