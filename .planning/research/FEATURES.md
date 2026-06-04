# Feature Research

**Domain:** Medical SaaS — Secure patient document share-links + consolidated patient timeline
**Researched:** 2026-06-04
**Confidence:** HIGH (storage mechanics via Context7/Supabase docs) / MEDIUM (LGPD requirements from training knowledge, law text well-established) / HIGH (existing codebase audit)

---

## Context: What Already Exists

The timeline UI is partially built (`patient-detail-timeline.tsx`) — it renders cases, certificates, and prescriptions in separate sections ordered by date descending. Three `get-*-by-patient-id.ts` modules already supply the data. The download routes (`/api/prescriptions/[id]/download`, `/api/medical-certificates/[id]/download`) work for authenticated doctors via 60-second signed Supabase Storage URLs.

**Gap for share links:** no unauthenticated public route exists. Supabase signed URLs are internal to the authenticated doctor — they cannot be sent to patients directly because they expire in 60 s, require no auth in the URL itself (the token IS the credential), and have no revocation mechanism short of deleting the storage object.

**Gap for the timeline:** current layout renders three separate sorted lists; it is not a unified, interleaved chronological feed. Filtering and grouping by date period are absent.

---

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Expiring share token stored in DB | Any "send document to patient" UX requires a durable, revocable token that outlives the HTTP session | LOW | New `document_share_tokens` table: `id` (uuid/token), `document_type` (enum: prescription/certificate), `document_id`, `profile_id`, `expires_at`, `revoked_at`, `accessed_at`. Single migration. |
| Public download route using share token | Patient needs a URL they can open without a Falaped account | LOW | `GET /share/[token]` — no auth middleware; validate token against DB, check `expires_at` and `revoked_at`, then call `supabase.storage.from(bucket).createSignedUrl(path, 60)` server-side and redirect. Route must live outside the `app/dashboard` auth layout. |
| Configurable expiry (7 days default) | Document expires after a reasonable window; prescriptions and certificates have real-world validity periods | LOW | `expires_at = now() + interval`. Sensible defaults: 7 days for certificates, 30 days for prescriptions (matches typical refill windows). Doctor UI shows expiry date when generating a link. |
| Manual revocation by doctor | LGPD Art. 18 gives data subjects the right to erasure/correction; doctor needs to honor patient requests to invalidate a link | LOW | `revoked_at = now()` update. Action: `actions/share/revoke-share-token.ts` with ownership check. UI: revoke button on the link-management panel. |
| Access log (first-access timestamp) | LGPD Art. 37 requires data controllers to keep processing records; access time is a minimal audit trail | LOW | Write `accessed_at = now()` on first successful download (single UPDATE, idempotent if already set). No IP or PII needed for v1. |
| Unified chronological timeline | Doctors expect a single "what happened when" feed — three separate lists require mental merging | MEDIUM | Merge cases + certificates + prescriptions into a single array sorted by `issued_at`/`started_at`, group by month/year, render with type badges. Already have all data; requires UI refactor of `patient-detail-timeline.tsx`. |
| Event-type filter on timeline | Longer patient histories become noisy without a way to scope to "just prescriptions" or "just consultations" | LOW | Client-side filter pill group (Todos / Atendimentos / Receitas / Atestados). No new DB query — filter the already-fetched merged array. |
| Download link visible in timeline | Doctor should be able to share directly from the timeline without navigating elsewhere | LOW | On each document event row, add a "Compartilhar" button that opens the share token generation action inline. Requires share token table to exist. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Branded public download page | Patient lands on a Falaped-branded page with clinic name/logo instead of a raw storage redirect | LOW | Public `app/share/[token]/page.tsx` Server Component renders clinic name + document type + a "Baixar PDF" button. Reads clinic logo from `profiles.logo_url`. Better trust signal than a bare file download. |
| Expiry countdown visible to doctor | Doctor sees "expira em 5 dias" on each active link, enabling proactive reissue before patient calls | LOW | Derive from `expires_at - now()` at render time. No DB change. |
| One-click link regeneration | After expiry or accidental revocation, doctor can reissue without navigating to the original document | LOW | `actions/share/regenerate-share-token.ts` — revoke old, insert new with fresh `expires_at`. |
| Timeline date-range filter | For patients with multi-year histories, scoping to "últimos 6 meses" reduces cognitive load | MEDIUM | Client-side date filter, dropdown or date-range input. Works on the already-fetched merged array; no new query. Consider server-side only if patient histories grow large (unlikely at v1 scale). |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Email/SMS delivery from Falaped | "Just send the link automatically" | Requires transactional email/SMS provider (Resend, Twilio), LGPD consent trail for contact channels, delivery failure handling — all out of scope for v1 | Doctor copies the link and sends via WhatsApp manually. Intentionally low-tech; the external WhatsApp bot already handles patient messaging. |
| Public share link with patient authentication | "Only the patient should be able to open it" | Requires a patient identity system (email/CPF verification), out-of-scope auth flow, LGPD consent for creating patient accounts | Token secrecy is the access control. Use long random tokens (UUID v4 = 122 bits entropy). Adequate for medical document sharing at this scale. |
| Permanent (no-expiry) links | "Patient might want to access later" | Violates principle of data minimization (LGPD Art. 6 IV); leaked URLs expose PHI indefinitely | Default 30-day expiry; doctor can regenerate if patient needs access later. |
| Full audit log with IP/geolocation | "Security compliance" | IP logging is personal data under LGPD — requires its own retention policy, disclosure in privacy notice, and storage. Over-engineered for a solo-doctor app at v1. | `accessed_at` timestamp is sufficient for a basic audit trail at this stage. |
| Interleaved real-time timeline updates | "Show new events live" | Supabase Realtime on patient page adds WebSocket complexity for a low-frequency update scenario (consultations don't happen every second) | Server Component re-render on navigation is sufficient. Add Realtime only if doctors report staleness problems. |
| Per-document access count / download analytics | "See how many times patient viewed it" | Misleading metric (one download = one view, file may be shared further); engineering overhead disproportionate to value | `accessed_at` (first access) is the right signal: was the link ever used? |

---

## Feature Dependencies

```
[Share token DB table]
    └──requires──> [IDOR fix + RLS on prescriptions/certificates tables]  ← CRITICAL pre-condition
                       (without ownership enforcement, any doctor could issue a token for another doctor's document)

[Public download route /share/[token]]
    └──requires──> [Share token DB table]
    └──requires──> [Storage buckets private with RLS]  ← already done in migrations

[Revocation UI]
    └──requires──> [Share token DB table]
    └──requires──> [List of active tokens per document]

[Branded public page]
    └──requires──> [Public download route /share/[token]]
    └──enhances──> [Trust signal for patient]

[Unified chronological timeline]
    └──requires──> [get-cases-by-patient-id, get-prescriptions-by-patient-id, get-medical-certificates-by-patient-id]
                       ← all three already exist

[Event-type filter]
    └──requires──> [Unified chronological timeline]

[Download/share button in timeline]
    └──requires──> [Share token DB table]
    └──requires──> [Unified chronological timeline]

[LGPD compliance posture]
    └──requires──> [Expiry on all tokens]
    └──requires──> [Revocation capability]
    └──requires──> [Access log (accessed_at)]
    └──enhances──> [Branded public page with privacy notice snippet]
```

### Dependency Notes

- **IDOR fix and RLS must precede all share-link work.** This is documented as a hard constraint in PROJECT.md. A share-token generator that calls `document_id` without verifying ownership is exploitable.
- **Unified timeline requires no new data.** All three `get-*-by-patient-id` modules exist. The work is purely in the merge+sort logic and the UI component (`patient-detail-timeline.tsx`).
- **Share button in timeline requires the token table.** They should ship in the same phase to avoid UI debt.
- **Branded public page enhances but does not block.** A raw redirect to the signed storage URL is a functional v1; the branded page is a low-cost upgrade done in the same phase.

---

## LGPD Considerations (Brazil)

**Relevance:** LGPD (Lei 13.709/2018) classifies medical data as sensitive personal data (Art. 11). Stricter rules apply.

| Obligation | Requirement | Implementation |
|------------|-------------|----------------|
| Finalidade (Art. 6 I) | Data must be processed for the stated purpose only | Share link is explicitly for the patient to receive their own document — legitimate purpose |
| Necessidade (Art. 6 III) | Collect minimum necessary data | Token table stores only what is needed; no patient PII in the token row itself |
| Livre acesso (Art. 18 I) | Patient has right to access their own data | Share link IS the access mechanism — patient receives their document |
| Eliminação (Art. 18 VI) | Patient can request deletion | Revocation + token expiry; deletion of the PDF object from storage is a future escalation path |
| Segurança (Art. 46) | Controller must adopt security measures | Private storage bucket + signed URL generated server-side + short token lifetime |
| Prestação de contas (Art. 6 X) | Controller must demonstrate compliance | `accessed_at` audit field; `revoked_at` field; `expires_at` field. Together these constitute a minimal processing log per LGPD Art. 37. |
| Transparência (Art. 6 VI) | Patient should know who controls their data | Branded public page must show clinic/doctor name. A one-line "Este documento foi compartilhado por [Dr. Nome]" is sufficient. |

**What does NOT require additional implementation at v1:**
- A full DPIA (Data Protection Impact Assessment) — required only for high-risk large-scale processing.
- ANPD registration — not yet mandatory for most smaller controllers.
- Data Processing Agreement with Supabase — Supabase has a DPA; the doctor/Falaped relationship is the controller/processor relationship to address in terms of service, not in code.

---

## Supabase Storage: Share Link Mechanics

**Confirmed behavior (HIGH confidence, Context7/official docs):**

- `createSignedUrl(path, expiresInSeconds)` generates a JWT-signed URL valid for `expiresInSeconds`.
- Signed URLs use a separate internal signing key — unaffected by auth JWT key rotation.
- **Revocation is not natively supported.** Supabase's own docs state: "If you need to revoke signed URLs, contact Supabase support." Deleting the storage object invalidates all signed URLs for it (takes up to 1 minute to propagate via CDN).
- **Implementation consequence:** The app-level `document_share_tokens` table is the revocation layer. The public route checks `revoked_at IS NULL AND expires_at > now()` before generating a fresh short-lived signed URL on each patient request. This is the correct pattern: the app token is the durable credential; the Supabase signed URL is generated on-demand with a 60-second window, ensuring the token is the single revocable control point.
- **CDN caveat:** If Smart CDN is enabled, a 60-second signed URL response may be cached at the edge slightly beyond its JWT expiry. Not a concern at current scale (no CDN configured in this app).

**Existing download route pattern (already in codebase):**
```
GET /api/prescriptions/[id]/download
  → auth check → ownership check → createSignedUrl(60s) → 302 redirect
```
The public share route pattern mirrors this:
```
GET /share/[token]
  → no auth → token DB lookup → expiry+revocation check → createSignedUrl(60s) → 302 redirect (or branded page)
```

---

## MVP Definition

### Launch With (v1 — this milestone)

- [x] **Share token DB table** (`document_share_tokens`) — minimal schema with `expires_at`, `revoked_at`, `accessed_at`. Depends on RLS/IDOR fix landing first.
- [x] **Generate share token server action** — creates token for a prescription or certificate owned by the authenticated doctor. Returns the public URL.
- [x] **Public download route** (`GET /app/share/[token]`) — validates token, generates short-lived Supabase signed URL, redirects. No patient auth required.
- [x] **Revoke token action** — sets `revoked_at` on a token owned by the authenticated doctor.
- [x] **Unified chronological timeline** — merge and sort all three event types in `patient-detail-timeline.tsx`, group by month/year.
- [x] **Event-type filter** — client-side pill filters on the merged timeline.
- [x] **Share button on timeline document rows** — inline "Compartilhar" that triggers token generation and shows copyable link.

### Add After Validation (v1.x)

- [ ] **Branded public page** — instead of raw redirect, render clinic name + document type + download button. Low cost, high trust signal. Trigger: patient feedback that the link "looks suspicious."
- [ ] **Expiry countdown in doctor UI** — "expira em N dias" on each active share token. Trigger: doctor requests proactive reissue reminder.
- [ ] **Link regeneration** — one-click reissue after expiry. Trigger: first time a doctor reports a patient saying the link expired.

### Future Consideration (v2+)

- [ ] **Case reports in timeline** — add `case_reports` as a fourth event type. Requires decision on whether reports are patient-sharable (they may contain clinical notes not intended for patients).
- [ ] **WhatsApp deep link** — pre-compose a WhatsApp message with the share URL. Trigger: only after WhatsApp bot integration is mature and doctor workflow is validated.
- [ ] **Bulk share / "share all documents from this case"** — generate multiple tokens at once. Trigger: validated need from doctors managing complex cases.
- [ ] **Patient notification via email** — send link automatically on generation. Requires Resend or similar; out of scope until email infrastructure decision.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Share token table + generate action | HIGH | LOW | P1 |
| Public download route `/share/[token]` | HIGH | LOW | P1 |
| Revoke token action | HIGH | LOW | P1 |
| Unified chronological timeline | HIGH | MEDIUM | P1 |
| Event-type filter (client-side) | MEDIUM | LOW | P1 |
| Share button on timeline rows | HIGH | LOW | P1 |
| `accessed_at` audit field | MEDIUM (LGPD) | LOW | P1 |
| Branded public page | MEDIUM | LOW | P2 |
| Expiry countdown in UI | LOW | LOW | P2 |
| Link regeneration | LOW | LOW | P2 |
| Case reports in timeline | LOW | MEDIUM | P3 |
| Email delivery of link | LOW | HIGH | P3 |

---

## Sources

- Supabase Storage signed URL documentation — Context7 `/supabase/supabase` (HIGH confidence)
- Supabase Storage CDN + revocation behavior — Context7 `/supabase/supabase` (HIGH confidence)
- LGPD Lei 13.709/2018 (text well-established in training data, HIGH confidence for general obligations; LOW confidence for ANPD interpretive guidance that postdates training cutoff)
- Falaped codebase audit — migrations, modules, components, API routes (HIGH confidence, direct inspection)

---

*Feature research for: Falaped v1.1 — Secure patient share-links + patient timeline*
*Researched: 2026-06-04*
