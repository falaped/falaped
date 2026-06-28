# Pitfalls Research

**Domain:** Brazilian pediatric medical practice web app (Falaped) — brownfield Next.js 16 + Supabase + pdfkit
**Researched:** 2026-06-28
**Confidence:** HIGH for pdfkit (read the actual kit source + repo) and Supabase brownfield (read the actual migrations/concerns); MEDIUM-HIGH for age math, vaccine calendar, and LGPD (verified against official sources + library docs).

---

## Critical Pitfalls

### Pitfall 1: pdfkit manual `y`-tracking diverges from `doc.y`, producing extra whitespace and phantom page breaks

**What goes wrong:**
This is the active "relatório sobra espaço / às vezes gera página extra" bug. In the kit (`@falaped/falaped-kit/dist/pdf/index.js`), report sections are laid out with a hand-tracked `let y` variable: each block calls `doc.text(content, ml(), y, opts)` and then reads `y = doc.y + paragraphSpacing` (`mountSectionsHead`, lines 389-411; `mountLastSection`, 357-388). Height is independently *estimated* up front via `estimateReportBodyHeight` / `estimateSectionBlockHeight` using `doc.heightOfString` (lines 147-160, 330-342), and the page-break decision compares the estimate against `contentLimit`/`maxY` (`preparePageForLastSection`, 343-356). The PDF ends up taller than the rendered content (trailing blank space) and sometimes spills onto an extra near-empty page.

Three independent root causes stack up:
1. **Estimate ≠ render.** `heightOfString` is computed with a particular `{ width, lineGap, align }`, but the actual `doc.text` adds `reportBodyParagraphGapPt` (6pt) *between* paragraphs (line 143) and `paragraphSpacing`/`sectionSpacing` after blocks. If the estimate and the render don't add *exactly* the same inter-paragraph/section gaps, the page-break math reserves space that never gets used → trailing whitespace, or under-reserves → overflow onto a new page.
2. **`doc.text` auto-page-breaks behind the tracker's back.** When a section's text reaches the bottom margin, pdfkit silently inserts a page and resets `doc.y` to the top margin. The code then does `y = doc.y + paragraphSpacing` — so the manual `y` jumps to the *new page top*, the separator line (`drawHorizontalLine`, line 407) is drawn there, and `sectionSpacing` is added on top, compounding the gap. The first page is left with a tall empty tail.
3. **`heightOfString` with a `height` cap is unreliable for break decisions.** The "last section" path passes `opts.height = cap` to clip (lines 364-381); but `heightOfString` does not account for the same clipping, so the reserved footer zone (`REPORT_MIN_GAP_SECTION_TO_FOOTER = 200`) and the estimate fight each other.

**Why it happens:**
pdfkit has *two* layout models and mixing them is the classic trap: (a) the **flow model**, where you call `doc.text(...)` repeatedly and let pdfkit advance `doc.y` and auto-page-break; and (b) the **absolute model**, where you pass explicit `x, y` and manage placement yourself. The kit mixes both — it passes explicit `y` *and* relies on `doc.y` after the call *and* pre-estimates with `heightOfString`. Each model has a different idea of "where the cursor is," and they drift. `heightOfString` is also famously approximate when `lineGap`, `paragraphGap`, and wrapping interact, and it does not include the gaps the caller adds manually.

**How to avoid:**
Pick ONE model and make estimate and render share a single code path.
- **Recommended:** Use the flow model consistently. After setting font/size, call `doc.text(content, { width, align, lineGap, paragraphGap })` *without* an explicit `y` (let pdfkit own the cursor), and use `doc.moveDown()` or a single known `paragraphGap` for spacing — never both a manual `y +=` and reliance on `doc.y`. Never re-read `doc.y` into a manual tracker after a call that can auto-break.
- For page-break-before-block decisions, compute the block height with the *exact same* options object you will render with, including any manual gaps, by routing both through one helper (e.g. `measureBlock(opts)` and `renderBlock(opts)` that share `opts`). Don't compute the estimate one way and render another.
- To force a clean break instead of letting a section dribble onto a new page, check `doc.y + measuredHeight > doc.page.height - doc.page.margins.bottom` and call `doc.addPage()` deliberately — but only with a measurement that matches the render.
- Reserve the footer with `setFutureMargins` / bottom margin *once*, and let pdfkit's own bottom-margin handling do the breaking, rather than a separate `REPORT_MIN_GAP_SECTION_TO_FOOTER` constant racing the estimate.
- Verify visually: generate the same report at 1, 2, and ~1.05 pages of content (the boundary case) and confirm no trailing blank page and no large bottom gap.

