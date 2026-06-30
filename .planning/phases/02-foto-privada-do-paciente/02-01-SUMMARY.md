---
phase: 02-foto-privada-do-paciente
plan: 01
subsystem: database
tags: [supabase, storage, rls, postgres, zod, lgpd, patient-photo]

# Dependency graph
requires:
  - phase: 01-security-foundation
    provides: profiles.auth_user_id ownership model + paid-status gate reused by storage RLS predicate
provides:
  - "patients.photo_path / consent_given / consent_at columns (live DB)"
  - "private patient-photos storage bucket (public=false) with 4 owner-scoped RLS policies (live DB)"
  - "PATIENT_PHOTOS_BUCKET constant"
  - "Patient type + all three SELECT lists carry the new columns (gestational_age_weeks restored in get-patient-by-id)"
  - "uploadPatientPhotoSchema (z.literal(true) consent gate)"
  - "two Wave-0 RED spec scaffolds for the 02-02 upload/update modules"
affects: [02-02-upload-module, 02-03-ui-signed-url, vaccination-photo-context]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Private storage bucket + foldername[1] owner-scoped RLS (copy of prescriptions mold, swap bucket name)"
    - "Store object path (profile_id/patient_id.ext) not URL — D-02"
    - "Server-side consent gate via z.literal(true) — D-04"
    - "TDD Wave-0 RED scaffolds: specs import not-yet-built modules and fail intentionally"

key-files:
  created:
    - supabase/migrations/20260628010000_patients_add_photo.sql
    - supabase/migrations/20260628010100_storage_patient_photos_rls.sql
    - modules/patients/upload-patient-photo.spec.ts
    - modules/patients/update-patient-photo.spec.ts
  modified:
    - lib/constants.ts
    - modules/patients/types.ts
    - modules/patients/get-patient-by-id.ts
    - modules/patients/update-patient.ts
    - modules/patients/create-patient.ts
    - lib/schemas/patient.ts

key-decisions:
  - "D-01 new private bucket patient-photos (NOT reuse public logos bucket) — LGPD"
  - "D-02 store object path, never the URL"
  - "D-03 profile_id scope enforced in storage RLS via (storage.foldername(name))[1]"
  - "D-04 consent enforced server-side with z.literal(true)"
  - "D-05 consent_given + consent_at as minimal auditable consent proof"

patterns-established:
  - "Owner-scoped storage RLS predicate reused verbatim from prescriptions migration"
  - "Additive migrations only (add column if not exists), no drops"

requirements-completed: [PHOTO-03]

# Metrics
duration: ~9h elapsed (incl. blocking human-action checkpoint); ~10min active work
completed: 2026-06-28
---

# Phase 02 Plan 01: Private patient-photo storage + schema foundation Summary

**Private `patient-photos` bucket with owner-scoped storage RLS, three `patients` consent/photo columns, extended Patient model + selects, and a server-side consent-gated upload schema — all applied to the live DB.**

## Performance

- **Duration:** ~10 min active work (plan spanned ~9h wall-clock due to the blocking schema-push human-action checkpoint)
- **Started:** 2026-06-28T23:20:56Z (first task commit)
- **Completed:** 2026-06-28T23:29:53Z
- **Tasks:** 3
- **Files modified:** 10 (4 created, 6 modified)

## Accomplishments

- Added `photo_path`, `consent_given`, `consent_at` to `patients` and **applied to the live DB**
- Created the **private** `patient-photos` bucket (`public=false`) with 4 owner-scoped storage RLS policies — the success-criterion-2 anti-leak control — **applied to the live DB**
- Extended the `Patient` type and all three SELECT lists; restored the previously-missing `gestational_age_weeks` in `get-patient-by-id.ts` (pre-existing bug, RESEARCH OQ3)
- Added `PATIENT_PHOTOS_BUCKET` constant and `uploadPatientPhotoSchema` with a `z.literal(true)` server-side consent gate
- Laid two Wave-0 RED spec scaffolds for the 02-02 upload/update modules

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema + bucket migrations, constant, Patient model, selects, upload schema** - `5ad92ec` (feat)
2. **Task 2: Failing Wave-0 test scaffolds (TDD RED)** - `24ba086` (test)
3. **Task 3: [BLOCKING] Apply Supabase schema push to the live DB** - no code commit; applied directly to the remote Supabase project via the Supabase MCP `apply_migration` (both migrations, in timestamp order)

