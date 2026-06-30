# Project Research Summary

**Project:** Falaped — pediatric consultation-experience, vaccines, and new-documents milestone
**Domain:** Brazilian pediatric medical-practice web app (brownfield, in production)
**Researched:** 2026-06-28
**Confidence:** HIGH

## Executive Summary

Falaped is a mature, production brownfield pediatric EMR built on Next.js 16, React 19, Supabase (Postgres + Storage), and a strict three-tier slice pattern (`app/ -> actions/ -> modules/`) with all PDF rendering owned by `@falaped/falaped-kit/pdf` (PDFKit). This milestone does **not** introduce a new architecture or new runtime dependencies — every capability in scope (child photo, consultation timer, precise pediatric age, vaccine calendar/card, three new clinical documents, blank prescription, orientation templates, and the PDF spacing fix) is achievable by replicating existing slices and reusing already-installed libraries (`date-fns` 4.4.0, `supabase-js` 2.108.2, the kit, `react-hook-form`, `zod`, TipTap). The only conditional new dependency is `browser-image-compression`, needed solely if the Supabase project is **not** on the Pro plan (image transforms are Pro-gated) or to strip EXIF/GPS from minors' photos.

The recommended approach is "reuse the pattern, not the table": each new document type (encaminhamento, pedido de exames, relatorio medico) is an independent end-to-end clone of the `prescriptions` slice, the vaccine **reference** calendar ships as static typed data while the **per-patient** card is a `profile_id`-scoped table, and the consultation timer derives elapsed time from the existing `cases.started_at` timestamp rather than persisting ticks. Age math is centralized in a single unit-tested `lib/` helper consumed by both the age display and vaccine-eligibility logic.

The dominant risks are not technology choices but correctness and safety. Five critical pitfalls drive the plan: (1) the active PDF whitespace/extra-page bug stems from PDFKit mixing flow and absolute layout models with estimate-vs-render drift — it must be fixed in the kit before new documents inherit it; (2) timezone-naive/off-by-one pediatric age math is a clinical-accuracy defect; (3) hard-coded vaccine calendars go stale annually and give unsafe guidance unless versioned with source + effective date; (4) child photos in a public bucket are an LGPD violation for minors' sensitive data (the existing `profile-logos` bucket is public — do NOT copy it); and (5) the app has **no table RLS** — tenant isolation depends entirely on every query carrying a `profile_id` filter plus a `paid` gate, so each new slice is a fresh chance to introduce an IDOR.

## Key Findings

### Recommended Stack

Zero new runtime dependencies are required. The work is engineering and data-correctness inside the existing stack, plus a coordinated `@falaped/falaped-kit` release (the PDF fix and any new doc-type entrypoints live in the kit, not the app). See `STACK.md` for full detail.

**Core technologies:**
- **Supabase Storage (private bucket + signed URLs + RLS):** child photo storage — minors' PII must never use a public bucket; serve via short-lived `createSignedUrl`.
- **date-fns 4.4.0 (`intervalToDuration`, `differenceInDays`):** precise pediatric age (days, months+days) — already installed; calendar-correct decomposition.
- **Custom React hook (no library):** consultation timer — compute `Date.now() - startedAt`, never increment a `setInterval` counter (drifts/freezes when backgrounded).
- **Static seeded Postgres data + `@falaped/falaped-kit/pdf` + TipTap + react-hook-form + Zod:** vaccine calendar and new clinical documents — pure composition of existing pieces.
- **`browser-image-compression` (CONDITIONAL, ^2.0.2):** client-side photo resize/EXIF strip — only if not on Supabase Pro.

### Expected Features

Scoped to NEW features this cycle (the app already ships patients, prescriptions, atestados, laudos, AI assistant). See `FEATURES.md`.

