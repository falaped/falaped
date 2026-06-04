---
phase: 1
slug: security-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-04
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `node:test` runner + `tsx` |
| **Config file** | none — inline script: `find modules lib -name '*.spec.ts' \| xargs tsx --test` |
| **Quick run command** | `yarn test` |
| **Full suite command** | `yarn typecheck && yarn lint && yarn test && yarn build` |
| **Estimated runtime** | ~30 seconds (quick) |

---

## Sampling Rate

- **After every task commit:** Run `yarn test`
- **After every plan wave:** Run `yarn typecheck && yarn lint && yarn test && yarn build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | SEC-01 | TBD | Doctor deleting another doctor's prescription returns no-op (0 rows affected) | unit (mocked Supabase) | `tsx --test modules/prescriptions/delete-prescription.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SEC-01 | TBD | Doctor deleting own prescription succeeds | unit | `tsx --test modules/prescriptions/delete-prescription.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SEC-01 | TBD | Same ownership tests for medical certificates | unit | `tsx --test modules/medical-certificates/delete-medical-certificate.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SEC-03 | TBD | `server-admin.ts` not imported by any action other than `delete-account.ts` | static | `grep -r "createAdminClient" actions/ --include="*.ts" \| grep -v delete-account` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SEC-04 | TBD | Bulk delete of 10 prescriptions issues exactly one DB call and one storage call | unit (spy/mock) | `tsx --test modules/prescriptions/delete-prescriptions-bulk.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | HYG-04 | TBD | `package.json` has explicit semver for `@supabase/*` | static | `yarn install --frozen-lockfile` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TEST-03 | TBD | CI workflow exists and passes typecheck, lint, test on push | integration | GitHub Actions run | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs to be filled by planner — map derived from RESEARCH.md Validation Architecture.*

---

## Wave 0 Requirements

- [ ] `modules/prescriptions/delete-prescription.spec.ts` — stubs for SEC-01 (ownership no-op, own delete success)
- [ ] `modules/prescriptions/delete-prescriptions-bulk.spec.ts` — stubs for SEC-04 (single DB call, single storage call)
- [ ] `modules/medical-certificates/delete-medical-certificate.spec.ts` — stubs for SEC-01 (certificates)
- [ ] `modules/medical-certificates/delete-medical-certificates-bulk.spec.ts` — stubs for SEC-04 (certificates)
- [ ] `.github/workflows/ci.yml` — covers TEST-03
- [ ] Lightweight `SupabaseClient` mock implementing `.from().delete().eq().in()` chain (module pattern with injected client makes this straightforward)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cross-doctor delete is a no-op against staging | SEC-01 | RLS + live DB behavior can't be fully proven by mocked unit tests | Log in as doctor A on staging, attempt delete action with doctor B's document UUID, confirm row untouched |
| Every `public.*` table has `rowsecurity = true` | SEC-02 | Requires live database query | Run `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'` via Supabase MCP/SQL editor |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
