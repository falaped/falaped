---
phase: 02-foto-privada-do-paciente
verified: 2026-06-29T15:05:00Z
status: passed
score: 11/11 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 2: Foto Privada do Paciente — Verification Report

**Phase Goal:** O médico anexa uma foto na identificação de cada criança e a vê no perfil, com a foto guardada em armazenamento privado acessível só ao médico dono — fechando a decisão de privacidade/LGPD (bucket privado, URL assinada, consentimento, exclusão) antes que qualquer atalho de "copiar o bucket público de logos" se espalhe.
**Verified:** 2026-06-29T15:05:00Z
**Status:** passed
**Re-verification:** No — initial verification
**Mode:** mvp (user-story outcome: foto privada anexada, exibida e excluível com escopo de dono)

## Goal Achievement

This is an MVP-mode phase. The goal decomposes into the three ROADMAP success criteria (= PHOTO-01/02/03). All three are observably true in the codebase, end-to-end wired, with the privacy control verified against the live DB.

### User Flow Coverage

| Step | Expected | Evidence in codebase | Status |
|------|----------|----------------------|--------|
| Médico anexa foto na identificação | File input + consent checkbox in a Dialog, compressed client-side, uploaded via gated action | `patient-form-photo-field.tsx` → `compressPatientPhoto` (l.169) → `uploadPatientPhotoAction` (l.177); `accept="image/png,image/jpeg,image/webp"`, NO `capture` | ✓ |
| Foto aparece no perfil/identificação | Photo shown on hero, list thumbnail, and case header via server-resolved signed URL | hero: `patient-detail-content.tsx` resolves `getPatientPhotoSignedUrl` → `PatientDetailView` → `PatientDetailHero` `<AvatarImage>`; list: `patients-content.tsx` batch `getPatientsPhotoSignedUrls` → `patients-table.tsx`; case: `case-detail-content.tsx` → `CasePatientBlock` → `CasePatientInfo` `<AvatarImage>` | ✓ |
| Armazenamento privado, só do dono | Bucket `public=false`, owner-scoped storage RLS, path (not URL) in DB, short-TTL signed URLs | migration `..._storage_patient_photos_rls.sql` (bucket false + 4 `foldername[1]` policies); live curl → **HTTP 400**; `photo_path` stored, never URL (D-02) | ✓ |
| Consentimento do responsável | Blocking consent checkbox + `z.literal(true)` server-side; `consent_at` written on every upload | `uploadPatientPhotoSchema` `z.literal(true)`; action validates server-side; submit button `disabled={... !consent}`; consent resets on new file (l.153) | ✓ |
| Excluir remove objeto + referência | Remove action and patient-delete both purge the storage object and null the DB reference | `removePatientPhotoAction` (deletePatientPhoto + null photo_path/consent); `delete-patient.ts` removes object before row delete; `delete-patient.spec.ts` GREEN | ✓ |

### Observable Truths