**Must have (table stakes):**
- Age in days / months+days / years by pediatric range — dosing and scheduling are age-precise.
- Vaccine reference tables (SUS/PNI + private/SBIm + gestante) as versioned seeded data.
- Per-patient carteira de vacinacao (record applied doses) with pending/overdue computation by age.
- Encaminhamento, pedido de exames, relatorio medico — three thin slices over the existing receita pattern.
- Receita em branco + Orientacoes template library.
- Correct PDF print spacing (fixes the active extra-blank-page bug).
- Consultation timer (start/elapsed).

**Should have (competitive):**
- Next-due vaccine logic surfaced in-consult ("Proxima: VIP reforco aos 15 meses").
- SUS vs particular side-by-side per age (counseling moment).
- Auto-fill documents from patient context (name, DOB, age-in-months, IMC).
- Print-perfect single-page documents across all new doc types.

**Defer (v2+):**
- Exam photo AI extraction (explicitly deferred); exam panels/catalog; AI document drafting from transcription; outbound vaccine reminders (LGPD-heavy); RNDS/ConecteSUS sync; consultation-time analytics.

### Architecture Approach

This is a brownfield integration job: fold each new feature into the strict three-tier slice pattern that already ships in production. One directory per new document type (not a generic polymorphic `documents` table — the house style keeps `prescriptions` and `medical_certificates` separate despite identical shape). Reference vaccine data is static TS; per-patient data is a `profile_id`-scoped table. Patient photo and timer are extensions to existing `patients`/`cases` slices, not new slices. Binary PDF delivery uses the established `app/api/<domain>/[id]/download/route.ts` signed-URL route. See `ARCHITECTURE.md`.

**Major components:**
1. **Document-type slices (`referrals`, `exam-requests`, `medical-reports`)** — each a verbatim `prescriptions` clone: wizard -> action (auth + paid gate + Zod) -> modules (insert/get/generate-pdf/upload-pdf) -> table + RLS in one migration.
2. **Vaccines split: static `VACCINE_CALENDAR` (no DB) + `patient_vaccinations` table** — pending/late computed at read time by merging applied rows against the calendar for the patient's age.
3. **Extensions: `patients.photo_storage_path` (private bucket) + timer from `cases.started_at`** — no new slice; signed-URL render for photos, client-side elapsed for the timer.

### Critical Pitfalls

Top items from `PITFALLS.md`:

