---
phase: 02-foto-privada-do-paciente
plan: 02
subsystem: patient-photo
tags: [supabase, storage, signed-url, avatar, consent, lgpd, compression, idor]

# Dependency graph
requires:
  - phase: 02-foto-privada-do-paciente
    provides: "patients.photo_path/consent_* columns, private patient-photos bucket + RLS, PATIENT_PHOTOS_BUCKET constant, uploadPatientPhotoSchema, two Wave-0 RED specs"
provides:
  - "compressPatientPhoto client util (browser-image-compression wrapper)"
  - "uploadPatientPhoto / updatePatientPhoto modules (validate+upsert / ownership-scoped persist)"
  - "getPatientPhotoSignedUrl (singular TTL 60s) + getPatientsPhotoSignedUrls (batch, no N+1)"
  - "uploadPatientPhotoAction (auth + paid + Zod consent + persist + revalidate)"
  - "patient-form-photo-field.tsx (file input + blocking consent checkbox)"
  - "<AvatarImage> on hero, list, and case header surfaces (server-resolved signed URLs)"
affects: [02-03-delete-photo-and-phase-gate, vaccination-photo-context]

# Tech tracking
tech-stack:
  added:
    - "browser-image-compression@2.0.2 (MIT) — client-side photo compression (D-09)"
  patterns:
    - "Private storage: store object path, sign at render with short TTL, never persist the URL (D-02/T-02-07)"
    - "Singular helper feeds single surfaces (hero, case header); batch createSignedUrls feeds the list (no N+1)"
    - "IDOR backstop: .eq('id').eq('profile_id') on the photo update + profile_id storage path prefix"
    - "MIME allowlist png/jpeg/webp with SVG excluded, enforced in module; consent z.literal(true) enforced in action"
    - "Radix <AvatarImage> for signed-URL avatars — never next/image (Pitfall 5); graceful AvatarFallback initials"

key-files:
  created:
    - lib/compress-image.ts
    - modules/patients/upload-patient-photo.ts
    - modules/patients/update-patient-photo.ts
    - modules/patients/get-patient-photo-signed-url.ts
    - modules/patients/get-patients-photo-signed-urls.ts
    - actions/patients/upload-patient-photo.ts
    - components/dashboard/patients/patient-form/patient-form-photo-field.tsx
  modified:
    - package.json
    - yarn.lock
    - actions/patients/index.ts
    - actions/index.ts
    - components/dashboard/patients/patient-form/patient-form-personal-section.tsx
    - components/dashboard/patients/patient-form/patient-form.tsx
    - components/dashboard/patients/patient-detail-content.tsx
    - components/dashboard/patients/patient-detail-view.tsx
    - components/dashboard/patients/patient-detail-hero.tsx
    - components/dashboard/patients/patients-table.tsx
    - components/dashboard/patients/patients-content.tsx
    - components/dashboard/patients/patients-toolbar-and-list.tsx
    - components/dashboard/cases/case-detail-content.tsx
    - components/dashboard/cases/case-patient-block.tsx
    - components/dashboard/cases/case-patient-info.tsx
    - modules/cases/get-case-by-id.ts

key-decisions:
  - "D-02 store path, sign at render (singular + batch helpers, no persisted URL)"
  - "D-03 profile_id scope in storage path + .eq('profile_id') update backstop"
  - "D-04 blocking consent checkbox; consent === true via z.literal(true) server-side"
  - "D-06 consent re-required on replace; consent_at written on every upload"
  - "D-07 classic file input, no capture attribute"
  - "D-08 single replaceable photo via upsert"
  - "D-09 client-side compression (browser-image-compression) — Free plan, no native transforms"
  - "D-10 photo on three surfaces (hero, list, case header); D-11 circular avatar + initials fallback"
  - "List TTL raised to 300s (planner discretion, still private) — Pitfall 1"

patterns-established:
  - "Singular vs batch signed-URL helpers split by call site (single surface vs list)"
  - "Photo field threaded into patient form only in edit mode (needs an existing patientId)"

requirements-completed: [PHOTO-01, PHOTO-02]

