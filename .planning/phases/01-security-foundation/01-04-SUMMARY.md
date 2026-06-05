---
phase: 01-security-foundation
plan: 04
subsystem: build-infra
tags: [github, branch-protection, ci-enforcement, gh-cli]
dependency_graph:
  requires: [ci-pipeline]
  provides: [enforced-ci-gate, protected-main]
  affects: [all-future-merges]
tech_stack:
  added: [gh-cli]
  patterns: [required-status-check-protection]
key_files:
  created: []
  modified:
    - eslint.config.mjs (ignores for vendored/generated files, ^_ unused-vars pattern)
    - app/dashboard/layout.tsx (dead imports removed)
    - components/dashboard/cases/case-empty-state.tsx (dead type removed)
    - components/dashboard/patients/patients-table.tsx (dead import removed)
    - modules/falaped-assistant/handlers/chat-handler.ts (dead import removed)
    - modules/falaped-assistant/handlers/review-guardian-alert-handler.ts (dead import removed)
    - modules/falaped-assistant/handlers/suggest-guardian-questions-handler.ts (dead assignment removed)
    - modules/falaped-assistant/lib/patient-profile-parsers.ts (dead import removed)
decisions:
  - Executed inline by the orchestrator (not a subagent) — background executor could not obtain Bash permission for gh commands
  - Repo visibility changed to PUBLIC by the user — GitHub Free does not allow branch protection on private repos (403 "Upgrade to GitHub Pro"); user chose public over upgrading
  - enforce_admins false (per plan D-10) — solo developer keeps emergency direct-push bypass; confirmed working ("Bypassed rule violations" on push)
  - required_pull_request_reviews null (per plan) — no team, only the green check is required
  - Deviation (Rule 3 — blocking issue): first CI run on main FAILED with 608 lint errors; fixed in this plan because protection makes red CI block all merges. 507 errors were vendored public/vendor/lame.min.js, 65 generated types/validator.ts (both now eslint-ignored), 28 were _-prefixed mock params in Wave 1 spec files (standard argsIgnorePattern "^_" added), 8 were genuinely dead imports/vars removed across 7 app files
metrics:
  duration: "~45 minutes (including GitHub plan blocker resolution and CI lint fix)"
  completed: "2026-06-05"
  tasks_completed: 2
  files_changed: 8
---

# Plan 01-04 Summary: Branch Protection on main (TEST-03 / D-10)

## What was built

A branch-protection rule on `main` in `github.com/falaped/falaped` requiring the
`ci` status check to pass before merge, configured via `gh api` and verified by
read-back and by live enforcement messages on push.

## Final protection state (read back from GitHub API)

```json
{
  "required_status_checks": { "strict": true, "contexts": ["ci"] },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null
}
```

## Task outcomes

1. **Task 1 — configure protection via gh CLI**: `gh` CLI installed (brew, ARM) and
   authenticated as `falaped`. First PUT returned 403 — GitHub Free does not support
   branch protection on private repos. User made the repo public; PUT then succeeded.
   Read-back confirms `contexts: ["ci"]`, `strict: true`, `enforce_admins: false`.
2. **Task 2 — human-verify checkpoint**: approved by user. Enforcement evidence:
   direct push to main emitted `remote: Bypassed rule violations ... Required status
   check "ci" is expected` (rule active; admin bypass per design). CI run
   27021170059 on main is green (`state: success`).

## Deviation: CI lint gate was red (blocking, fixed here)

The first-ever CI run (27019262971) failed at `yarn lint` with 608 errors. With
protection live, a permanently-red `ci` would block every future PR merge, so the
gate was made green-able as part of this plan:

- `eslint.config.mjs`: added `ignores` for `public/vendor/**`, `types/validator.ts`,
  `types/routes.d.ts`, `.next/**`; added `@typescript-eslint/no-unused-vars` with
  `argsIgnorePattern/varsIgnorePattern/caughtErrorsIgnorePattern: "^_"`.
- Removed 8 dead imports/vars across 7 application files (no behavior change;
  321/321 tests still pass, `tsc --noEmit` clean).
- Fix commit `b09a464` pushed; CI run 27021170059 completed **success**.

## Verification

- `gh api repos/falaped/falaped/branches/main/protection` → `required_status_checks.contexts` includes `ci` ✓
- `enforce_admins` false, no review requirement ✓
- Latest CI run on main: success ✓
- User approved the red-blocks/green-merges checkpoint ✓

## Self-Check: PASSED
