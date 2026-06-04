# Project Research Summary

**Project:** Falaped v1.1 — Secure Patient Share-Links, Patient Timeline, Supabase RLS Hardening
**Domain:** Medical SaaS — LGPD-compliant document sharing, chronological patient history, multi-tenant data isolation
**Researched:** 2026-06-04
**Confidence:** HIGH

## Executive Summary

Falaped is a doctor-facing medical SaaS that needs three tightly interdependent capabilities added in v1.1: (1) expiring, revocable share-links so doctors can send prescriptions and medical certificates to patients via WhatsApp without exposing raw Supabase storage URLs; (2) a unified chronological patient timeline merging cases, prescriptions, and certificates into a single filtered feed; and (3) full Supabase RLS enforcement across all `public.*` data tables to close a documented IDOR vulnerability. The defining characteristic of this work is that all three features are achievable with zero new npm dependencies — the entire implementation lives in SQL migrations, Next.js Route Handlers, and server actions using `@supabase/supabase-js` and `@supabase/ssr` already installed.

The recommended approach is a strict sequential build order that treats RLS + IDOR fix as a hard prerequisite for everything else. A share-link generator that does not enforce document ownership is exploitable on day one. The architecture is straightforward: a public `/share/[token]` SSR page bypasses auth middleware, a `/api/share/[token]/download` Route Handler validates the DB token and generates a short-lived storage signed URL server-side, and the existing layered `actions/ → modules/ → Supabase` pattern is extended rather than replaced. The patient timeline requires only a new `get-patient-timeline.ts` module that runs three parallel queries and merges in TypeScript — no SQL UNION view is needed in v1.

The critical risks cluster around RLS rollout correctness and share-link security. The project's `profiles.id` is not the same as `auth.uid()` — every RLS policy must use a one-hop subquery through `profiles.auth_user_id`, and omitting this produces silent empty results indistinguishable from working code. Separately, Supabase Storage signed URLs must never be handed directly to patients because CDN caching outlives token expiry with no revocation mechanism; LGPD Art. 18 requires the doctor be able to invalidate a link, which is only possible via the app-level token table. Both risks have well-defined mitigations documented in the research.

## Key Findings

### Recommended Stack

All three features require zero new npm packages. The existing `@supabase/supabase-js`, `@supabase/ssr`, Next.js App Router, and plain Postgres migrations cover every requirement. The service-role admin client is used sparingly — only for storage signed URL generation inside the public download route, after token validation. The existing `phone_link_codes` table establishes the project's internal precedent for token tables; `share_links` follows the identical pattern.

**Core technologies:**
- `@supabase/supabase-js` (already installed): token table CRUD, `createSignedUrl`, RLS policy enforcement — no upgrade needed
- `@supabase/ssr` (already installed): SSR server client for both authenticated dashboard routes and the unauthenticated `/share/[token]` page
- PostgreSQL / Supabase migrations (already used): `ALTER TABLE … ENABLE ROW LEVEL SECURITY` + policies, new `share_links` table
- Next.js App Router (already installed): `/share/[token]` public route segment outside the `/dashboard` auth layout
- `NEXT_PUBLIC_APP_URL` env var (new): constructs the share URL; add to `lib/env.ts` Zod schema and Vercel project config

**Critical version note:** `@supabase/ssr` and `@supabase/supabase-js` are currently pinned to `latest` in `package.json`. Both must be pinned to an explicit semver range before CI is set up.

### Expected Features

**Must have (table stakes — v1):**
- Share token DB table (`share_links`) with `expires_at`, `revoked_at`, `accessed_at` — required before any share-link UI
- Public download route `GET /api/share/[token]/download` — validates token, generates 300 s signed URL, 302 redirect
- Generate share token server action (auth-gated, Zod-validated) — doctor creates a link for an owned document
- Revoke token action — sets `revoked_at`; required for LGPD Art. 18 compliance
- `accessed_at` audit field — written on first successful download; minimal LGPD Art. 37 audit trail
- Unified chronological timeline — merge cases + prescriptions + certificates into one sorted, month-grouped feed
- Event-type filter (client-side pill group) — scope timeline to consultations / prescriptions / certificates
- Share button on timeline document rows — inline "Compartilhar" triggers token generation

**Should have (competitive — v1.x, post-validation):**
- Branded public download page with clinic name/logo — trust signal replacing raw redirect
- Expiry countdown in doctor UI ("expira em N dias")
- One-click link regeneration — revoke old + insert new

**Defer (v2+):**
- Email/SMS delivery — requires transactional provider and LGPD consent trail
- Patient authentication on share page — requires patient identity system
- Case reports in timeline — requires PHI access-level decision
- Permanent/no-expiry links — violates LGPD data minimization; never ship

