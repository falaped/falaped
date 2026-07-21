# Project Research Summary

**Project:** Falaped
**Domain:** Appointment scheduling + delegated token-link booking + earnings ledger, added to an in-production Next.js 16 / Supabase pediatric clinical web app
**Milestone:** v1.1 "Agenda & Ganhos"
**Researched:** 2026-07-20
**Confidence:** HIGH

> This SUMMARY.md was regenerated for milestone **v1.1**. It fully supersedes the prior v1.0 synthesis (age display, vaccines, clinical documents). Recover v1.0 research from git history if needed.

## Executive Summary

Milestone v1.1 gives the solo pediatrician a first-class agenda: recurring weekly availability with day/week/month views, appointment booking with a "pedido a confirmar → confirmado → realizada/falta/cancelada" lifecycle, a delegated **token link** that lets a trusted assistant book on the doctor's behalf without ever touching the prontuário, and a lightweight earnings ledger with period totals and average-per-consultation. Experts build this the way the four researchers converged on: **add almost nothing to the stack** (the existing Next.js 16 / React 19 / Supabase / `recharts` / `date-fns` / native `crypto` stack already covers ~90% of the milestone; the *only* warranted new dependency is `@date-fns/tz` for correct clinic-local slot math), model availability as **recurrence rules expanded to slots on read** (never materialized rows), enforce non-overlap **at the database** (Postgres `btree_gist` exclusion constraint), and store money as **integer cents aggregated in SQL**.

The dominant risk — and the milestone's defining engineering problem — is the **token-authenticated assistant link**: the app's first session-less external surface, exposing a base of minors (LGPD). The research is emphatic and unanimous on how to build it: a **route handler** (not a server action, no paid gate), authenticating purely by a **SHA-256-hashed, ≥256-bit CSPRNG token** at rest (NOT the raw `phone_link_codes` plaintext pattern — that precedent is acceptable only for a 5-minute 6-digit code), with **mandatory revocation/expiry**, a **narrow exact-prefix middleware exemption** in `lib/supabase/proxy.ts`, and `profile_id` derived **only** from the verified token — never from the request. A critical correction surfaced across the research: the codebase's "no table RLS" note is **STALE** — every migration since 2026-06-04 enables RLS with the canonical `profile_id` policy in the same migration as the table, so all five new v1.1 tables must follow that norm. Because the doctor path now has RLS but the token path has no `auth.uid()`, the token surface must use the **service-role admin client** and re-impose isolation in application code (resolve `profile_id` from the token, stamp/filter it on every query) — a single omission is a cross-tenant leak.

The researchers independently converged on the same **dependency-ordered phase structure**: build availability + calendar views first (zero new attack surface), then doctor-side appointments + lifecycle (with the exclusion constraint), then the token/security foundation **built and cross-tenant-tested in isolation with no UI**, then the assistant booking UI on top of the proven endpoint, and finally the earnings ledger + panel (orthogonal, depends only on the appointment FK). The token/security phase is the one to flag for deeper security review; everything else follows well-documented patterns already present in the codebase.

## Key Findings

### Recommended Stack