_Note: Task 2 is the TDD RED commit; the GREEN implementation lives in Plan 02-02._

## Files Created/Modified

- `supabase/migrations/20260628010000_patients_add_photo.sql` - Adds `photo_path`/`consent_given`/`consent_at` columns + PT-BR comment on `photo_path`
- `supabase/migrations/20260628010100_storage_patient_photos_rls.sql` - Private `patient-photos` bucket + 4 owner-scoped RLS policies (select/insert/update/delete)
- `lib/constants.ts` - `PATIENT_PHOTOS_BUCKET = "patient-photos"` with PT-BR doc comment
- `modules/patients/types.ts` - `Patient` extended with the three new columns
- `modules/patients/get-patient-by-id.ts` - PATIENT_SELECT now includes the photo columns + restored `gestational_age_weeks`
- `modules/patients/update-patient.ts` - returned columns mirror the new fields
- `modules/patients/create-patient.ts` - returned columns mirror the new fields
- `lib/schemas/patient.ts` - `uploadPatientPhotoSchema` with `z.literal(true)` consent gate
- `modules/patients/upload-patient-photo.spec.ts` - RED scaffold (SVG rejection, size rejection, valid-png path prefix)
- `modules/patients/update-patient-photo.spec.ts` - RED scaffold (update scoped by both `id` and `profile_id`)

## Live-DB Schema Push (Task 3)

Both migrations were applied to the live Supabase project via the Supabase MCP `apply_migration` (in timestamp order) after the operator authorized the blocking human-action checkpoint. All three required verification checks PASSED:

1. `patients` carries the 3 new columns (`photo_path`, `consent_given`, `consent_at`) — confirmed (count = 3).
2. `storage.buckets` has `patient-photos` with `public = false` — confirmed.
3. 4 storage RLS policies named "Patient photos%" exist on `storage.objects` — confirmed (count = 4).

## Verification Results

- **`yarn test`:** 397 tests, 395 pass, **2 fail** — the 2 failures are exactly the new Wave-0 specs (`upload-patient-photo.spec.ts`, `update-patient-photo.spec.ts`), which import modules that do not exist until Plan 02-02. This is the **expected, correct RED state**.
- **`yarn typecheck`:** exits **2** (non-zero) for the same reason — the project `tsconfig.json` includes `**/*.ts`, so it compiles the two RED specs whose imports (`@/modules/patients/upload-patient-photo`, `@/modules/patients/update-patient-photo`) resolve to not-yet-built modules. **The only two `tsc` errors are these two TS2307 module-not-found errors from the RED specs.** All production source typechecks clean; no error originates from non-test code. Typecheck returns to green once Plan 02-02 implements the two modules (TDD GREEN).

## Decisions Made

None beyond the plan-specified D-01..D-05, all implemented as written.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **`yarn typecheck` cannot exit 0 while the RED scaffolds are present.** The plan's final-check expectation (`yarn typecheck` exit 0) is in inherent tension with Task 2's TDD-RED design: the project tsconfig compiles all `.ts` files including the two specs, whose imports intentionally reference modules built in 02-02. Rather than weaken the committed RED scaffolds (e.g. stubbing the imports), the honest RED state was preserved and documented here. Typecheck goes green when 02-02 lands the GREEN implementation. No production code is affected.

## TDD Gate Compliance

- RED gate present: `test(02-01)` commit `24ba086` (two failing specs) ✓
- GREEN gate: intentionally deferred to Plan 02-02 (these are Wave-0 scaffolds for the next slice; this plan is a `type: execute` foundation plan, not a single-feature TDD plan).

## User Setup Required

None - no additional external service configuration required (the live-DB push was performed during Task 3 via the Supabase MCP).

## Next Phase Readiness

- The DB and private bucket are ready to receive a photo. Plan 02-02 implements `uploadPatientPhoto` / `updatePatientPhoto` to turn the two RED specs GREEN (restoring `yarn typecheck` to 0).
- Plan 02-03 wires the signed-URL read path and UI, and runs the unauthenticated-`curl` success-criterion-2 test against the now-private bucket.

## Self-Check: PASSED

- FOUND: `.planning/phases/02-foto-privada-do-paciente/02-01-SUMMARY.md`
- FOUND commit: `5ad92ec` (Task 1)
- FOUND commit: `24ba086` (Task 2)

---
*Phase: 02-foto-privada-do-paciente*
*Completed: 2026-06-28*