### Architecture Approach

The architecture extends the existing strict layered pattern (`actions/ → modules/ → Supabase client`) with two new surface areas: a public route segment (`app/share/`) carved out of auth middleware via an `isShareRoute` guard in `lib/supabase/proxy.ts`, and a new `modules/share-links/` domain. Token validation in the public download route uses the anon Supabase client with an explicit RLS policy for anon SELECT on valid tokens, then switches to the admin client exclusively for storage signed URL generation. The patient timeline uses `Promise.all` across three existing query modules, merged in TypeScript.

**Major components:**
1. `lib/supabase/proxy.ts` (modified) — `isShareRoute` guard; `/share` stays in matcher scope for session cookie hygiene
2. `app/share/[token]/page.tsx` + `app/api/share/[token]/download/route.ts` (new) — public SSR page and binary download handler
3. `actions/share-links/` + `modules/share-links/` (new) — doctor-facing create/revoke and token CRUD
4. `modules/patients/get-patient-timeline.ts` (new) — parallel queries + TypeScript merge
5. `supabase/migrations/` (new) — two migrations: RLS on all data tables; `share_links` table with anon/authenticated policies

### Critical Pitfalls

1. **RLS enable without policies blocks all rows silently** — Always write `ENABLE ROW LEVEL SECURITY` and all `CREATE POLICY` statements in the same migration file. A deployment gap causes every SSR page to return empty arrays with no error.

2. **`profiles.id` ≠ `auth.uid()` — wrong policy anchor** — The standard Supabase pattern `profile_id = auth.uid()` never matches in this schema. Every policy must use the subquery `profile_id = (select id from public.profiles where auth_user_id = auth.uid())`. Wrap in a `SECURITY DEFINER` function to avoid per-row re-evaluation.

3. **Admin client bypasses RLS in user-triggered deletes (live IDOR)** — `delete-prescription.ts` and `delete-medical-certificate.ts` use the admin client without a `profile_id` filter. Fix with `.eq("profile_id", profileId)` and user-scoped storage RLS before enabling table RLS.

4. **Supabase Storage signed URLs are not revocable via CDN** — Always serve PDFs through `/api/share/[token]/download` which validates the DB token on every request and generates a fresh 300 s signed URL as a 302 redirect. Never pass a signed URL directly to the patient.

5. **Share-link token entropy — never reuse the document UUID** — Token column must be `encode(gen_random_bytes(32), 'hex')` (256 bits). Using `prescription.id` or any derived value enables enumeration attacks on medical PHI.

## Implications for Roadmap

The hard dependency chain is: `IDOR fix + RLS → share_links table → public route + actions → timeline with share buttons`. Phases 2 and 3 can proceed in parallel once Phase 1 is verified.

### Phase 1: Security Foundation — IDOR Fix + RLS Hardening

**Rationale:** Live IDOR in delete modules and missing RLS are pre-conditions for everything. Any feature built on top of an IDOR is immediately exploitable.

**Delivers:** All `public.*` tables protected by RLS; admin client removed from user-triggered delete paths; ownership-scoped delete modules verified on staging.

**Addresses:** Fix `delete-prescription.ts` and `delete-medical-certificate.ts` (add `.eq("profile_id", profileId)`); single atomic migration with `ENABLE ROW LEVEL SECURITY` + all policies for all 10+ data tables; `SECURITY DEFINER` helper `private.current_profile_id()`; `cases` table `user_phone`-subquery policy; `authenticated_users` table RLS.

**Avoids:** Pitfalls 1 (silent empty rows), 2 (admin client IDOR), 3 (wrong policy anchor), 4 (`authenticated_users` omission)

---

### Phase 2: Patient Share-Links

**Rationale:** Depends on Phase 1 verified. LGPD audit infrastructure (revocation + access log) ships with the happy path — not as a follow-up.

**Delivers:** Complete share-link lifecycle — generate, copy, access, revoke. Patient opens URL without a Falaped account and downloads their document.

**Addresses:** `share_links` migration (anon SELECT + authenticated owner-all policies); `NEXT_PUBLIC_APP_URL` env var; `modules/share-links/`; `actions/share-links/`; `isShareRoute` middleware guard; `app/share/[token]/page.tsx`; `app/api/share/[token]/download/route.ts`.

**Avoids:** Pitfalls 5 (token entropy), 6 (CDN signed URL), 7 (LGPD audit log)

---

### Phase 3: Patient Timeline

**Rationale:** Requires Phase 1. Independent of Phase 2 — can be built in parallel. Share button on timeline rows requires Phase 2 token action to exist.

