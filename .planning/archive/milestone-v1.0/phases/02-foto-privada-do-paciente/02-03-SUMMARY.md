---
phase: 02-foto-privada-do-paciente
plan: 03
subsystem: patient-photo
tags: [supabase, storage, delete, lgpd, idor, consent, alert-dialog]

# Dependency graph
requires:
  - phase: 02-foto-privada-do-paciente
    provides: "patients.photo_path/consent_* columns, private patient-photos bucket + RLS, PATIENT_PHOTOS_BUCKET, updatePatientPhoto, getPatientById, patient-form-photo-field.tsx"
provides:
  - "deletePatientPhoto module (idempotent storage.remove via user client, owner-scoped by RLS)"
  - "removePatientPhotoAction (auth + paid + owner-scoped: remove object + reset photo_path/consent_given/consent_at)"
  - "delete-patient now purges the patient's photo object before the row delete (no orphaned sensitive data)"
  - "delete-patient.spec.ts coverage: removes-object + ownership backstop"
  - "remove-photo affordance + AlertDialog confirmation in the photo field"
affects: [vaccination-photo-context]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Idempotent storage delete: no-op when photo_path is null (nothing stored)"
    - "User client (not service-role) for storage.remove — owner RLS authorizes self-delete (Pitfall 2)"
    - "Owner-scoped read via getPatientById(profile.id) before destructive remove (T-02-11 IDOR backstop)"
    - "Remove object BEFORE row delete so the sensitive object cannot orphan (LGPD)"
    - "Destructive UI gated behind AlertDialog confirmation"

key-files:
  created:
    - modules/patients/delete-patient-photo.ts
    - actions/patients/remove-patient-photo.ts
    - modules/patients/delete-patient.spec.ts
  modified:
    - modules/patients/delete-patient.ts
    - actions/patients/index.ts
    - actions/index.ts
    - components/dashboard/patients/patient-form/patient-form-photo-field.tsx

key-decisions:
  - "Remove resets both storage object AND DB reference (photo_path/consent_given/consent_at) — success criterion 3"
  - "deletePatient unlinks cases, reads photo_path owner-scoped, removes object, then deletes row"
  - "Idempotent deletePatientPhoto (null path = no-op) so delete-patient is safe for photoless patients"
  - "removePatientPhotoAction owner-scoped via getPatientById, never trusting the client patientId alone"

patterns-established:
  - "Idempotent storage-object delete reused by both remove-photo and delete-patient"

requirements-completed: [PHOTO-03]

# Metrics
duration: ~15 min active work (reconstructed at close-out)
completed: 2026-06-29
---

# Phase 02 Plan 03: Remove patient photo + delete-patient cleanup + phase gate Summary

**Removing a patient's photo (and deleting a patient) now purges BOTH the storage object in the private `patient-photos` bucket and the DB reference — owner-scoped, idempotent, behind an AlertDialog confirmation — closing the PHOTO-03 deletion/LGPD requirement so no orphaned sensitive data remains.**

> **Note — close-out reconciliation (2026-06-29).** This plan was implemented and committed across `ca769f3`, `69cf2a2`, `4eb4998`, but its SUMMARY was never written (a mid-session interruption → "mark-and-skip" in STATE). This SUMMARY was reconstructed at close-out from the committed code; verification ran afterward (see `/gsd-verify-work 02` → `02-UAT.md` and the phase `VERIFICATION.md`).

## Performance

- **Duration:** ~15 min active work (reconstructed)
- **Completed:** 2026-06-29
- **Tasks:** 3
- **Files:** 7 (3 created, 4 modified)

## Accomplishments

- `deletePatientPhoto` module — idempotent `storage.remove([photoPath])` against `patient-photos`; no-op when `photo_path` is null; uses the user client so storage RLS authorizes the owner's self-delete (Pitfall 2); `[PATIENTS]`-tagged error only on real storage failure.
- `removePatientPhotoAction` — gated Server Action (auth + paid gate). Reads the patient owner-scoped via `getPatientById(supabase, patientId, profile.id)` (returns null on ownership mismatch → "Paciente não encontrado."), removes the storage object, then resets `photo_path: null`, `consent_given: false`, `consent_at: null` via `updatePatientPhoto`, and revalidates the list + detail routes. Exported from both barrels.
- `deletePatient` extended — unlinks cases (`patient_id = null`), reads `photo_path` owner-scoped, removes the storage object BEFORE the row delete (no orphaned sensitive data), then deletes the row (`.eq("id").eq("profile_id")` backstop).
- `delete-patient.spec.ts` — coverage that delete removes the storage object (bucket + path) and applies the ownership `.eq` filters; idempotent no-op when there is no photo.
- Photo field — remove-photo affordance with an `AlertDialog` confirmation (later relocated alongside the upload Dialog in quick task 260629-egq; the remove flow + confirmation were preserved).

## Task Commits

1. **Idempotent photo-delete module + delete-patient removes object:** `ca769f3` (feat)
2. **Remove-photo action + delete coverage spec:** `69cf2a2` (feat)
3. **Remove-photo affordance + AlertDialog confirmation:** `4eb4998` (feat)

## Verification Results

- **`yarn test`:** 402/402 pass (verified during quick task 260629-egq, which also touched the photo field). The `delete-patient.spec.ts` (removes-object + ownership) is GREEN.
- **`yarn typecheck`:** exit 0.
- **`yarn lint`:** clean on the touched files.
- **Security success-criterion 2 (PHOTO-03):** unauthenticated `curl` to a `patient-photos` object returns **HTTP 400** (not 200), on both the `/object/public` and `/object` routes — bucket is private. Verified 2026-06-29 (recorded in `02-UAT.md` test 10, `source: automated`).
- **Manual UAT (`02-UAT.md`):** 10/10 passed, 0 issues — including remove-photo (AlertDialog → initials fallback, persists after refresh) and delete-patient cleanup.

## Decisions Made

All plan `must_haves` implemented as written: remove resets object + DB reference; delete-patient purges the object; remove action owner-scoped behind a paid gate + AlertDialog; unauthenticated object access returns 400/403.

## Deviations from Plan

None functionally. The photo field's remove affordance (commit `4eb4998`) was subsequently reorganized when the upload flow moved into a Dialog (quick task 260629-egq); the remove-photo + AlertDialog behavior was preserved.

## Threat Surface Notes

Mitigates T-02-11 (owner-scoped destructive remove — `getPatientById(profile.id)` + `.eq("profile_id")`, never trusting the client `patientId`). No new threat surface beyond the plan's model. Private-bucket isolation re-confirmed by the unauthenticated-access probe (HTTP 400).

## Known Stubs

None. PHOTO-03 deletion is complete (remove-photo + delete-patient cleanup) and the phase-gate success criteria are verified.

## Self-Check: PASSED

- FOUND created files: `delete-patient-photo.ts`, `remove-patient-photo.ts`, `delete-patient.spec.ts`
- FOUND modified files: `delete-patient.ts`, `actions/patients/index.ts`, `actions/index.ts`, `patient-form-photo-field.tsx`
- FOUND commits: `ca769f3`, `69cf2a2`, `4eb4998`