The existing stack already covers this milestone. See `.planning/research/STACK.md`. The opinionated call is **add one dependency, vendor UI as source, build the rest with primitives.** `recharts@3.9.0` (already installed and used in `growth-chart.tsx`) powers the earnings panel; native `crypto` mints tokens (the `phone-link-codes` module is the precedent to harden, not copy verbatim); calendar day/week/month views are **built with CSS grid + `date-fns`**, not an npm scheduler (vendor a shadcn calendar block's source if a head start is wanted). The token endpoint runs on the **Node.js runtime** (needs full `crypto.subtle` + Supabase server client), never Edge.

**Core technologies:**
- **`@date-fns/tz` ^1.4.x** (THE only new dep, ~1 kB): `TZDate` to resolve "Mon 14h–18h `America/Sao_Paulo`" to correct UTC instants and back — companion to the installed `date-fns@4`.
- **`recharts@3.9.0`** (installed): earnings panel bar/line totals by day/week/month — zero new charting dep.
- **Native `crypto`** (Node/Web): mint opaque ≥256-bit tokens, hash with `crypto.subtle.digest` before storage — no `jose`/`jsonwebtoken`/`nanoid`/`uuid`.
- **Supabase Postgres** (installed): new tables + SQL aggregation (`date_trunc`, `sum`, `avg`) + the `btree_gist` exclusion constraint.
- **`date-fns@4` / `zod@4` / `react-day-picker@9`** (installed): slot math, boundary intervals, boundary validation, month mini-picker.

**Do NOT add:** any JWT lib, `nanoid`/`uuid`, a calendar-scheduler runtime dep, `date-fns-tz` (legacy), a second chart lib. **Yarn only** (`yarn add`, never `npm install`).

### Expected Features

See `.planning/research/FEATURES.md`. Scope respects PROJECT.md's explicit out-of-scope decisions: no notifications, no online payment, no public self-service link.

**Must have (table stakes, all P1 for v1.1):**
- Recurring weekly availability grid + configurable slot duration — the skeleton everything hangs on.
- Block exceptions (holiday/folga) — the grid is unusable without an override layer.
- Day / week / month calendar views — how the doctor reads the agenda.
- Book appointment (search existing / create new child patient into a slot) — reuses the existing patients domain.
- Status lifecycle: `pedido a confirmar → confirmado → realizada | falta | cancelada`, plus `remarcar` (keeps history).
- Earnings ledger: value per consultation + **avulso** (standalone) entries — appointment link nullable.
- Earnings panel: totals by day/week/month + average per consultation.
- **Delegated secretary scoped token link** — the v1.1 signature feature; own token auth, revocable; build last (highest risk).

**Should have (differentiators, defer to v1.x):**
- `particular`/`convênio` tag on earnings + grouped totals — cheap, high Brazilian relevance.
- Inline "log value recebido" when a consult is marked `realizada` — collapses two tasks into one.
- No-show count/rate stat in the panel — derived from lifecycle data already captured.
- Deep-link from an appointment to the child's prontuário / growth curve (doctor-side only, never the token surface).

**Defer (v2+ / out of scope):**
- Notifications / WhatsApp confirmation (explicit decision — later cycle, LGPD consent + messaging infra).
- Public self-service family booking (LGPD — the scoped token for a trusted assistant is the deliberate alternative).
- Online payment / billing / TISS convênio claims; multi-provider scheduling; full accounting; RRULE-level recurrence.

### Architecture Approach

See `.planning/research/ARCHITECTURE.md`. Two auth doors over one isolation invariant. The **doctor door** uses the cookie client and RLS (`auth.uid()`); the **assistant door** has no session, uses the **service-role admin client**, and re-imposes `profile_id` isolation in application code from the verified token. New domains slot cleanly into the existing three-layer `app/ → actions/ → modules/`: doctor-side actions keep the standard auth + paid gate + Zod; the token surface is the one deliberate exception (route handler + `verifyLinkToken`, no paid gate, deliberately-tiny allow-list of modules — `findPatientsForBooking`, minimal `createPatient`, `createAppointment` pending — that import nothing clinical). Availability is stored as **rules + exceptions** and expanded to slots via a **pure, unit-tested `expand-slots.ts`** (no DB, no `next/*`). Five new tables (`availability_rules`, `availability_exceptions`, `appointments`, `financial_entries`, `assistant_link_tokens`) all ship RLS + four policies in the same migration.

**Major components:**
1. `app/dashboard/agenda/*` + `app/dashboard/ganhos/*` — doctor calendar, availability editor, link management, earnings panel (authenticated, RLS).
2. `app/agenda-link/[token]/*` + `app/api/agenda-link/route.ts` — session-less assistant surface, physically **outside** `app/dashboard/` so it inherits no nav/layout/context; token-verified, admin client, `profile_id` from token only.
3. `modules/{availability,appointments,financial-entries,assistant-links}/*` — one fn/file, injected client, `profile_id`-scoped; `expand-slots.ts` (pure) and `verify-link-token.ts` (security-critical) are the load-bearing units.
4. `lib/supabase/proxy.ts` — **modified** with a narrow exact-prefix exemption so `/agenda-link*` isn't redirected to login (the route still self-verifies the token).

### Critical Pitfalls

See `.planning/research/PITFALLS.md` (19 pitfalls; the two highest-blast-radius families are token-link security and double-booking/slot correctness).

1. **Token stored raw / weak / non-revocable** — a DB leak of one plaintext token = every doctor's agenda + child roster. Store a **SHA-256 hash** of a **≥256-bit CSPRNG** token, show plaintext once, and ship `revoked_at`/`expires_at` + a rotate-link UI **in the same phase** (revocation is table-stakes, not a follow-up).
2. **Double-booking race (TOCTOU)** — app-level "select-then-insert" cannot prevent concurrent double-booking. Enforce a **Postgres `btree_gist` EXCLUDE** constraint on `(profile_id =, tstzrange(starts_at, ends_at) &&)`; catch the violation and return a friendly "horário já ocupado" result union. Decide explicitly whether `pending` participates or only `confirmed` (see open questions).
3. **Middleware exemption wrong in either direction** — too narrow and the link 302s to login; too broad and dashboard routes open logged-out. Add a **narrow exact-prefix guard** inside `updateSession` before the sign-out branch; test both directions.
4. **Token scope creep / patient-base leak** — reusing doctor modules exposes prontuário; unbounded search dumps the roster of minors. Build a **dedicated minimal action surface** with allowlisted DTO fields (no `SELECT *`), min query length, result cap, and per-token throttling.
5. **Money as float / aggregation in JS / TZ-wrong buckets / totals include voided** — store **integer cents**, aggregate in **SQL** on exact values (round once at display), bucket by **clinic-local date** (`AT TIME ZONE 'America/Sao_Paulo'`), and **void, never delete** (totals filter `voided_at IS NULL`). Every ledger/appointment query carries `.eq("profile_id", …)` — the systemic no-RLS-era IDOR trap, now backstopped by enabling RLS on the new tables.

## Implications for Roadmap

Based on research, the four files independently converged on the same dependency-ordered structure. The chain forces the token/isolation foundation to be built and hardened **before** any assistant-facing UI, and puts the earnings panel last/parallel.

### Phase 1: Availability model + doctor calendar
**Rationale:** Lowest risk, no new external attack surface; establishes the calendar the assistant will later write into. Everything downstream depends on the availability rules.
**Delivers:** `availability_rules` + `availability_exceptions` tables (+ RLS in-migration), pure unit-tested `expand-slots.ts`, `actions/availability/*`, `app/dashboard/agenda` day/week/month views + availability editor.
**Addresses:** recurring weekly grid, slot duration, block exceptions, day/week/month views.
**Avoids:** timezone/DST drift (Pitfall 9 — store wall-clock + IANA zone, `@date-fns/tz`, never `+n*86400000`); week/month off-by-one (Pitfall 10 — half-open `[start,end)`, `weekStartsOn: Monday`, boundary specs); recurrence materialization drift (Pitfall 11 — rules, not slot rows).

### Phase 2: Appointments (doctor-created) + status lifecycle
**Rationale:** Reuses the existing `patients` domain for the doctor-create path; still no external surface. Must land the exclusion constraint here (it is schema, not UI) since the token phase will write into it.
**Delivers:** `appointments` table (+ RLS, `(profile_id, starts_at)` index, **`btree_gist` exclusion constraint**), `modules/appointments/*` (create/confirm/cancel/reschedule/conflict), `actions/appointments/*`, calendar rendering of pending→confirmed.
**Addresses:** book appointment, full lifecycle (pedido→confirmar→realizada/falta/cancelar/remarcar), no-show state kept distinct.
**Avoids:** double-booking race (Pitfall 8); double-confirm surfacing a raw `23P01` (Pitfall 12 — confirm is the step that must pass the `confirmed`-only constraint, caught into a result union).

### Phase 3: Token model + scoped external endpoint (SECURITY FOUNDATION — build & test in isolation, NO UI)
**Rationale:** The app's first session-less door. Must be hardened and cross-tenant-tested **before** any assistant UI exists. This is the milestone's central risk.
**Delivers:** `assistant_link_tokens` table (+ RLS, **hash-at-rest**, `expires_at`/`revoked_at`/`last_used_at`), `modules/assistant-links/{create,verify,revoke}`, doctor-side `actions/assistant-links/*` (generate/list/revoke), the **narrow `/agenda-link*` middleware exemption**, `app/api/agenda-link/route.ts` (route handler + `verifyLinkToken` + **admin client** + `profile_id` from token only), and the deliberately-tiny module allow-list.
**Uses:** native `crypto` (mint + `crypto.subtle` hash), service-role admin client, `verifyLinkToken` returning `{ profileId, scope }`.
**Avoids:** raw/weak/non-revocable token (Pitfalls 1–3); wrong middleware exemption (Pitfall 4); scope creep + roster leak (Pitfalls 5–6); no CSRF/rate-limit on a session-less route (Pitfall 7); `profile_id` from request (Pitfall 17); admin-client-without-ownership-filter (Pitfall 19); token route wrongly inheriting the paid gate (Pitfall 18b).
**Verification gate:** explicit cross-tenant tests — a token for doctor X cannot see or write doctor Y's data; empty search returns nothing; the path cannot reach any clinical module.

### Phase 4: Assistant booking UI on the proven endpoint
**Rationale:** Pure UI over Phase 3's already-tested endpoint; the security invariant is established before a real user touches it.
**Delivers:** `app/agenda-link/[token]/*` — token-verified minimal shell: patient search / create-minimal + slot picker + "pedido a confirmar." No nav to the rest of the app.
**Addresses:** delegated secretary booking; assistant searches existing or creates a new child patient into a slot.
**Avoids:** distinct pending-vs-confirmed visual states (UX pitfall — avoids duplicate requests / unclear queue).

### Phase 5: Earnings ledger + panel
**Rationale:** Orthogonal to A–D; depends only on the appointment FK from Phase 2, so it can float but slots after B. Independent of the token surface entirely.
**Delivers:** `financial_entries` table (+ RLS, integer `amount_cents`, `voided_at`, nullable `appointment_id`), `modules/financial-entries/*` incl. SQL `summarize-period`, `actions/financial-entries/*`, `app/dashboard/ganhos`.
**Addresses:** per-consultation + avulso entries, totals by day/week/month, average per consultation.
**Avoids:** float money (Pitfall 13); double-rounding + UTC-vs-local bucket drift (Pitfall 14 — aggregate on cents, round once, bucket `AT TIME ZONE`); voided entries in totals (Pitfall 15 — void not delete); money IDOR (Pitfall 16 — `.eq("profile_id",…)` on every aggregate + ownership test).

### Phase Ordering Rationale
- **A → B** deliver a working doctor agenda with zero new attack surface; B lands the exclusion constraint the token phase writes into.
- **C before D** is non-negotiable: the first session-less door must be hardened and cross-tenant-tested in isolation before any assistant UI exposes it.
- **E floats** but depends on B for the `appointment_id` FK target; it can run in parallel with D.
- Availability-as-rules and money-as-cents are cross-cutting decisions baked into the earliest phase that touches each, preventing the materialization and float pitfalls from ever entering the schema.

### Research Flags

Phases likely needing deeper research / review during planning:
- **Phase 3 (Token + external endpoint):** flag for **deeper security review** — first session-less surface over LGPD minor data, service-role client, no existing rate-limit infra (no Redis). Warrants a dedicated security pass (`/gsd-secure-phase` or a security-focused plan). This is the single phase the milestone flags.

Phases with standard patterns (skip research-phase):
- **Phases 1, 2, 5:** well-documented, established patterns already present in the codebase (three-layer, RLS-in-migration, SQL aggregation, `date-fns`). The pure `expand-slots` and `summarize-period` are unit-testable in the existing `*.spec.ts` convention.
- **Phase 4:** pure UI over a proven endpoint; no new infrastructure.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against `package.json` (recharts 3.9.0, date-fns ^4, react-day-picker ^9, no jwt/nanoid/uuid); one small well-supported new dep (`@date-fns/tz`). |
| Features | MEDIUM | Table stakes/lifecycle grounded in multiple BR + global scheduling tools (MEDIUM sources); PROJECT.md decisions pin scope. Some product judgments (average denominator, tag grouping) need doctor confirmation. |
| Architecture | HIGH | Grounded directly in the codebase — migrations, middleware, auth helper, `phone-link-codes` precedent all read; RLS-now-the-norm finding verified against post-2026-06-04 migrations. |
| Pitfalls | HIGH | DB techniques (btree_gist, integer cents, `AT TIME ZONE`) verified against Postgres/Crunchy docs; security pitfalls grounded in the repo's own CONCERNS.md IDOR/service-role findings and the `phone_link_codes` token precedent. |

**Overall confidence:** HIGH

### Gaps to Address

These open questions each researcher flagged must be resolved as **decisions in the requirements / discuss-phase** for the phase noted:

- **Pending vs confirmed in the exclusion constraint** (Phase 2): does `pending` block the slot, or only `confirmed`? "Pedido a confirmar" semantics lean toward `confirmed`-only (pending may overlap, doctor resolves at confirm), but decide explicitly and encode in the `WHERE`.
- **Average-per-consultation denominator** (Phase 5): are `avulso` (appointment-less) entries excluded from the average? Recommended `sum(cents where appointment_id not null) / count(distinct appointment_id)` — confirm with the doctor.
- **Clinic timezone source** (Phase 1): hardcoded `America/Sao_Paulo` constant vs a `clinic_timezone` column on `profiles`. Single fixed tz is fine for v1.1; a column future-proofs multi-clinic. Also fixes the earnings reporting zone (Phase 5).
- **Token expiry policy** (Phase 3): default `expires_at` (nullable = long-lived) — pick a default and whether the doctor sets it per link.
- **Lapsed-subscription link behavior** (Phase 3): should a non-`paid` doctor's assistant link stop working? The token path deliberately skips the paid gate; decide whether to re-check `paid` when serving the link.
- **Assistant-creates-minimal-patient-row** (Phase 4): confirm the recommended shape (A) — assistant creates a real minimal patient row immediately (name/responsible/phone only, no clinical fields), deduped via `find-patient-by-profile-id-name-responsible`, vs (B) deferring to a snapshot the doctor later promotes.

## Sources

### Primary (HIGH confidence)
- Falaped codebase read directly — `proxy.ts`, `lib/supabase/proxy.ts`, `lib/supabase/server.ts`, `lib/supabase/server-admin.ts`, `modules/phone-link-codes/create-link-code.ts`, `modules/patients/{create-patient,find-patient-by-profile-id-name-responsible}.ts`, `components/dashboard/patients/growth/growth-chart.tsx`, `package.json`.
- Migrations establishing the RLS-in-migration norm — `20260604000004_rls_auxiliary.sql`, `20260710000100_rls_referrals.sql`, `20260710010100_rls_medical_reports.sql`, `20260720000100_rls_vaccine_schedules.sql`, `20260228130000_phone_link_codes.sql`.
- `.planning/codebase/{STACK,ARCHITECTURE,INTEGRATIONS,CONCERNS}.md` (three-layer, paid gate, IDOR/service-role findings, no Redis) and `.planning/PROJECT.md` v1.1 Key Decisions; `CLAUDE.md`.
- PostgreSQL docs — monetary/numeric types (float unsuitable for money); `btree_gist` + `tstzrange &&` exclusion constraints; Crunchy Data "Working with Money in Postgres."
- date-fns v4 timezone support / `@date-fns/tz` `TZDate` (official companion) — blog.date-fns.org, npmjs.com/package/@date-fns/tz.
- Next.js 16 Route Handlers, dynamic segments, Node vs Edge runtime — nextjs.org docs.

### Secondary (MEDIUM confidence)
- Scheduling feature landscape / lifecycle — Setmore, TIMIFY, SuperSaaS, TELUS CHR, SimplePractice, Healthie, Accountable (scoped tokens / expiring URLs).
- Brazilian tools (recebimentos via agenda, secretary agenda, WhatsApp confirmation) — iClinic, 4Medic, Conclínica, GestãoDS, Syntia.
- Appointment UTC storage + explicit-timezone best practice — Microsoft Q&A.
- Double-booking exclusion-constraint pattern write-ups — jusdb, jsupskills, boringsql.
- shadcn calendar/scheduler blocks (copy-in source, not deps) — Mina Scheduler, shadcn Event Calendar.

### Tertiary (LOW confidence)
- None material; product judgments (average denominator, tag grouping, expiry defaults) are flagged as decisions above rather than treated as findings.

---
*Research completed: 2026-07-20*
*Ready for roadmap: yes*