**Warning signs:**
- Generated PDF page count is one more than the visible content warrants.
- A consistent tall blank band at the bottom of a page before content continues.
- Separator lines or section titles appearing flush at the top of a fresh page with extra space above the next block.
- The bug is content-length-sensitive (short reports fine, longer ones break) — a tell that the estimate/render gap accumulates per paragraph.

**Phase to address:**
Bloco 1 / "Corrigir espaçamento de impressão" phase — this is the named active bug. Fix in the kit's report builder (or wrap/override it) before adding the new document types (Bloco 3), because the new documents (encaminhamento, pedido de exames, relatório médico) will reuse the same builder and inherit the bug.

---

### Pitfall 2: Pediatric age computed with timezone-naive or off-by-one date math

**What goes wrong:**
Pediatric care needs age in **days** and in **months + days** with real precision (dosing, vaccine eligibility, milestones). Common failures: (a) `new Date("2024-03-15")` parses as **UTC midnight**, so in Brazil (UTC-3) it becomes 21:00 on Mar 14 local — every age in days is silently off by one near midnight; (b) naive `(now - birth) / 86400000` ignores DST transitions (Brazil has had DST historically; even if currently off, libraries and historical dates carry the assumption) and can yield 1.96 days where it should be 2; (c) "months + days" computed by subtracting month numbers mishandles month-length differences — e.g. born Jan 31, "1 month" has no Feb 31, so the remainder days are wrong; (d) Feb 29 birthdays in non-leap years (`differenceInMonths` rounding) flip the day count.

**Why it happens:**
JavaScript `Date` is a UTC timestamp with a local-time façade; string parsing rules differ between `"2024-03-15"` (UTC) and `"2024-03-15T00:00"` (local). Developers reach for millisecond subtraction because it's one line, not realizing it conflates calendar arithmetic (which is what age is) with elapsed-time arithmetic. `differenceInMonths`-style functions return *whole* months and the "+days" remainder must be computed by adding those months back and diffing — a step people skip.

