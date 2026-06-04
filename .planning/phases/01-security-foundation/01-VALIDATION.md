---
phase: 1
slug: security-foundation
status: ready
nyquist_compliant: true
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
| 01-01-T1/T2 | 01-01 | 1 | SEC-01 | T-01-01 | Doctor deleting another doctor's prescription returns no-op (0 rows affected) | unit (mocked Supabase) | `tsx --test modules/prescriptions/delete-prescription.spec.ts` | ❌ W0 | ⬜ pending |
| 01-01-T1/T2 | 01-01 | 1 | SEC-01 | T-01-01 | Doctor deleting own prescription succeeds | unit | `tsx --test modules/prescriptions/delete-prescription.spec.ts` | ❌ W0 | ⬜ pending |
| 01-01-T1/T2 | 01-01 | 1 | SEC-01 | T-01-01 | Same ownership tests for medical certificates | unit | `tsx --test modules/medical-certificates/delete-medical-certificate.spec.ts` | ❌ W0 | ⬜ pending |
| 01-01-T3 | 01-01 | 1 | SEC-03 | T-01-02 | `server-admin.ts` not imported by any action other than `delete-account.ts` | static | `grep -rc "createAdminClient" actions/ --include="*.ts" \| grep -v "delete-account" \| grep -v ":0" \| wc -l` | ❌ W0 | ⬜ pending |
| 01-01-T1/T3 | 01-01 | 1 | SEC-04 | T-01-03 | Bulk delete of 10 prescriptions issues exactly one DB call and one storage call | unit (spy/mock) | `tsx --test modules/prescriptions/delete-prescriptions-bulk.spec.ts` | ❌ W0 | ⬜ pending |
| 01-02-T1 | 01-02 | 1 | HYG-04 | T-01-05 | `package.json` has explicit semver for `@supabase/*` | static | `yarn install --frozen-lockfile` | ❌ W0 | ⬜ pending |
| 01-02-T2 | 01-02 | 1 | TEST-03 | T-01-05 | CI workflow exists and passes typecheck, lint, test, build on push | integration | GitHub Actions run | ❌ W0 | ⬜ pending |
| 01-04-T1/T2 | 01-04 | 2 | TEST-03 | T-01-11 | Branch protection blocks merge to main unless CI green | integration | `gh api repos/falaped/falaped/branches/main/protection` | ❌ W0 | ⬜ pending |
| 01-03-T3 | 01-03 | 2 | SEC-02 | T-01-07 | Every public.* table has rowsecurity=true | manual (live DB) | `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'` via MCP | n/a live | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs mapped to plans 01-01 .. 01-04 by planner (2026-06-04).*

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