**Delivers:** Unified chronological feed with month grouping, event-type filter pills, and inline share buttons.

**Addresses:** `get-patient-timeline.ts` module; auth-gated action wrapper; refactor `patient-detail-timeline.tsx`; client-side filter pills.

---

### Phase 4: Tests and CI Hardening

**Rationale:** `@supabase/ssr: "latest"` is an active supply-chain risk. Local Yarn broken means developers skip tests. Should start immediately in parallel with Phase 1.

**Delivers:** Reproducible CI; pinned Supabase deps; `--frozen-lockfile` enforced; ownership regression tests for IDOR fix; share-link unit tests.

**Addresses:** Pin semver for `@supabase/ssr` and `@supabase/supabase-js`; `yarn install --frozen-lockfile` in CI; `corepack enable` documented; ownership tests for delete actions; token create/validate unit tests.

---

### Phase 5: UI Polish — Branded Share Page and Doctor UX

**Rationale:** Post-validation. Trigger is patient feedback ("link looks suspicious") or doctor request for expiry reminders.

**Delivers:** Branded public download page; expiry countdown; one-click link regeneration.

---

### Phase Ordering Rationale

- Phase 1 before everything: IDOR is live and exploitable; RLS is required for the anon SELECT policy on `share_links` to work.
- Phases 2 and 3 can overlap once Phase 1 is verified: they converge only at the "share button on timeline" UI step.
- Phase 4 starts immediately in parallel with Phase 1: pinning deps and freezing lockfile is a one-hour task.
- Phase 5 is explicitly post-validation.

### Research Flags

Phases needing deeper research during planning:
- **Phase 1 (RLS):** The `cases` table uses `user_phone` tenancy (not `profile_id`) — two-hop join policy is non-standard. Run `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false` on live DB before writing migrations to confirm the complete current table list.
- **Phase 2 (Share-links):** LGPD ANPD interpretive guidance postdates training cutoff — verify current breach notification window before launch.

Phases with standard patterns (skip research-phase):
- **Phase 3 (Timeline):** Three parallel queries + TypeScript merge; all data modules already exist.
- **Phase 4 (CI):** Frozen lockfile + semver pinning are well-documented.
- **Phase 5 (UI polish):** `date-fns` countdown and branded server component are standard.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against Supabase Context7 docs and live codebase; zero new dependencies confirmed |
| Features | HIGH / MEDIUM (LGPD) | Storage and codebase features confirmed via direct audit; LGPD obligations from well-established law text; ANPD guidance may have evolved |
| Architecture | HIGH | Patterns derived directly from existing codebase files (`proxy.ts`, download routes, `phone_link_codes` migration) |
| Pitfalls | HIGH | IDOR confirmed in live code; RLS/CDN behavior confirmed via official Supabase docs |

**Overall confidence:** HIGH

### Gaps to Address

- **LGPD ANPD guidance:** Verify current ANPD guidance on health data breach notification and processing records before Phase 2 launch (`gov.br/anpd`).
- **`cases` table full RLS policy:** Verify the `user_phone` two-hop join policy against a staging authenticated session before production deploy.
- **`pg_tables` audit on live DB:** Run the `rowsecurity = false` query on the live Supabase project before writing migrations — the table list from `CONCERNS.md` may be stale.
- **Supabase exact pinned versions:** Confirm safe semver from current `yarn.lock` resolved versions before committing pinned ranges to `package.json`.

## Sources

### Primary (HIGH confidence)
- `/supabase/supabase` (Context7) — `createSignedUrl`, RLS enable, policy syntax, `bypassrls`, CDN cache behavior, anon vs authenticated policies
- Falaped codebase (direct read) — `lib/supabase/proxy.ts`, `lib/supabase/server-admin.ts`, download routes, `get-cases-by-patient-id.ts`, `phone_link_codes` migration, storage RLS migrations
- `.planning/codebase/CONCERNS.md` — IDOR confirmed in `delete-prescription.ts:33` and `delete-medical-certificate.ts:33`
- `.planning/codebase/TESTING.md` — corepack/Yarn failure documented; `node:test` runner confirmed

### Secondary (MEDIUM confidence)
- LGPD Lei 13.709/2018 (Arts. 6, 11, 18, 37, 46, 48) — training knowledge; law text well-established
- `.planning/PROJECT.md` — project constraints confirmed

### Tertiary (LOW confidence — validate before Phase 2 launch)
- ANPD interpretive guidance on health data breach notification — verify against current `gov.br/anpd` before launch

---
*Research completed: 2026-06-04*
*Ready for roadmap: yes*