**How to avoid:**
- Treat birth date as a **calendar date, not an instant.** Store and compute on `YYYY-MM-DD` only; build local-midnight dates explicitly (`new Date(y, m-1, d)`) or use a calendar-date library (`date-fns` with care, or Temporal `PlainDate` where available) so no timezone is involved.
- Compute "days" as a calendar-day difference of two local-midnight dates, not a millisecond divide-and-floor.
- Compute "months + days" by: take whole months via `differenceInMonths`, add them back to the birth date, then take `differenceInDays` to the consultation date for the remainder. This is the only way the remainder respects variable month lengths.
- Decide an explicit policy for Feb 29 birthdays and document it (treat as Feb 28 or Mar 1 in non-leap years) — pick one and unit-test it.
- Anchor "today" to the doctor's local date, not the server's UTC `Date.now()`.
- **Unit test the edge cases** (this app's `modules/`/`lib/` is where tests live): birth on month-end (Jan 31), leap-day birth, age across a year boundary, a date near local midnight, and newborn (0 days, 1 day).

**Warning signs:**
- Age in days flips by 1 depending on what time of day the doctor opens the patient.
- "1 month and -2 days" or a negative/zero remainder appearing.
- Newborns showing "1 day" on the day of birth (or "0 days" the day after).
- Tests pass on the developer's machine (whose TZ may be UTC or local) but field reports of wrong ages.

**Phase to address:**
Bloco 1 / "Exibir idade em dias e meses+dias" phase. Build a single, unit-tested `computePediatricAge(birthDate, today)` helper in `lib/` and reuse it everywhere (display, and later vaccine-eligibility). Do not inline the math in components.

---

### Pitfall 3: Vaccine calendar data is hard-coded, goes stale, and gives unsafe guidance

**What goes wrong:**
The Brazilian PNI/SUS calendar is **revised annually** — there is a published *Instrução Normativa do Calendário Nacional de Vacinação 2026*, and recent additions (gestante VSR vaccine from 28 weeks; nirsevimab/anticorpo monoclonal for infants/preemies) landed only in the last cycle. A schedule hard-coded once will silently become wrong; for a clinical tool, "wrong vaccine age/dose" is a patient-safety defect, not a cosmetic bug. Additional traps: conflating the **SUS (PNI)** schedule with the **private/SBIm** schedule (they differ — e.g. some vaccines/doses available privately but not SUS), and computing "pending/overdue by age" using the buggy age math from Pitfall 2, so eligibility windows are off.

**Why it happens:**
It's tempting to bake the calendar into a TypeScript constant and move on. Medical content feels static until you learn it has a yearly normative cycle plus mid-year additions. The SUS-vs-private distinction is easy to flatten into one table.

**How to avoid:**
- Treat the calendar as **versioned reference data with a source and an effective date**, not code. Store each schedule (SUS, private, gestante) with `source`, `version`/`effectiveDate`, and a visible "based on PNI/SBIm <date>" label in the UI so the doctor knows the vintage and can sanity-check.
- Keep SUS, private, and gestante as **separate, clearly-labeled datasets** — never merge into one ambiguous table.
- Make the dataset **easy to update without a code deploy where feasible** (e.g. data table/seed), or at minimum isolate it in one file with a clear "verified against <official PDF> on <date>" comment and an owner.
- Source from official references: gov.br PNI / Calendário Nacional (SUS), SBIm/SBP (private + gestante). Cite the document and date in the data.
- Per-patient "pending/overdue" must consume the single tested age helper (Pitfall 2), and present recommendations as **decision support, not prescription** — the doctor confirms. Add a disclaimer that the doctor verifies against the current official calendar.
- Add a recurring review reminder (annual, around the new Instrução Normativa) to re-verify the data.

**Warning signs:**
- The calendar table has no source/date metadata.
- SUS and private vaccines appear interchangeably in one list.
- "Overdue" flags that don't match what the pediatrician expects (often a symptom of age-math errors feeding eligibility).
- The dataset hasn't been touched since the last annual revision.

**Phase to address:**
Bloco 2 / Vacinas phase. Define the data model (with source + effective date + schedule type) before building the UI. Gate the per-patient vaccination card on the tested age helper from Bloco 1.

---

### Pitfall 4: Child photos stored in a public bucket (LGPD violation for minors' sensitive data)

**What goes wrong:**
Photos of children are personal data of a minor under the LGPD, requiring processing in the child's *best interest* with specific, highlighted consent from a parent/guardian — and they're especially sensitive (a photo of the doctor with the child). The concrete brownfield trap: the existing **`profile-logos` bucket is `public = true`** (`supabase/migrations/20260228200000_storage_profile_logos_rls.sql`), even though it has RLS *write* policies. **RLS does not restrict reads on a public bucket** — anyone with the object URL can fetch it. The natural instinct ("a child photo is just another profile image, copy the logo bucket pattern") would put minors' photos in a world-readable bucket and likely persist the public URL in the DB, leaking it forever once shared/logged.

**Why it happens:**
The logo bucket is public *on purpose* (logos go on PDFs via a public URL), so copying that pattern feels consistent. Supabase's public/private distinction is subtle: RLS policies on `storage.objects` look like protection, but for a public bucket they only govern mutations, not GET-by-URL. `getPublicUrl` returns a permanent unauthenticated link.

**How to avoid:**
- Put child photos in a **private bucket** (`public = false`), modeled on the existing **`prescriptions`** bucket (`supabase/migrations/20260315010000_storage_prescriptions.sql`), not on `profile-logos`. Path-scope objects to `profile_id/...` and add owner-scoped RLS select/insert/update/delete policies exactly like the prescriptions bucket.
- Serve images via **short-lived signed URLs** (`createSignedUrl`) generated server-side per request, never `getPublicUrl`. Do not store a public URL in the DB; store only the storage path.
- Enforce ownership at the action layer too (this app has no table RLS per CONCERNS.md — see Pitfall 5): the photo upload/read action must scope by the authenticated `profile_id`.
- LGPD posture: record that photos are processed for clinical identification, capture guardian consent, support deletion (right to erasure) that removes both the storage object and any DB reference, and minimize retention. Don't send child photos to third parties (e.g. don't pass them to the Groq AI flows).
- Verify with an unauthenticated `curl` of the object URL: a private bucket returns 400/403, a public one returns the image — make this an explicit acceptance check.

**Warning signs:**
- The migration for the photo bucket has `public = true`.
- Code calls `getPublicUrl` for child photos, or a `*_url` column stores an unauthenticated link.
- The photo loads in an incognito window with no auth.
- No consent capture / deletion path for the photo.

**Phase to address:**
Bloco 1 / "Foto na identificação da criança" phase. Decide bucket privacy + signed-URL serving + consent/deletion *before* writing the upload feature; a public-bucket mistake is expensive to walk back once URLs are in the wild.

---