| # | Truth (plan) | Status | Evidence |
|---|--------------|--------|----------|
| 1 | patients table has photo_path/consent_given/consent_at applied to the live DB | ✓ VERIFIED | Live PostgREST `select=photo_path,consent_given,consent_at` → HTTP 200 `[]` (columns exist; no 42703). Migration `20260628010000_patients_add_photo.sql` |
| 2 | Private bucket patient-photos (public=false) with 4 owner-scoped RLS policies | ✓ VERIFIED | Migration `20260628010100_...` has `'patient-photos','patient-photos',false` + 4 `foldername(name))[1] in (select id::text from profiles where auth_user_id = auth.uid())` policies |
| 3 | Unauthenticated curl to a patient-photos object returns 400/403, not 200 | ✓ VERIFIED | Live probe today: `/object/patient-photos/...` → HTTP 400; `/object/public/patient-photos/...` → HTTP 400 (matches UAT test 10) |
| 4 | Patient type + all SELECT lists carry the 3 columns (gestational_age_weeks restored) | ✓ VERIFIED | `types.ts` l.17/24/25/26; `get-patients-by-profile-id.ts` PATIENT_SELECT includes all three + `gestational_age_weeks` |
| 5 | Doctor selects a photo, compressed client-side, uploaded, avatar shows it | ✓ VERIFIED | `patient-form-photo-field.tsx`: `compressPatientPhoto` → FormData → `uploadPatientPhotoAction`; `<AvatarImage>` surfaces wired |
| 6 | Photo appears on hero, list thumbnail, case header via short-lived signed URL | ✓ VERIFIED | Singular `getPatientPhotoSignedUrl` (TTL 60s) feeds hero + case header; batch `getPatientsPhotoSignedUrls` feeds list; all server-resolved, threaded by prop |
| 7 | Consent checkbox blocks upload unless checked; consent===true Zod-validated server-side | ✓ VERIFIED | `uploadPatientPhotoSchema` `z.literal(true)`; action `safeParse`; submit `disabled={... !consent}` |
| 8 | consent_at written on every upload incl. replacement; only path stored | ✓ VERIFIED | action writes `consent_at: new Date().toISOString()` on every upload; `uploadPatientPhoto` returns path, never `getPublicUrl` |
| 9 | Removing a photo deletes BOTH the storage object and the DB reference | ✓ VERIFIED | `removePatientPhotoAction`: `deletePatientPhoto` + `updatePatientPhoto({photo_path:null, consent_given:false, consent_at:null})` |
| 10 | Deleting a patient also removes the photo object (no orphan) | ✓ VERIFIED | `delete-patient.ts`: reads `photo_path` owner-scoped, `deletePatientPhoto` BEFORE row delete; `delete-patient.spec.ts` asserts remove-when-present + no-op-when-null |
| 11 | Remove action requires AlertDialog confirmation and is owner-scoped (paid gate + profile_id) | ✓ VERIFIED | AlertDialog with exact PT-BR copy ("Remover foto do paciente?"); action has paid gate + `getPatientById(.., profile.id)` ownership read |