# Metrics
duration: ~20 min active work
completed: 2026-06-28
---

# Phase 02 Plan 02: Patient photo upload + display slice Summary

**End-to-end happy path for PHOTO-01 + PHOTO-02: a doctor compresses a photo client-side, uploads it through a gated consent-validated Server Action that stores only the object path, and the photo then renders on the hero, the patients-list thumbnail, and the case header via short-lived server-resolved signed URLs — with graceful initials fallback.**

## Performance

- **Duration:** ~20 min active work
- **Completed:** 2026-06-28
- **Tasks:** 6 (Task 1 was an operator-approved package-legitimacy gate — no code)
- **Files:** 24 (7 created, 17 modified)

## Accomplishments

- Installed `browser-image-compression@2.0.2` (operator-approved gate) and added `compressPatientPhoto` thin wrapper (D-09)
- Built four patient-photo modules: upload (MIME allowlist + 2 MB cap + upsert, returns path), ownership-scoped update, singular signed-URL helper, batch signed-URLs helper (one `createSignedUrls`, no N+1)
- Turned the two Plan-01 Wave-0 RED specs GREEN; `yarn typecheck` returned to exit 0
- Created the gated upload Server Action (auth + paid gate + `z.literal(true)` consent server-side + persist `consent_at` on every upload + revalidate), exported from both barrels
- Added the patient-form photo field: classic file input (no `capture`), preview, compression + upload pipeline, and a blocking consent checkbox that re-requires consent on replacement (D-06)
- Wired `<AvatarImage>` on all three surfaces with server-side URL resolution: singular helper for the hero (`patient-detail-content.tsx`) and the case header (`case-detail-content.tsx`), batch helper for the list (`patients-content.tsx`)

## Task Commits

1. **Task 1 — Package legitimacy gate:** operator-approved (no code commit); `browser-image-compression` 2.0.2, MIT, public repo, ~1M+ weekly downloads, exact spelling, no postinstall.
2. **Task 2 — Install package + compression util:** `c5440e3` (feat)
3. **Task 3 — Four patient photo modules (TDD GREEN):** `98cfde6` (feat)
4. **Task 4 — Gated upload Server Action:** `4590973` (feat)
5. **Task 5 — Form photo field + consent checkbox:** `888c925` (feat)
6. **Task 6 — Display on hero/list/case header:** `f94541f` (feat)

## Files Created/Modified

See frontmatter `key-files`. Highlights:
- `modules/patients/upload-patient-photo.ts` — allowlist png/jpeg/webp (SVG excluded), 2 MB cap, upsert to `profileId/patientId.ext`, returns path (never URL)
- `modules/patients/update-patient-photo.ts` — `.eq("id").eq("profile_id")` IDOR backstop
- `modules/patients/get-patient-photo-signed-url.ts` / `get-patients-photo-signed-urls.ts` — singular (TTL 60s) + batch helpers, both null-graceful
- `actions/patients/upload-patient-photo.ts` — paid gate + consent Zod gate + orchestration + revalidate
- `components/dashboard/patients/patient-form/patient-form-photo-field.tsx` — file input + preview + blocking consent + PT-BR states/errors
- `modules/cases/get-case-by-id.ts` — `CasePatientDetail` now carries `photo_path` (pure query; no signed-URL resolution in the module)

## Verification Results

- **`yarn test`:** 399 tests, 399 pass, 0 fail. The two Plan-01 Wave-0 specs (`upload-patient-photo.spec.ts`, `update-patient-photo.spec.ts`) are now GREEN.
- **`yarn typecheck`:** exit 0 after Task 3 and after every subsequent code task (the TDD-RED `TS2307` tension from Plan 01 is resolved).
- **Anti-pattern greps (all clean):** no `getPublicUrl`/public bucket in the photo modules; signed URL never persisted in the update module or action; `image/svg` absent from the upload allowlist; `next/image` absent from the three avatar files; batch `createSignedUrls` used in `patients-content.tsx`; singular `getPatientPhotoSignedUrl` invoked in `patient-detail-content.tsx` and `case-detail-content.tsx`; `.eq("profile_id")` ownership scoping in the update module.

