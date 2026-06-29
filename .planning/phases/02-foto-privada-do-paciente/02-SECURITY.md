---
phase: 02
slug: foto-privada-do-paciente
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-06-29
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register authored at plan time (T-02-01…T-02-12 + T-02-SC across the three PLAN.md `<threat_model>` blocks). ASVS L1 grep-depth verification + canonical VERIFICATION.md (11/11 must-haves) + live checks (unauthenticated curl, PostgREST schema probe).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| anonymous client → Supabase Storage object | Unauthenticated `curl` to a `patient-photos` object URL must be rejected | Child photo (sensitive, LGPD) |
| browser form → upload Server Action | Untrusted file + consent flag + patientId; the action is the authoritative gate | Image bytes, consent, patientId |
| authenticated doctor A → patient row/object of doctor B | Cross-tenant read/write/delete (app has NO table RLS by default) | Patient row + photo object |
| persisted signed URL (anti-pattern) | A leaked/cached signed URL would grant time-limited object access | Short-lived object URL |
| "deleted" data → storage | Object must not survive a patient/photo delete (LGPD) | Child photo object |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-02-01 | Information Disclosure | Unauthenticated `curl` to `patient-photos` object | high | mitigate | Bucket `public=false` + storage RLS `foldername[1]` owner predicate. **Live: unauth curl → HTTP 400** (2026-06-29). | closed |
| T-02-02 | Elevation of Privilege | Cross-tenant object access | high | mitigate | Object path prefixed by `profile_id` + `foldername[1]` RLS restricts each object to its owner. | closed |
| T-02-03 | Tampering | Migration not applied to live DB → false-positive verify | medium | mitigate | [BLOCKING] schema-push verified: live PostgREST `select=photo_path,consent_given,consent_at` → HTTP 200 (no 42703). | closed |
| T-02-SC | Tampering | npm install of `browser-image-compression` (slopsquat) | medium | transfer | Blocking package-legitimacy human checkpoint before `yarn add` (02-02 Task 1); MIT, exact spelling, no postinstall. | closed |
| T-02-04 | Tampering | Malicious upload (SVG-with-script / non-image) | high | mitigate | MIME allowlist `png/jpeg/webp` in module (`ALLOWED_TYPES`) + Zod; `image/svg+xml` excluded (no `svg` token present). | closed |
| T-02-05 | Repudiation / Privacy | Upload without guardian consent | high | mitigate | `consent: z.literal(true)` server-side in `uploadPatientPhotoSchema`; `consent_at` written on every upload (D-04/D-06). | closed |
| T-02-06 | Elevation of Privilege | IDOR — attach/replace photo on another doctor's patient | high | mitigate | `updatePatientPhoto` scoped `.eq("id").eq("profile_id")`; `profile.id` from the authenticated action; `profile_id` path prefix. | closed |
| T-02-07 | Information Disclosure | Signed URL persisted/logged | medium | mitigate | Only `photo_path` stored; `createSignedUrl(s)` at render (TTL 60s; 300s list); no `getPublicUrl`; URL never written to DB/logs. | closed |
| T-02-08 | Denial of Service | Large image upload | low | mitigate | Client compression + `MAX_SIZE_BYTES = 2 MB` cap in module + existing `bodySizeLimit: 25mb`. | closed |
| T-02-09 | Repudiation / Privacy | Photo object orphaned after delete (sensitive minor data persists) | high | mitigate | `deletePatientPhoto` invoked before row delete in `delete-patient.ts` AND on photo-remove; idempotent; spec coverage. | closed |
| T-02-10 | Information Disclosure | Unauthenticated object access | high | mitigate | Bucket `public=false` + storage RLS. **Live: unauth curl → HTTP 400** on `/object` and `/object/public` (2026-06-29). | closed |
| T-02-11 | Elevation of Privilege | Cross-tenant photo removal | high | mitigate | `removePatientPhotoAction` reads owner-scoped via `getPatientById(.., profile.id)`; `delete-patient` keeps `.eq("profile_id")`; paid gate enforced. | closed |
| T-02-12 | Information Disclosure | Accidental destructive click wiping sensitive data | medium | mitigate | Mandatory `AlertDialog` confirmation before remove (`patient-form-photo-field.tsx`). | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|

No accepted risks — every threat is mitigated and verified.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-29 | 13 | 13 | 0 | /gsd-secure-phase (L1 grep + canonical VERIFICATION + live curl/PostgREST) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-29