1. **PDFKit whitespace / phantom extra page** — fix the mixed flow/absolute layout model in the kit so measure and render share one options path; verify at 1-page, boundary (~1.05 pages), and multi-page content. Must land before new doc types inherit the builder.
2. **Timezone-naive / off-by-one pediatric age** — treat DOB as a calendar date at local midnight; compute months-then-remainder; build one unit-tested `computePediatricAge` helper in `lib/` with edge-case tests (Jan-31, Feb-29 non-leap, newborn, year-boundary, near-midnight).
3. **Stale / unsafe vaccine calendar** — store SUS/private/gestante as separate versioned datasets with source + effective date; show vintage + "confirm against current official calendar" in the UI; present as decision support, not prescription.
4. **Child photos in a public bucket (LGPD violation for minors)** — model on the private `prescriptions` bucket, NOT public `profile-logos`; signed URLs only, store path not URL; capture guardian consent + erasure path; verify an unauthenticated `curl` fails.
5. **Broken tenant isolation / paid gate (no table RLS)** — every new module filters by `profile_id` on read/write/**delete**; every action runs `getAuthenticatedUser` + `profile.status === "paid"`; no admin client in feature paths; add an ownership test per slice; strongly consider enabling table RLS as a backstop.

## Implications for Roadmap

Based on combined research, the suggested phase structure follows the dependency chain (age engine is the keystone; PDF fix must precede new docs; vaccine card depends on the reference calendar) and front-loads no-migration, high-pain wins.

### Phase 1: Consult-experience foundation (PDF fix + age engine + timer)
**Rationale:** All three are PROJECT.md priority-1 "dor de uso" fixes, carry no schema (or reuse `cases.started_at`), and de-risk the milestone early. The PDF fix MUST precede new document types (Phase 4) since they reuse the same kit builder. The age engine is the keystone for vaccines.
**Delivers:** Fixed report spacing (kit release), `computePediatricAge` helper + age display (days / months+days / years), consultation timer.
**Addresses:** PDF print-spacing, age display, consultation timer (FEATURES P1).
**Avoids:** Pitfall 1 (PDFKit layout-model drift), Pitfall 2 (age math).

### Phase 2: Child photo (private storage + LGPD)
**Rationale:** Self-contained (one `ADD COLUMN` + private bucket + upload module), high user value, and a privacy decision that is expensive to walk back — settle bucket privacy, signed-URL serving, and consent/deletion before writing the feature.
**Delivers:** `patients.photo_storage_path`, private `patient-photos` bucket with owner RLS, signed-URL render, consent + erasure path.
**Uses:** Supabase Storage private bucket + `createSignedUrl`; conditional `browser-image-compression`.
**Implements:** Pattern 2 (private bucket per artifact) — extension to `patients`.
**Avoids:** Pitfall 4 (public bucket LGPD violation), Pitfall 5 (scoping/paid gate).

### Phase 3: New clinical documents (encaminhamento -> pedido de exames -> relatorio medico) + blank prescription + orientation templates
**Rationale:** Each document is an independent prescriptions-clone; build encaminhamento fully as the template, then exam-request and medical-report are mechanical copies. Blank prescription is near-free (empty payload, no schema); orientation templates is one small table. Depends on the Phase 1 PDF fix.
**Delivers:** Three doc-type slices (table + RLS + wizard + PDF + download route each), receita em branco, `orientation_templates` slice.
**Uses:** `@falaped/falaped-kit/pdf`, TipTap, react-hook-form, Zod.
**Implements:** Pattern 1 (document-type slice) replicated per type.
**Avoids:** Pitfall 1 (must inherit the fixed builder), Pitfall 5 (per-slice scoping + paid gate + ownership test).

### Phase 4: Vaccine reference calendar (read-only)
**Rationale:** No schema (static typed data), read-only screen, independent — can land anytime after Phase 1 but must precede the per-patient card (Phase 5). Data accuracy (not code) is the work; requires physician verification against current PNI/SBIm sources.
**Delivers:** `VACCINE_CALENDAR` static data (SUS + particular + gestante) with source + effective date, `get-vaccine-schedule-for-age` pure fn, read-only reference UI showing vintage.
**Implements:** Pattern 3 (static reference data).
**Avoids:** Pitfall 3 (stale/unsafe calendar).

### Phase 5: Per-patient carteira de vacinacao (applied doses + pending/overdue/next-due)
**Rationale:** Highest-logic, highest-value payoff; depends on both the age engine (Phase 1) and the reference calendar (Phase 4). Pending/late derived on read by merging applied rows against the calendar for the patient's current age.
**Delivers:** `patient_vaccinations` table + slice, record-dose action, pending/overdue computation, next-due in-consult surfacing.
**Implements:** Pattern 3 (owned mutable table); consumes the Phase 1 age helper.
**Avoids:** Pitfall 2 (eligibility must use the tested age helper), Pitfall 3, Pitfall 5.

### Phase Ordering Rationale
- **Dependencies:** Age engine (Phase 1) gates vaccine eligibility; PDF fix (Phase 1) gates new docs (Phase 3); reference calendar (Phase 4) gates the per-patient card (Phase 5).
- **Risk front-loading:** Phases 1 and 4 carry no migration and ship independently, de-risking the milestone early while fixing active daily pain.
- **Privacy isolation:** Phase 2 isolates the LGPD/private-bucket decision so a mistake doesn't propagate.
- **Cross-cutting:** The scoping + paid-gate + ownership-test checklist (Pitfall 5) applies to every phase that adds a table or action (2, 3, 5); consider an early RLS-hardening step as a backstop.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (PDF fix):** Spans two repos (kit + app); requires reading/refactoring the kit's PDFKit layout model and a coordinated kit release. Use `--research-phase` to confirm the exact gap/estimation fix.
- **Phase 4 (vaccine reference):** Data-accuracy task — the exact PNI/SBIm dose ages must be verified against current official sources WITH the physician at build time. Flag for content verification, not stack research.
- **Phase 2 (child photo):** Confirm the Supabase plan (Pro? decides transform-on-the-fly vs client-side compression) and the consent/erasure requirements before building.

Phases with standard patterns (skip research-phase):
- **Phase 3 (documents):** Well-established in-repo pattern — verbatim prescriptions-clone; no external research needed.
- **Phase 5 (vaccination card):** Standard owned-table slice once the calendar and age helper exist; logic is in-app.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified directly against installed `node_modules` (date-fns, supabase-js, the kit's compiled PDF source) and official Supabase/PDFKit docs. |
| Features | HIGH | Vaccine calendars from official PNI/MS + SBIm 2025/2026 PDFs; document conventions from BR clinical norms. MEDIUM only on competitor specifics (no product teardown). |
| Architecture | HIGH | Grounded in the existing codebase and shipped slices, not external research; every recommendation mirrors a production slice. |
| Pitfalls | HIGH | PDFKit root cause read from actual kit source; LGPD/Supabase/age math verified against official sources and existing migrations. |

**Overall confidence:** HIGH

### Gaps to Address
- **Supabase plan check (Pro?):** Decides image transform-on-the-fly vs client-side compression for photos. Resolve before Phase 2.
- **Exact PNI/SBIm dose ages:** Verify the calendar contents with the physician against current official PDFs during Phase 4 (data accuracy, not stack risk).
- **Doctor preferences:** Age-unit switch points (28d vs 1mo neonate->lactente; 24mo vs 36mo->years); default carteira schedule (SUS vs SBIm vs both); whether pedido de exames needs a curated catalog or free-text first; whether lot/site fields are wanted in v1.
- **Kit coupling / release cadence:** PDF fix and any new kit entrypoints require a coordinated `@falaped/falaped-kit` bump (>=0.2.7); the app can only mitigate spacing via input sanitization alone.
- **RLS backstop decision:** Whether to enable table RLS on new (and ideally existing) tables this cycle as defense-in-depth against the no-RLS/IDOR class.

## Sources

### Primary (HIGH confidence)
- Installed packages inspected in `node_modules`: `date-fns@4.4.0`, `@supabase/supabase-js@2.108.2`, `@falaped/falaped-kit@0.2.7` (read compiled PDF rendering source) — see STACK.md / PITFALLS.md.
- Existing codebase: `supabase/migrations/*` (prescriptions/storage/RLS/patients), `actions/prescriptions/*`, `modules/prescriptions/*`, `modules/cases/get-case-by-id.ts`, `.planning/codebase/{ARCHITECTURE,STACK,CONCERNS}.md`.
- Calendario Nacional de Vacinacao — Ministerio da Saude (gov.br/saude); Instrucao Normativa 2025/2026.
- SBIm Calendario de Vacinacao Crianca 2025/2026 (PDF read in full) and SBIm Gestante.
- Supabase Storage docs (buckets fundamentals, access control, image transformations Pro-gating); PDFKit text/layout docs.

### Secondary (MEDIUM confidence)
- React stopwatch drift / timestamp-diff community pattern (multiple corroborating posts).
- BR pediatric EMR domain norms (no direct product teardown) for competitor analysis.
- LGPD minors' data guidance (ANPD enunciado, LGPD Art. 14, MPCE guia).

### Tertiary (LOW confidence)
- None load-bearing; the doctor-preference gaps above are explicitly flagged for validation, not inferred conclusions.

---
*Research completed: 2026-06-28*
*Ready for roadmap: yes*
