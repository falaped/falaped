# Stack Research

**Domain:** Brazilian pediatric medical-practice web app (Falaped) — subsequent milestone (brownfield, in production)
**Researched:** 2026-06-28
**Confidence:** HIGH

## TL;DR — Headline Recommendation

**This milestone needs essentially zero new runtime dependencies.** Every capability in scope is covered by libraries already in the lockfile (`date-fns` 4.4.0, `@supabase/supabase-js` 2.108.2 + `@supabase/ssr`, React 19, `@falaped/falaped-kit/pdf`, `react-hook-form`, `zod`, `react-day-picker`, shadcn/ui, TipTap).

The two areas that actually need engineering attention are **not** dependency choices:
1. **PDF spacing/extra-page bug** — the fix lives inside `@falaped/falaped-kit` (the kit owns all PDFKit rendering), with input-sanitization mitigation possible in the app.
2. **Privacy of child photos** — a configuration/RLS decision (private bucket + scoped access), not a library decision.

Add a new dependency only if you decide to do client-side image compression before upload (see Supporting Libraries). Everything else: reuse.

---

## Recommended Stack (by capability)

### Capability 1 — Patient photo upload / display (child photos)

| Concern | Recommendation | Version | Why |
|---------|----------------|---------|-----|
| Storage | Supabase Storage, **private bucket** (e.g. `patient-photos`) | supabase-js 2.108.2 (installed) | Already in stack; private-by-default; integrates with existing per-request client factories in `lib/supabase/`. **Child photos are sensitive minor data — never use a public bucket.** |
| Access scoping | RLS policy keyed on `profile_id` via storage path prefix (`{profile_id}/{patient_id}/...`) | — | Mirrors the existing app-wide ownership rule ("all queries scoped by `profile_id`"). RLS enforces it at the storage layer too. |
| Display URL | `createSignedUrl(path, expiresIn)` generated server-side in a `modules/` function | supabase-js 2.108.2 | Private bucket → no public URL. Short-lived signed URLs (e.g. 1h) keep minor photos from leaking via shareable links. |
| Upload transport | **Server Action** receives the file (Server Action `bodySizeLimit` is already `25mb` in `next.config.ts`), or **`createSignedUploadUrl`** for direct client→storage upload | supabase-js 2.108.2 | Photos are small; the existing 25 MB Server-Action limit already accommodates direct upload through the action layer, keeping the auth + paid gate on the path. Use `createSignedUploadUrl` only if you later need larger media or want to offload bandwidth from the function. |
| On-the-fly resize | `transform: { width, height, resize: 'cover', quality }` on `createSignedUrl` / `getPublicUrl` | supabase-js 2.108.2 | Avoids storing multiple sizes. **CAVEAT (verify against the project's plan): Supabase image transformations require the Pro plan or above.** If the project is not on Pro, do NOT rely on this — compress/resize client-side before upload instead (see Supporting Libraries). |

**Confidence: HIGH** (Supabase Storage + signed URLs + RLS verified against official docs; transform Pro-plan gating verified).

### Capability 2 — Consultation timer / chronometer (client-side)

| Concern | Recommendation | Version | Why |
|---------|----------------|---------|-----|
| Implementation | **Custom React hook, no library.** Store `startedAt` (epoch ms) in a ref/state; `setInterval` only drives UI repaint; compute `elapsed = Date.now() - startedAt` on each tick | React 19.0 (installed) | A timer is ~30 lines. Adding a dependency for it is unjustified. |
| Accuracy | Derive elapsed from a **timestamp difference**, never by incrementing a counter inside `setInterval` | — | Pure `setInterval` counting drifts (~1s per 10 min, minutes per day) and stops when the tab is throttled. Timestamp-diff is drift-free and self-corrects after backgrounding. |
| Persistence (optional) | Persist `startedAt` to the case/consultation row so a refresh or device switch resumes the same elapsed time | Postgres (Supabase) | Pediatric consultations can outlive a page session; storing the start instant makes the timer survive reloads for free. |

**What NOT to use:** `react-timer-hook`, `react-use-precision-timer`, `react-countdown`, etc. — all solve a problem the platform already solves; they add bundle weight and a maintenance surface for trivial logic.

**Confidence: HIGH** (standard, well-documented pattern; verified the drift failure mode of naive `setInterval`).

### Capability 3 — Precise pediatric age (days, and months + days)

| Concern | Recommendation | Version | Why |
|---------|----------------|---------|-----|
| Months + days breakdown | `intervalToDuration({ start: birthDate, end: now })` → `{ years, months, days, ... }` | **date-fns 4.4.0 (installed)** | Calendar-correct decomposition (handles uneven month lengths). Exactly the "X meses e Y dias" pediatric format. |
| Total days | `differenceInDays(now, birthDate)` | **date-fns 4.4.0 (installed)** | Correct whole-day count for newborns where "age in days" is the clinically used unit. |
| Total months (if needed) | `differenceInMonths(now, birthDate)` | **date-fns 4.4.0 (installed)** | For vaccine-schedule bucketing by month. |
| Timezone safety | Normalize both dates to start-of-day in the clinic's local timezone before diffing; store DOB as a date (not timestamp) | date-fns 4.4.0 | Avoids off-by-one-day errors from UTC vs America/Sao_Paulo. **This is the real risk, not the math.** |

**No new dependency.** date-fns 4 is already a dependency and ships `intervalToDuration`, `differenceInDays`, and `differenceInMonths` as confirmed in `node_modules`.

**Confidence: HIGH** (functions verified present in installed `date-fns@4.4.0`).

### Capability 4 — Vaccine schedule (reference calendar) + per-patient vaccination card

| Concern | Recommendation | Version | Why |
|---------|----------------|---------|-----|
| Reference schedule (SUS + particular + gestante) | **Static seed data in Postgres** (`vaccines`, `vaccine_schedule_entries` tables), seeded via a `supabase/migrations/` + seed SQL | Supabase Postgres (installed) | The SUS/PNI calendar is slow-changing reference data. A static, versioned seed (rather than a third-party API) keeps it offline-reliable, auditable, and reviewable by the physician. Matches existing migration workflow. |
| Schedule modeling | Model each entry as `(vaccine_id, dose_label, recommended_age_min_months, recommended_age_max_months, source: 'sus'|'particular'|'gestante')` | — | "Due/overdue by age" is then a query: compute patient age in months (date-fns), join against schedule, compare. No special library. |
| Per-patient card | `patient_vaccinations` table: `(patient_id, profile_id, vaccine_id, dose_label, applied_at, lot, notes)` | Supabase Postgres (installed) | Same three-tier flow (`app/ → actions/ → modules/`), same `profile_id` scoping + paid gate as the rest of the app. "Pendentes/atrasadas" = schedule minus applied, filtered by current age. |
| Validation | Zod schemas in `lib/schemas/` | zod 4.3.6 (installed) | Consistent with existing action-layer validation. |

**No new dependency.** This is pure data modeling on the existing Postgres + action/module pattern.

**Decision — do NOT pull a vaccine-schedule API or npm package:** none authoritatively tracks the Brazilian PNI/SUS calendar, and a hardcoded, physician-reviewed seed is safer for a clinical tool than an opaque external source. Keep the calendar as reviewable SQL/data the doctor can correct.

**Confidence: HIGH** for the modeling approach; **MEDIUM** on the exact schedule contents (the actual PNI dose ages should be confirmed against current Ministério da Saúde / SBP material at build time — this is a data-accuracy task, not a stack risk). Flag for phase-level verification.

### Capability 5 — PDF layout fix (extra whitespace / page overflow)

**Root cause is in the kit, not the app.** All PDFKit rendering for prontuário/receita/atestado lives in `@falaped/falaped-kit/dist` (`buildReportPdf`, `buildPrescriptionPdf`, `buildMedicalCertificatePdf`). The app only maps payloads and calls these functions (`modules/prescriptions/generate-prescription-pdf.ts`, `modules/medical-certificates/...`, `actions/cases/download-case-report-pdf.ts`).

| Concern | Recommendation | Where |
|---------|----------------|-------|
| Keep PDFKit | **Stay on PDFKit** (already `serverExternalPackages: ["pdfkit"]`). Do NOT migrate to Puppeteer/`@react-pdf/renderer`/headless-Chrome HTML-to-PDF. | next.config.ts |
| Fix the spacing | Adjust the report layout logic **inside `@falaped/falaped-kit`** (the kit is the system of record for PDF rendering). | kit repo |
| App-side mitigation | Sanitize input before sending to the kit: collapse the `\n\n` runs that `htmlToPlainTextForPdf` emits from empty TipTap paragraphs; drop empty sections. | app `modules/` |

**Why the extra page / whitespace happens (verified by reading the kit's compiled `buildReportPdf`):**
1. **Stacked gaps.** Body paragraphs add `reportBodyParagraphGapPt` *between* every paragraph, and sections add `layout.paragraphSpacing` + `layout.sectionSpacing` after each. Empty paragraphs produced by `htmlToPlainTextForPdf` (which turns `</p><p>` and `<br>` into `\n\n`/`\n`) inflate paragraph count, so trailing blank TipTap lines become real vertical space.
2. **Footer reservation forces early page breaks.** `footerGeometry` computes a `reservedBottom`/`contentLimit`; `preparePageForLastSection` calls `doc.addPage()` when the *estimated* last-section height would cross `contentLimit`. If the estimate (`heightOfString`) overshoots the actual rendered height, the page breaks one section too early, leaving a near-empty trailing page.
3. **Estimate vs render drift.** `estimateReportBodyHeight` uses `doc.heightOfString` with the same `lineGap`, but rounding/wrapping differences between the estimate and the real `doc.text` pass can push content just past the limit. This is the classic PDFKit overflow trap.

**Why HTML-to-PDF (Puppeteer) is the wrong fix here:** it would require bundling Chromium (heavy on Vercel functions), rewriting three working document templates, and abandoning the ABNT-margin layout the kit already encodes. The current layout is correct; only the spacing math needs tuning. Targeted fixes to gap constants + estimation are far lower risk than a renderer swap.

**Confidence: HIGH** (root cause read directly from the kit's compiled source).

### Capability 6 — New clinical document types (referral, exam request, medical report)

| Concern | Recommendation | Version | Why |
|---------|----------------|---------|-----|
| Generation | **Reuse the existing kit PDF pattern.** The kit's `ReportPdfInput` (title + identification fields + sections + footer) is generic enough to render referral / exam-request / medical-report as new titled documents. | @falaped/falaped-kit (installed) | These are the same "header + body sections + signature/footer" shape as the prontuário. New doc types = new payload mappers + new kit entrypoints (or reuse `buildReportPdf` with a custom `reportTitle`/sections), not a new PDF engine. |
| Body editing | **TipTap** for rich-text bodies/orientations | @tiptap/* 3.20.1 (installed) | Already used; pairs with the kit's `htmlToPlainTextForPdf`. |
| Forms / templates | **react-hook-form + Zod**, same wizard + savable-template pattern as prescriptions | rhf 7.71.2 / zod 4.3.6 (installed) | PROJECT.md explicitly mandates "mesmo padrão das receitas." |
| Delivery | Binary download via `app/api/<doctype>/route.ts` route handler (Server Actions can't stream binary) | Next.js 16 (installed) | Matches existing `app/api/prescriptions/` / `app/api/medical-certificates/` precedent in ARCHITECTURE.md. |

**No new dependency.** This is composition of existing pieces.

**Confidence: HIGH.**

---

## Installation

```bash
# Core: NOTHING new required for this milestone.

# OPTIONAL — only if you choose client-side image compression
# (recommended if the Supabase project is NOT on the Pro plan,
#  since on-the-fly Storage image transforms are Pro-gated):
yarn add browser-image-compression
```

> Use `yarn add` (project is pinned to Yarn 1.22.22 via `packageManager`; `npm` is not used here).

---

## Supporting Libraries (only-if-needed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `browser-image-compression` | ^2.0.2 (verify latest at install) | Resize/compress patient photo in the browser before upload | **Only** if you cannot use Supabase Pro image transforms, or you want to cap upload size/strip EXIF (incl. GPS) before sensitive minor photos leave the device. Stripping EXIF GPS is itself a good privacy reason to consider this even on Pro. |

No other supporting libraries are recommended. Timer, age math, vaccine modeling, and document types all use existing deps.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Custom timer hook | `react-timer-hook` / `react-use-precision-timer` | Never for this scope — only if you needed multiple synchronized timers with pause/lap UI out of the box. |
| date-fns `intervalToDuration` | `dayjs` + duration plugin, `luxon` | Never — date-fns is already the project's date lib; adding a second is pure duplication. |
| Static seeded vaccine schedule | External vaccine-schedule API/package | Never for BR PNI — no authoritative maintained source; physician-reviewable SQL is safer. |
| PDFKit (kit) layout fix | Puppeteer / `@react-pdf/renderer` / `@react-pdf/renderer`-style HTML-to-PDF | Only a full future rewrite of all documents with complex multi-column/table layouts would justify it. Not for a spacing bug. |
| Private bucket + signed URLs | Public bucket + obfuscated path | Never for child photos — minor PII must not be world-readable. |
| Supabase Storage transforms | Store multiple pre-resized variants on upload | If not on Pro plan, or to avoid per-request transform latency/cost at high volume. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Public Supabase Storage bucket for patient photos | Child photos are sensitive minor PII; public buckets yield permanent shareable URLs | Private bucket + RLS scoped by `profile_id` + short-lived `createSignedUrl` |
| Pure `setInterval` counter for the timer | Drifts and freezes when tab is backgrounded/throttled | Timestamp-diff (`Date.now() - startedAt`); `setInterval` only repaints |
| Adding a date library (dayjs/luxon/moment) | Duplicates the existing date-fns 4 dependency; `moment` is legacy/unmaintained | date-fns 4.4.0 (already installed) |
| Puppeteer/headless-Chrome PDF for the spacing bug | Bundles Chromium (heavy on Vercel), throws away working ABNT templates | Tune gap/estimation logic inside `@falaped/falaped-kit` |
| Bumping Server Action `bodySizeLimit` higher for photos | Already 25 MB; photos are small; larger limits widen abuse surface | Keep 25 MB, or use `createSignedUploadUrl` for direct upload |
| A third-party React PDF/printing component | Server already renders authoritative PDFs via the kit | Reuse the kit's `buildReportPdf`-style entrypoints |

---

## Stack Patterns by Variant

**If the Supabase project is on the Pro plan:**
- Use `createSignedUrl(path, expiry, { transform: { width, height, resize, quality } })` for patient-photo display.
- Still consider EXIF stripping on upload (GPS in a child's photo is a privacy concern).

**If the Supabase project is NOT on Pro:**
- Resize/compress client-side with `browser-image-compression` before upload (cap dimensions, e.g. 800px, quality ~0.8).
- Store the already-sized image; serve via plain `createSignedUrl` (no transform).

**If the consultation timer must survive reloads / device changes:**
- Persist `started_at` (timestamptz) on the consultation/case row; compute elapsed from it on mount.

**If a new document type needs tables or multi-column layout (beyond current templates):**
- Extend the kit's PDFKit code with the needed primitives — still PDFKit, not a renderer swap.

---

## Version Compatibility

| Package | Version (in repo) | Notes |
|---------|-------------------|-------|
| `date-fns` | 4.4.0 | `intervalToDuration`, `differenceInDays`, `differenceInMonths` confirmed present in `node_modules`. ESM modular imports; tree-shakes. |
| `@supabase/supabase-js` | 2.108.2 | Supports `createSignedUrl`/`createSignedUploadUrl` and `transform` option. Image transforms gated to Pro plan at the service level (not the SDK). |
| `@supabase/ssr` | latest | Existing per-request client factories in `lib/supabase/` (server/client/proxy) are the correct place to run storage calls; do not construct clients in `modules/` (inject them). |
| `@falaped/falaped-kit` | 0.2.7 | Owns all PDFKit rendering (`buildReportPdf`/`buildPrescriptionPdf`/`buildMedicalCertificatePdf`, `htmlToPlainTextForPdf`). PDF fix and new doc-type entrypoints likely require a kit version bump. |
| `pdfkit` | (transitive, `serverExternalPackages`) | Keep as external server package; do not bundle. |
| `react` / `react-dom` | 19.0.0 | Timer hook uses standard `useState`/`useRef`/`useEffect`; no React 19-specific API needed. |

**Cross-cutting compatibility note:** The PDF fixes and new document types create a coupling to `@falaped/falaped-kit`. Plan for a coordinated kit release + app bump; the app cannot fully fix the spacing bug alone (only mitigate inputs).

---

## Roadmap Flags

- **PDF spacing fix spans two repos** (kit + app). Sequence kit changes before/with the app bump; budget for a kit release.
- **Vaccine schedule data accuracy** needs physician + current PNI/SBP source verification at build time — a content task, flag for phase-level research, not a stack risk.
- **Supabase plan check** is a prerequisite for the photo capability: it decides transform-on-the-fly vs client-side compression. Resolve before the photo phase starts.
- **Child-photo privacy** (private bucket, RLS, signed-URL expiry, EXIF stripping) should be treated as a first-class requirement in the photo phase, not an afterthought.

---

## Sources

- Installed packages inspected directly in `node_modules`: `date-fns@4.4.0` (confirmed `intervalToDuration`, `differenceInDays`), `@supabase/supabase-js@2.108.2`, `@falaped/falaped-kit@0.2.7` (read compiled `dist/index.js` PDF rendering + `dist/pdf/index.d.ts`) — HIGH confidence.
- Falaped app source: `modules/prescriptions/generate-prescription-pdf.ts`, `actions/cases/download-case-report-pdf.ts`, `.planning/codebase/STACK.md`, `.planning/codebase/ARCHITECTURE.md` — HIGH confidence (current codebase).
- Supabase Storage image transformations (Pro-plan gating, `transform` options) — https://supabase.com/docs/guides/storage/serving/image-transformations — HIGH confidence.
- Supabase signed upload URLs — https://supabase.com/docs/reference/javascript/storage-from-uploadtosignedurl — MEDIUM-HIGH confidence.
- PDFKit text/layout semantics (`lineGap`, `paragraphGap`, `heightOfString`, automatic page insertion) — https://pdfkit.org/docs/text.html — HIGH confidence.
- React stopwatch drift / timestamp-diff pattern — https://tommyto.dev/posts/build-an-accurate-stopwatch-timer-in-react-step-by-step-guide , https://dev.to/rbreahna/javascript-timer-with-react-hooks-560m — MEDIUM confidence (well-corroborated community pattern).

---
*Stack research for: Falaped pediatric app — consultation-experience, vaccines, and new-document milestone*
*Researched: 2026-06-28*
