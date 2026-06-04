# Testing Patterns

**Analysis Date:** 2026-06-04

## Framework & Runner

- **Runner:** Node's built-in `node:test` with `node:assert/strict` — no Jest, no Vitest
- **Execution:** `tsx --test` via `package.json` scripts:
  - `yarn test` — run all `*.spec.ts`
  - `yarn test:watch` — watch mode
  - `yarn test:assistant` — assistant-focused subset
- **Known issue:** `yarn test` currently fails locally due to a corepack/yarn binary problem (`Cannot find module .../yarn/1.22.22/bin/yarn.js`) — environment/tooling issue, not a test-code problem (see CONCERNS.md)

## Test File Organization

- 31 `*.spec.ts` files, **co-located** with source in `modules/` and `lib/`
- Naming: `<source-name>.spec.ts` next to `<source-name>.ts`
- Heaviest coverage: `modules/falaped-assistant/**` (parsers, intent detection, turn queue, planning) and `modules/groq/lib/**` (response parsing, JSON fence stripping, safety)
- `lib/` tests cover pure UI helpers (`brazilian-date-form`, `patient-chart-bmi`, `get-patient-initials`, `sort-patients-for-new-case`)

## Test Styles

**Dominant — flat `test()` blocks:**
```ts
import test from "node:test"
import assert from "node:assert/strict"

test("normalizes accented text", () => {
  assert.equal(normalizeText("café"), "cafe")
})
```

**Exception:** `lib/brazilian-date-form.spec.ts` uses `describe`/`it` style — both are valid in `node:test`, but flat `test()` is the project default.

## What Gets Tested

- **Pure functions only** — parsers, formatters, classifiers, queue/planning logic
- No mocks, no stubs, no `beforeEach`/`afterEach` hooks
- No React/component tests, no integration tests, no E2E
- Modules with Supabase/Groq side effects are **not** tested (they'd require mocking the injected client — currently unexercised)

## Assertions

- `assert.equal` / `assert.deepEqual` from `node:assert/strict`

## Adding New Tests

1. Extract logic into a pure function in `modules/<domain>/` or `lib/`
2. Create `<name>.spec.ts` next to it
3. Use flat `test("...", () => {})` blocks with `node:assert/strict`
4. Run with `yarn test` (or `npx tsx --test <file>` for a single file)

## Coverage Gaps

- Server actions (`actions/**`) — untested
- Supabase-coupled module functions — untested
- UI components and route handlers — untested
- No coverage tooling configured (no `c8`/`nyc`)

---

*Testing analysis: 2026-06-04*