## Decisions Made

All plan-specified decisions implemented as written (D-02/D-03/D-04/D-06/D-07/D-08/D-09/D-10/D-11). List TTL set to 300s (planner discretion, still private bucket — Pitfall 1).

## Deviations from Plan

### Auto-fixed / wiring adjustments

**1. [Rule 3 - Blocking] Photo field mounts only in edit mode (needs existing patientId)**
- **Found during:** Task 5
- **Issue:** `PatientFormPersonalSection` is shared by create and edit modes, but the upload action requires an existing `patientId` (the storage object is `profile_id/patient_id.ext` and the DB row must exist to persist `photo_path`). In create mode the patient does not exist yet.
- **Fix:** Added an optional `photo` prop to `PatientFormPersonalSection`; the photo field renders only when provided. `patient-form.tsx` supplies it solely in the edit branch (`props.patient.id` / `props.patient.name`). Matches the UI-SPEC (field lives in "Identificação e contato") without breaking the create flow.
- **Files modified:** `patient-form-personal-section.tsx`, `patient-form.tsx`, `patient-form-photo-field.tsx`
- **Commit:** `888c925`

**2. [Rule 3 - Blocking] Rendered `CasePatientBlock` in the case detail view**
- **Found during:** Task 6
- **Issue:** The plan's case-header wiring threads `photoUrl` through `CasePatientBlock` → `CasePatientInfo`, but `CasePatientBlock` was not actually rendered anywhere in the case detail render chain (the existing case header is `CaseDetailHeader`). Without rendering the block, the case-header avatar surface would never appear.
- **Fix:** Imported and rendered `<CasePatientBlock patient={caseDetail.patient} photoUrl={casePhotoUrl} />` immediately after `CaseDetailHeader` in `case-detail-content.tsx`, exactly the prop shape the plan specifies. This realizes the PHOTO-02 case-header surface and the avatar-with-initials-fallback in `case-patient-info.tsx`.
- **Files modified:** `case-detail-content.tsx`, `case-patient-block.tsx`, `case-patient-info.tsx`
- **Commit:** `f94541f`

**3. [Adjustment] Avatar `photoUrl` carried via an intersection type on the list path**
- **Found during:** Task 6
- **Issue:** The DB `Patient` type does not (and should not) carry a transient `photoUrl`.
- **Fix:** Used a local `PatientWithPhoto = Patient & { photoUrl?: string | null }` in `patients-content.tsx` / `patients-toolbar-and-list.tsx` / `patients-table.tsx` so the resolved signed URL flows down without polluting the persisted model type.
- **Commit:** `f94541f`

## Authentication Gates

None. (Task 1 was a package-legitimacy human-verify gate, pre-resolved/approved by the operator — not an auth gate.)

## Known Stubs

None. The slice is the full happy path: compression → gated upload → persist → three display surfaces. (Photo deletion / phase-gate human verification is the scope of Plan 02-03.)

## Threat Surface Notes

No new threat surface beyond the plan's `<threat_model>`. The implementation mitigates T-02-04 (SVG/non-image excluded from the allowlist), T-02-05 (server-side `z.literal(true)` consent + `consent_at` on every upload), T-02-06 (`.eq('profile_id')` + profile_id path prefix, never trusting the client `patientId`), T-02-07 (only `photo_path` stored; signed URLs resolved server-side at render, never persisted), and T-02-08 (client compression + 2 MB module cap).

## TDD Gate Compliance

- RED gate: Plan 01 `test(02-01)` commit `24ba086` (two failing specs).
- GREEN gate: Task 3 `feat(02-02)` commit `98cfde6` turns both specs GREEN; typecheck exit 0.

## Next Phase Readiness

- The upload + display path is complete. Plan 02-03 adds photo deletion (storage object + `photo_path`/consent reference) and runs the unauthenticated-`curl` success-criterion-2 test plus the phase-gate human verification (upload a photo, confirm it on hero/list/case header).

## Self-Check: PASSED

- FOUND all 7 created files + 02-02-SUMMARY.md
- FOUND commits: c5440e3, 98cfde6, 4590973, 888c925, f94541f