### Pitfall 5: New slices break the app-layer-only tenant isolation, the paid gate, or the per-request client pattern

**What goes wrong:**
Per CONCERNS.md and ARCHITECTURE.md, this app has **no table RLS** — multi-tenant isolation depends *entirely* on every query carrying `.eq("profile_id", ...)` (or `user_phone`), and there is already a live IDOR (deletes filter by `id` only). New slices this cycle (photos, vaccination card, three new document types, blank prescription, orientation templates) multiply the query surface. Each new module is a fresh chance to: (a) forget the `profile_id` filter → cross-tenant read/delete; (b) reuse the dangerous pattern of passing the **service-role admin client** into a delete path (which bypasses even storage RLS); (c) skip the `profile.status === "paid"` gate in a new action; (d) construct a Supabase client inside a module or use a global client, violating the per-request/Fluid-compute constraint; (e) import `next/cache`/`next/headers` in `modules/`.

**Why it happens:**
The three-layer pattern is conventions, not enforcement — nothing stops a new action from skipping a step, and there are zero tests on `actions/`/`components/`. Copy-paste from an existing module that happens to omit the owner filter (like the known-buggy deletes) propagates the bug. The paid gate is easy to forget when you're focused on the feature.

**How to avoid:**
- For **every** new module data function: filter by `profile_id` on reads, writes, **and deletes** (`.delete().eq("id", x).eq("profile_id", profileId)`). Thread `profile.id` from the action into the module — never delete by `id` alone (don't copy the existing prescription/certificate delete bug).
- For **every** new action/route handler: build a per-request client, call `getAuthenticatedUser(supabase)`, gate on `profile.status === "paid"`, validate input with Zod, return a `{ ok } | { ok:false; error }` union. Use this as a literal checklist for each new slice.
- Reserve `createAdminClient()` for `auth.admin.*` only; never use the service-role client on a query lacking an explicit ownership filter (it bypasses storage RLS — the exact blast-radius widener flagged in CONCERNS.md).
- In `modules/`: inject the `SupabaseClient`, never construct it; never import `next/cache`/`next/headers`.
- **Add the missing tests** for the new slices' ownership enforcement — CONCERNS.md notes a single ownership test would have caught the IDOR. While RLS is absent, an ownership unit test per new module is the cheapest defense.
- Strongly consider enabling **table RLS** as defense-in-depth as part of this cycle (or at least for the new tables: photos, vaccination records, new documents) so a forgotten filter isn't catastrophic.

**Warning signs:**
- A new query with no `.eq("profile_id", ...)` / `user_phone`.
- A new action without the `getAuthenticatedUser` + paid-status check.
- `createAdminClient()` appearing in a new feature path.
- A module that imports `createClient`/`next/headers` or references a module-level client.
- New tables created without RLS while handling another tenant's data.

**Phase to address:**
Cross-cutting — every Bloco 2/3/4 slice. Add an explicit "scoping + paid-gate + ownership-test" success criterion to each new-data-table/new-action phase. Consider a dedicated early "enable RLS on new (and ideally existing) tables" hardening step so the rest of the cycle is built on a safe backstop.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hard-code the vaccine calendar in a TS constant | Ship the reference table fast | Goes stale at the next annual PNI revision → unsafe clinical guidance | Only with a visible source+date label and an annual review reminder; never silently |
| Reuse the `profile-logos` (public) bucket pattern for child photos | One less migration | World-readable minors' photos; LGPD violation; permanent leaked URLs | Never — child photos must be private + signed URLs |
| Inline age math in the display component | Quick visible result | Bug duplicated into vaccine eligibility; untestable; TZ/leap bugs | Never — extract one tested `lib/` helper |
| Copy an existing delete module for a new doc type | Matches house style | Inherits the known IDOR (deletes by `id` only) | Only after adding `.eq("profile_id", ...)` and an ownership test |
| Skip the paid gate "just for now" on a new action | Faster local testing | Unpaid access to paid features; inconsistent gate | Never in committed code |
| Patch the report spacing by nudging gap constants | Looks fixed for sample data | Estimate/render drift persists; breaks at other content lengths | Never — fix the model mismatch, not the constants |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Storage (child photos) | Public bucket + `getPublicUrl`; RLS write policies assumed to protect reads | Private bucket (model on `prescriptions`), path-scoped RLS, server-side `createSignedUrl` per request, store path not URL |
| Supabase data (new tables) | New query missing `profile_id` filter (no RLS backstop) | Owner-scoped filter on every read/write/delete + ownership unit test; ideally enable table RLS |
| Supabase admin client | Using `createAdminClient()` in feature/delete paths | Restrict to `auth.admin.*`; never on unfiltered queries |
| pdfkit (`@falaped/falaped-kit/pdf`) | Mixing flow (`doc.y`) and absolute (`x,y`) layout; estimate ≠ render | Single layout model; one shared options path for measure + render |
| Groq AI flows | Passing child photos / minors' identifiable data to the LLM | Keep minors' images out of AI calls (LGPD third-party transfer); photos are display-only |
| date-fns / JS Date | `new Date("YYYY-MM-DD")` parsed as UTC; ms-divide for days | Calendar-date math at local midnight; months-then-remainder for months+days |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sequential per-item storage+DB ops (existing bulk-delete antipattern) repeated for photos/vaccine records | Slow bulk actions, partial-failure inconsistency | Batch with `.in("id", ids).eq("profile_id", pid)` + single `storage.remove([...])` | Bulk operations on many records |
| Re-fetching/regenerating signed URLs on every render | Latency + storage API churn on photo-heavy lists | Generate signed URLs server-side once per request with a sensible TTL | Patient lists with many photos |
| Large photo uploads through the 25mb server-action body limit | Upload failures on big images | Resize/compress client-side before upload, or presigned direct-to-storage upload | High-res phone photos |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Child photo in public bucket | Minors' sensitive images world-readable; LGPD breach | Private bucket + signed URLs + owner RLS; verify with unauth `curl` |
| New delete/query without owner filter | Cross-tenant data access/destruction (active IDOR class) | `.eq("profile_id", ...)` everywhere + ownership tests; enable RLS |
| Admin (service-role) client in feature paths | God-mode logic bug bypasses all RLS | Admin client only for `auth.admin.*` |
| Storing public photo URL in DB | Permanent unauthenticated link leaks even after "deletion" | Store storage path; serve via signed URL; deletion removes object + reference |
| No consent/erasure for minors' photos | LGPD non-compliance (consent + best-interest + erasure) | Capture guardian consent; implement photo deletion (object + DB) |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing age without unit clarity (days vs months) | Doctor misreads age for dosing | Show both "X dias" and "Y meses e Z dias" explicitly, labeled |
| Vaccine recommendations presented as authoritative | Doctor over-trusts possibly-stale data | Label source+date, frame as decision support, doctor confirms |
| Extra blank page in printed report (current bug) | Wasted paper, looks unprofessional mid-consultation | Fix the pdfkit layout model so page count matches content |
| Consultation timer that resets/loses state on navigation or refresh | Lost consultation time tracking | Persist timer start (e.g. server/DB or durable client state), compute elapsed from start timestamp not a tick counter |

## "Looks Done But Isn't" Checklist

- [ ] **Report PDF spacing fix:** Often verified only on one sample — verify at 1 page, exactly-at-boundary (~1.05 pages), and multi-page content; confirm no trailing blank page and no large bottom gap. Verify it holds for the NEW document types too (they share the builder).
- [ ] **Child photo upload:** Often missing privacy — verify the bucket is `public=false`, the URL is a signed URL (expires), an unauthenticated `curl` of the object fails, and a deletion removes both object and DB reference.
- [ ] **Pediatric age:** Often missing edge cases — verify Jan-31 birth, Feb-29 birth in a non-leap year, newborn (0/1 day), year-boundary, and a near-midnight local time; confirm it uses the shared `lib/` helper, not inline math.
- [ ] **Vaccine calendar:** Often missing provenance — verify each schedule carries source + effective date, SUS/private/gestante are separate, and the UI shows the vintage + a "confirm against current official calendar" note.
- [ ] **New document types & actions:** Often missing scoping — verify each has the paid gate, `getAuthenticatedUser`, `profile_id` filter on read/write/delete, and an ownership test; no admin client; no client construction in `modules/`.
- [ ] **Consultation timer:** Often missing persistence — verify it survives a page refresh/navigation and computes elapsed from a stored start time.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Report extra-page/whitespace bug | MEDIUM | Refactor the kit report builder to a single layout model with shared measure/render options; regression-test at content-length boundaries |
| Child photos in public bucket | HIGH | Flip bucket to private, migrate objects, replace `getPublicUrl` with signed URLs, purge stored public URLs; assume already-shared URLs are compromised |
| Wrong age math shipped | LOW-MEDIUM | Centralize into tested helper, replace call sites; recompute on display (no stored derived age to backfill) |
| Stale vaccine data | LOW (data) / HIGH (if it caused clinical error) | Update versioned dataset, bump effective date; add annual review reminder |
| Missing owner filter / IDOR in new slice | MEDIUM | Add `.eq("profile_id", ...)`, add ownership test, enable table RLS as backstop, audit logs for cross-tenant access |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| pdfkit whitespace / extra page | Bloco 1 — print-spacing fix (before Bloco 3 new docs) | PDF page count matches content at boundary cases; holds for new doc types |
| Pediatric age math | Bloco 1 — age display | Unit tests for month-end/leap/newborn/year-boundary/near-midnight; single `lib/` helper reused |
| Vaccine data staleness / SUS-vs-private | Bloco 2 — vaccines (data model first) | Each schedule has source+effective date; schedules separated; UI shows vintage |
| Child photo LGPD / public bucket | Bloco 1 — child photo | Private bucket, signed URL, unauth `curl` fails, consent + deletion path |
| Brownfield scoping / paid gate / per-request client | Cross-cutting, every Bloco 2/3/4 slice (+ optional early RLS hardening) | Per-slice: paid gate + `profile_id` filter on all ops + ownership test; no admin client; no module-constructed client |

## Sources

- Read directly: `node_modules/@falaped/falaped-kit/dist/pdf/index.js` (report/prescription/certificate builders — confirmed the mixed flow/absolute layout model and estimate-vs-render gap), `node_modules/@falaped/falaped-kit/README.md`, `modules/prescriptions/generate-prescription-pdf.ts`
- Read directly: `supabase/migrations/20260228200000_storage_profile_logos_rls.sql` (public logo bucket), `supabase/migrations/20260315010000_storage_prescriptions.sql` (private prescriptions bucket — correct model), `.planning/codebase/CONCERNS.md` (no RLS, IDOR, admin-client misuse, 25mb limit), `.planning/codebase/ARCHITECTURE.md` (three-layer + per-request client constraints)
- pdfkit docs & issues: [Text in PDFKit](https://pdfkit.org/docs/text.html), [Text measurement and calculations](https://app.studyraid.com/en/read/11913/379546/text-measurement-and-calculations), [Page breaks and content flow](https://app.studyraid.com/en/read/11913/379562/page-breaks-and-content-flow), [foliojs/pdfkit #666 (measure before render)](https://github.com/foliojs/pdfkit/issues/666), [#363 (line height)](https://github.com/foliojs/pdfkit/issues/363)
- Age math: [Stop miscalculating age in JavaScript (leap years, Feb 29, Jan 31 trap) — DEV](https://dev.to/momin_ali_e002a22d102ff40/stop-miscalculating-age-in-javascript-leap-years-feb-29-and-the-jan-31-trap-22aj), [Accurate JS Age Calculator — kevinleary.net](https://www.kevinleary.net/blog/javascript-age-birthdate-mm-dd-yyyy/), [date-fns](https://date-fns.org/)
- Vaccine calendar: [Calendário de Vacinação — Ministério da Saúde](https://www.gov.br/saude/pt-br/vacinacao/calendario), [Instrução Normativa Calendário Nacional 2026 (PDF)](https://www.gov.br/saude/pt-br/vacinacao/publicacoes/instrucao-normativa-que-instrui-o-calendario-nacional-de-vacinacao-2026.pdf), [SBIm atualizações](https://sbim.org.br/atualizacoes), [SBP calendário 2025/2026](https://www.sbp.com.br/imprensa/detalhe/news/sbp-lanca-calendario-de-vacinacao-atualizado-20252026/)
- LGPD minors' data: [ANPD — enunciado dados de crianças e adolescentes](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-divulga-enunciado-sobre-o-tratamento-de-dados-pessoais-de-criancas-e-adolescentes), [LGPD Art. 14](https://lgpd-brasil.info/capitulo_02/artigo_14), [Guia orientativo MPCE (PDF)](https://www.mpce.mp.br/wp-content/uploads/2023/10/Guia-orientativo-de-tratamento-de-dados-pessoais-de-criancas-e-adolescentes.pdf)
- Supabase Storage: [Storage Buckets fundamentals](https://supabase.com/docs/guides/storage/buckets/fundamentals), [Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control), [public bucket vs signedURL discussion #6458](https://github.com/orgs/supabase/discussions/6458)

---
*Pitfalls research for: Brazilian pediatric medical practice web app (Falaped) — brownfield Next.js 16 + Supabase + pdfkit*
*Researched: 2026-06-28*