**Score:** 11/11 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260628010000_patients_add_photo.sql` | 3 columns | ✓ VERIFIED | `add column if not exists photo_path/consent_given/consent_at` + PT-BR comments; applied to live DB |
| `supabase/migrations/20260628010100_storage_patient_photos_rls.sql` | private bucket + 4 policies | ✓ VERIFIED | `'patient-photos','patient-photos',false` + 4 owner-scoped policies |
| `lib/constants.ts` | PATIENT_PHOTOS_BUCKET | ✓ VERIFIED | `= "patient-photos"` with D-02 doc comment |
| `modules/patients/types.ts` | photo fields | ✓ VERIFIED | photo_path/consent_given/consent_at |
| `lib/schemas/patient.ts` | uploadPatientPhotoSchema | ✓ VERIFIED | `z.literal(true)` consent |
| `lib/compress-image.ts` | compressPatientPhoto | ✓ VERIFIED | thin wrapper over `browser-image-compression` |
| `modules/patients/upload-patient-photo.ts` | validate+upsert, returns path | ✓ VERIFIED | PNG/JPEG/WebP allowlist (SVG excluded), 2MB cap, upsert, returns path |
| `modules/patients/update-patient-photo.ts` | owner-scoped update | ✓ VERIFIED | `.eq("id").eq("profile_id")` IDOR backstop |
| `modules/patients/get-patient-photo-signed-url.ts` | singular TTL 60s | ✓ VERIFIED | null-safe; used by hero + case header |
| `modules/patients/get-patients-photo-signed-urls.ts` | batch Map (no N+1) | ✓ VERIFIED | one `createSignedUrls` call → Map |
| `modules/patients/delete-patient-photo.ts` | idempotent remove | ✓ VERIFIED | no-op on null, `.remove([path])`, user client |
| `modules/patients/delete-patient.ts` | removes object before row | ✓ VERIFIED | reads photo_path owner-scoped → deletePatientPhoto → row delete |
| `actions/patients/upload-patient-photo.ts` | gated upload | ✓ VERIFIED | auth + paid gate + Zod consent + persist + revalidate; both barrels |
| `actions/patients/remove-patient-photo.ts` | gated remove | ✓ VERIFIED | auth + paid + owner-scoped; both barrels |
| `modules/patients/delete-patient.spec.ts` | delete coverage | ✓ VERIFIED | 3 assertions GREEN |
| `patient-form-photo-field.tsx` | Dialog + consent + remove AlertDialog | ✓ VERIFIED | upload Dialog, blocking consent, remove AlertDialog with exact copy |

### Key Link Verification

| From | To | Via | Status |
|------|----|----|--------|
| patient-form-photo-field | uploadPatientPhotoAction | FormData(file, patientId, consent) | ✓ WIRED |
| patients-content | getPatientsPhotoSignedUrls | batch sign → Map → photoUrl per patient | ✓ WIRED |
| patient-detail-content | getPatientPhotoSignedUrl | singular → photoUrl → view → hero AvatarImage | ✓ WIRED |
| case-detail-content | getPatientPhotoSignedUrl | singular → block → CasePatientInfo AvatarImage | ✓ WIRED |
| delete-patient | delete-patient-photo | remove object before row delete | ✓ WIRED |
| remove-patient-photo action | delete-patient-photo + update-patient-photo | remove object then null path/consent | ✓ WIRED |
| storage.objects RLS | profiles.auth_user_id | `(storage.foldername(name))[1] in (select id::text ...)` | ✓ WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| patients-table avatar | `patient.photoUrl` | `getPatientsPhotoSignedUrls` from real `photo_path` (now in PATIENT_SELECT) | Yes (bugfix 260629-egq added photo_path to list select) | ✓ FLOWING |
| patient-detail-hero avatar | `photoUrl` | `getPatientPhotoSignedUrl(patient.photo_path)` server-side, threaded by prop | Yes | ✓ FLOWING |
| case-patient-info avatar | `photoUrl` | `getPatientPhotoSignedUrl(caseDetail.patient.photo_path)`; `photo_path` selected in `get-case-by-id.ts` | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Test suite passes | `yarn test` | 402/402 pass, 0 fail | ✓ PASS |
| Typecheck clean | `yarn typecheck` | exit 0 | ✓ PASS |
| Private bucket rejects unauth (criterion 2) | `curl /object/patient-photos/...` (no auth) | HTTP 400 | ✓ PASS |
| Public route rejects (criterion 2) | `curl /object/public/patient-photos/...` | HTTP 400 | ✓ PASS |
| Live DB has photo columns (blocking push applied) | PostgREST `select=photo_path,consent_given,consent_at` | HTTP 200 `[]` (no 42703) | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PHOTO-01 | 02-02 | Médico envia foto na identificação | ✓ SATISFIED | Truths 5, 7, 8 |
| PHOTO-02 | 02-02 | Foto exibida no perfil/identificação | ✓ SATISFIED | Truth 6; 3 surfaces wired + data-flow trace |
| PHOTO-03 | 02-01, 02-03 | Armazenamento privado + signed URL + consent + exclusão | ✓ SATISFIED | Truths 1-3, 8, 9-11; live curl 400 |

### Anti-Patterns Found

None. No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers in any phase-modified file. No `next/image` on avatar surfaces (Radix `<AvatarImage>` only). No `image/svg+xml` in the upload allowlist. Signed URLs never persisted. No stubs.

### Human Verification Required

None outstanding. Manual UAT (`02-UAT.md`) is complete and green: 10/10 passed, 0 issues — covering upload-in-modal, consent gate, persistence after refresh, list/hero/case-header display, remove (AlertDialog → initials), and the automated unauthenticated-curl security check (HTTP 400). The canonical code-side verification above independently re-confirms each control.

### Gaps Summary

No gaps. All 11 must-haves across the three plans are substantiated by the actual codebase, not just by SUMMARY claims. The [BLOCKING] schema-push (Plan 01 Task 3) was genuinely applied to the live DB (PostgREST column probe + private-bucket curl both confirm). The three close-out bugfixes (260629-egq) are present and load-bearing: `photo_path` in the patients-list SELECT, the server-resolved signed URL threaded into the hero/edit avatar (persists across refresh), and the upload flow inside a Dialog. The 02-03 SUMMARY was reconstructed at close-out but the code it describes is real and committed (`ca769f3`, `69cf2a2`, `4eb4998`).

---

_Verified: 2026-06-29T15:05:00Z_
_Verifier: Claude (gsd-verifier)_
