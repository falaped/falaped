---
phase: 01-security-foundation
plan: 02
subsystem: build-infra
tags: [ci, dependency-pinning, hygiene, github-actions, yarn]
dependency_graph:
  requires: []
  provides: [ci-pipeline, frozen-lockfile, pinned-supabase-deps, clean-migrations]
  affects: [all-subsequent-phases]
tech_stack:
  added: [github-actions]
  patterns: [frozen-lockfile-ci, stub-env-ci-build]
key_files:
  created:
    - .github/workflows/ci.yml
    - supabase/docs/run_prescriptions_manual.sql
  modified:
    - package.json
    - yarn.lock
  deleted:
    - supabase/migrations/run_prescriptions_manual.sql (renamed to supabase/docs/)
decisions:
  - Pin Supabase packages to caret ranges (^0.10.3, ^2.107.0) to allow patch updates while enforcing lockfile-frozen reproducibility
  - Use yarn build stub env (NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) to satisfy lib/env.ts Zod schema without real credentials
  - Scaffold directories (app/api/consultation-audio/, modules/consultation-audio/) were already absent in this worktree — D-12 already satisfied at base
metrics:
  duration: "~4 minutes"
  completed: "2026-06-05"
  tasks_completed: 2
  files_changed: 4
---

# Phase 01 Plan 02: Build Infra & Hygiene Summary

**One-liner:** Pinned `@supabase/ssr@^0.10.3` and `@supabase/supabase-js@^2.107.0`, regenerated lockfile, created GitHub Actions CI (typecheck + lint + test + build with frozen lockfile), and relocated manual SQL out of migrations (D-11).

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Pin Supabase deps and relocate manual SQL | ff44a01 | package.json, yarn.lock, supabase/docs/run_prescriptions_manual.sql |
| 2 | Add GitHub Actions CI workflow | 09545a4 | .github/workflows/ci.yml |

## What Was Built

### Task 1: Pin Supabase Dependencies and Clean Dead Scaffolds

- **`package.json`**: Replaced `"@supabase/ssr": "latest"` with `"^0.10.3"` and `"@supabase/supabase-js": "latest"` with `"^2.107.0"`. No other `"latest"` entries remain.
- **`yarn.lock`**: Regenerated resolving `@supabase/ssr` to `0.10.3` and `@supabase/supabase-js` to `2.107.0`. Confirmed `yarn install --frozen-lockfile` exits 0.
- **`supabase/docs/run_prescriptions_manual.sql`**: Moved from `supabase/migrations/` via `git mv` with no timestamp prefix — it is now historical documentation, not a migration candidate (D-11).
- **Scaffold directories**: `app/api/consultation-audio/transcribe/`, `app/api/consultation-audio/presigned-upload/`, and `modules/consultation-audio/` were already absent in the worktree base. D-12 already satisfied.
- **`yarn test`**: All 311 tests pass after cleanup.

### Task 2: GitHub Actions CI Workflow

- **`.github/workflows/ci.yml`**: Workflow named `CI` triggered on `push` to all branches (`["**"]`) and `pull_request` targeting `main`.
- Single job `ci` on `ubuntu-latest` with steps: `actions/checkout@v4` → `actions/setup-node@v4` (node-version: "20", cache: "yarn") → `yarn install --frozen-lockfile` → `yarn typecheck` → `yarn lint` → `yarn test` → `yarn build`.
- Build step supplies `NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: placeholder-key-for-ci-build` to satisfy `lib/env.ts` Zod schema at build time.
- **Local stub build**: `yarn build` with stub env vars exits 0. No build-time DB queries confirmed (Assumption A2 verified). The `◐ Partial Prerender` pages are dynamically server-rendered on demand, not at build time.

## Verification Results

| Criterion | Status |
|-----------|--------|
| `package.json` has no `"latest"` | PASS |
| `@supabase/ssr` pinned to `^0.10.3` | PASS |
| `@supabase/supabase-js` pinned to `^2.107.0` | PASS |
| `yarn install --frozen-lockfile` exits 0 | PASS |
| `.github/workflows/ci.yml` exists, valid YAML | PASS |
| Workflow triggers push all branches + PR to main | PASS |
| Steps: frozen-lockfile install, typecheck, lint, test, build | PASS |
| Build step has stub env vars | PASS |
| Local `yarn build` with stubs exits 0 | PASS |
| `supabase/docs/run_prescriptions_manual.sql` exists, no timestamp | PASS |
| `supabase/migrations/run_prescriptions_manual.sql` gone | PASS |
| Scaffold directories absent | PASS |
| `yarn test` passes (311/311) | PASS |

## Requirements Fulfilled

- **HYG-04**: Supabase packages pinned to explicit semver ranges; dead scaffolds removed
- **TEST-03**: CI pipeline with `yarn install --frozen-lockfile` runs typecheck, lint, test, build on every push

## Deviations from Plan

### Noted Observations

**1. [Noted - Non-issue] Scaffold directories already absent**
- **Found during:** Task 1 pre-execution check
- **Issue:** `app/api/consultation-audio/transcribe/`, `app/api/consultation-audio/presigned-upload/`, and `modules/consultation-audio/` did not exist in the worktree or git tree — they were never part of the commit history at this base. No `git rm` was required.
- **Action:** Verified via `git ls-files` and filesystem check. D-12 acceptance criterion already satisfied.
- **Impact:** No change from plan — all other acceptance criteria met.

**2. [Noted - yarn via corepack] Corepack yarn binary not cached**
- **Found during:** Task 1 yarn install
- **Issue:** The `yarn` binary via corepack pointed to an empty `~/.cache/node/corepack/v1/yarn/1.22.22/bin/` directory (module not found error). Used `/opt/homebrew/bin/yarn` (v1.22.22 same version) as equivalent.
- **Impact:** Functionally identical — same yarn version, same lockfile output.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The `.github/workflows/ci.yml` only runs CI commands on the GitHub Actions runner infrastructure — no new application attack surface.

| T-ID | Status |
|------|--------|
| T-01-05 (supply-chain pinning) | Mitigated — caret ranges + frozen-lockfile |
| T-01-SC (npm install during plan) | N/A — only existing official packages re-pinned |
| T-01-06 (double-apply SQL) | Mitigated — manual SQL moved to docs/, no timestamp prefix |

## Known Stubs

None. This plan produces only config, build infra, and file moves — no UI components or data flows.

## Self-Check: PASSED

- `ff44a01` commit exists: confirmed (`git log --oneline -4`)
- `09545a4` commit exists: confirmed (`git log --oneline -4`)
- `.github/workflows/ci.yml` exists: confirmed
- `supabase/docs/run_prescriptions_manual.sql` exists: confirmed
- `supabase/migrations/run_prescriptions_manual.sql` gone: confirmed
- `package.json` has `^0.10.3` and `^2.107.0`, no `"latest"`: confirmed
