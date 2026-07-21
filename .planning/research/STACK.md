# Stack Research

**Domain:** Appointment scheduling + earnings ledger, added to an in-production Next.js 16 / Supabase pediatric clinical web app (Falaped, milestone v1.1 "Agenda & Ganhos")
**Researched:** 2026-07-20
**Confidence:** HIGH

## TL;DR — the opinionated call

**Add almost nothing.** The existing stack already covers ~90% of this milestone. The verified installed deps (`recharts@3.9.0`, `date-fns@4.1.0`, `zod@4.3.6`, `react-day-picker@9.4.4`, native `crypto`, Supabase Postgres) are enough to build recurring availability, the calendar views, the token booking surface, and the earnings panel.

- **Charting (earnings panel): reuse `recharts@3.9.0`.** Already installed and already used (`components/dashboard/patients/growth/growth-chart.tsx`). Do NOT add a chart lib.
- **Token generation: reuse native `crypto` + Postgres.** The `phone-link-codes` module (`modules/phone-link-codes/create-link-code.ts`) is the exact precedent — a cryptographically random secret + `expires_at` column validated by an external caller. Do NOT add `jsonwebtoken`, `jose`, `nanoid`, or `uuid`.
- **Date/timezone/slots: reuse `date-fns@4` + ADD `@date-fns/tz` (one tiny dep, ~1 kB).** Store instants as `timestamptz` (UTC) in Postgres; treat clinic timezone as a single fixed value (`America/Sao_Paulo`). `@date-fns/tz`'s `TZDate` is the only genuinely-warranted new library, and it's the officially-maintained companion to the v4 already installed.
- **Calendar day/week/month views: BUILD with primitives (CSS grid + date-fns), do NOT `npm install` a scheduler.** No calendar-scheduler npm package fits the three-layer + shadcn conventions cleanly. The good options (Mina Scheduler, shadcn Event Calendar) are **copy-in shadcn blocks**, not deps — vendor the parts you want, don't take a runtime dependency. `react-day-picker@9` (already installed) handles the month mini-picker.
- **The token endpoint is a Route Handler (`app/api/agenda/[token]/…/route.ts`) on the Node.js runtime, NOT a Server Action and NOT middleware-gated.** It must bypass the `profile.status === "paid"` session gate and authenticate purely by token.

## Recommended Stack

### Core Technologies (all already installed — reuse)

| Technology | Version (installed) | Purpose in this milestone | Why reuse |
|------------|---------------------|---------------------------|-----------|
| Next.js | ^16.2.0 | Route Handler for token booking surface; Server Actions for doctor-side agenda/finance mutations | App Router route handlers are the correct primitive for a non-session-gated external endpoint; Server Actions stay for the authenticated doctor flows (matches existing `app/ → actions/ → modules/`) |
| React | ^19.0.0 | Calendar view components (day/week/month), booking form | Existing |
| TypeScript | ^5 (strict) | All logic incl. slot-generation module (pure, unit-testable) | Existing |
| Supabase Postgres | `@supabase/supabase-js` ^2.107.0 | New tables: `availability_rules`, `appointments`, `booking_tokens`, `earnings`; period aggregation via SQL | Slot/earnings aggregation belongs in Postgres (`date_trunc`, `generate_series`), not app code, for correctness at scale |
| recharts | **3.9.0** | Earnings panel: bar/line totals by day/week/month | **Already installed and already in use** (growth-chart). Zero new deps for charting |
| date-fns | ^4.1.0 | Slot math, week/day grid construction, formatting | Already the project's date lib; v4 has first-class TZ support |
| zod | ^4.3.6 | Validate availability rules, booking payloads, earnings input at action/route boundaries | Existing validation convention (`lib/schemas/`) |
| react-day-picker | ^9.4.4 | Month mini-calendar / date jump in the agenda | Already installed; do not reimplement a month picker |
| Native `crypto` | Node/Web | Mint opaque booking tokens (`crypto.getRandomValues` / `crypto.randomUUID`), hash before storage | Precedent exists in `modules/phone-link-codes/create-link-code.ts`; zero deps |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@date-fns/tz** | **^1.4.x** (verify latest at install) | `TZDate` — evaluate recurring rules and render slots in the clinic's fixed timezone (`America/Sao_Paulo`) while storing UTC | **The only new dependency worth adding.** Needed because recurring "Mon 14h–18h" must resolve to correct UTC instants; the official v4 companion, ~1 kB. Use `TZDate`/`TZDateMini` internally |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `tsx --test` (Node test runner) | Unit-test the pure slot-generation module (`modules/agenda/generate-slots.ts` etc.) | Slot expansion (rule → concrete slots for a date range, minus booked/blocked) is pure logic — cover it with `*.spec.ts` next to the module, per existing convention |

## Detailed recommendations for the four open questions

### 1. Token-authenticated external booking surface — the Next 16 pattern

**Use a Route Handler, not a Server Action, and put it on the Node.js runtime. Do NOT protect it with the normal `paid` session gate.**

- **Location:** `app/api/agenda/[token]/…/route.ts` (dynamic segment carries the opaque token) OR a page `app/agenda/[token]/page.tsx` whose mutations call token-scoped Server Actions that re-verify the token on every call. Recommended: a **page for the assistant's UI + route handlers (or token-verifying actions) for the mutations**. Either way, **every request re-verifies the token server-side** (defense in depth — never trust the URL alone).
- **Why a route handler over the standard action path:** the standard actions in this repo all call `getAuthenticatedUser(supabase)` and gate on `profile.status === "paid"`. This surface has **no Supabase Auth session** and must not inherit that gate. A dedicated handler/action family with its own `verifyBookingToken()` guard keeps the paid-gate invariant intact everywhere else.
- **Runtime:** **Node.js runtime** (default for route handlers), NOT Edge. It needs the Supabase server client + `crypto` hashing; Edge middleware notoriously lacks parts of Node `crypto`. Keep the token check inside the handler/action, not in `proxy.ts` middleware (middleware is the first line of defense only; re-verify in the handler).
- **Token minting/storage/verification (mirror `phone-link-codes`):**
  - **Mint:** opaque high-entropy secret via `crypto.randomUUID()` or `crypto.getRandomValues` (≥128 bits). This is a **bearer secret, not a JWT** — do not add `jose`/`jsonwebtoken`. Opaque + DB-backed gives instant **revocation** (a JWT can't be revoked without a denylist anyway).
  - **Store:** a `booking_tokens` row scoped by `profile_id`, with `token_hash` (store a SHA-256 hash, not the raw token — the URL is the credential), `expires_at` (nullable for long-lived assistant links), `revoked_at`, `label`. Hash with native `crypto.subtle.digest`.
  - **Verify:** hash the incoming token, look up by hash, check `revoked_at IS NULL` and `expires_at` — then resolve the `profile_id` and scope all subsequent queries to it. Enforce **row-level scoping in the handler** (and/or a dedicated RLS policy keyed by a verified token claim).
- **Scope enforcement:** the token grants exactly: read agenda (of that `profile_id`), search/create `patients` (of that `profile_id`), create `appointments` as `status = 'pending'`. It must NOT expose prontuário/cases/documents. Enforce by only ever calling the whitelisted `modules/` functions from this surface — never the general dashboard actions.

### 2. Recurring weekly availability + day/week/month views

**Model the recurrence as rules, not materialized rows. Build views with CSS grid + date-fns. Do NOT install a scheduler library.**

- **Data model:** `availability_rules` = `{ profile_id, weekday (0–6), start_time, end_time, slot_minutes }` (+ optional exceptions/blocks table for one-off closures). Concrete slots are **derived on read** by expanding rules across a date window and subtracting booked/blocked slots — a pure function in `modules/agenda/`. This avoids the "materialize infinite recurrence" trap.
- **Views:** day = single-column time grid; week = 7-column CSS grid; month = `react-day-picker` (installed) as the month surface, or a simple 6×7 grid built from `date-fns` (`startOfWeek`/`eachDayOfInterval`). All three are ~200–400 lines of Tailwind + date-fns; a runtime scheduler dep would fight the shadcn/three-layer conventions and add weight.
- **If you want a head start on visuals:** vendor (copy source into `components/dashboard/agenda/`) from a shadcn calendar block (e.g. Mina Scheduler / shadcn Event Calendar) — **as source, not a package**. Strip their state libs; wire to your Server Actions.
- **`@dnd-kit` is already installed** if drag-to-move appointments is ever wanted — no new dep needed for that later.

### 3. Date / timezone / slot handling

**Assume ONE clinic timezone (`America/Sao_Paulo`), store UTC, convert at the edges.**

- **Storage:** appointment start/end as Postgres `timestamptz` (UTC instant). Availability rules store **local wall-clock `time`** + `weekday` (recurrence is defined in clinic-local terms).
- **Conversion:** use `@date-fns/tz` `TZDate` to turn "weekday 14:00 America/Sao_Paulo on date D" into the correct UTC instant, and to render UTC instants back to clinic-local for display. Brazil currently observes no DST, but pinning the tz explicitly future-proofs and keeps server-vs-browser tz bugs out (Vercel servers run UTC).
- **Slots:** pure module `generate-slots(rules, window, booked, blocks) → Slot[]`, fully unit-tested with `tsx --test`. Keep it side-effect-free (no Supabase, no `next/*` imports) per the modules convention.
- **Why one dep and not `date-fns-tz`:** `@date-fns/tz` is the officially-maintained v4 companion; `date-fns-tz` is the legacy third-party lib. New code on v4 → `@date-fns/tz`.

### 4. Earnings aggregation + charting

**Aggregate in SQL, chart with recharts (installed).**

- **Data model:** `earnings` = `{ profile_id, appointment_id (nullable — standalone allowed), amount_cents, occurred_at, note }`. Store money as **integer cents** (never float).
- **Aggregation:** compute totals by day/week/month and average-per-consultation with Postgres `date_trunc('day'|'week'|'month', occurred_at)` + `sum`/`avg`, in a `modules/earnings/` query — do not aggregate large sets in JS.
- **Charting:** `recharts@3.9.0` bar/line/area — already installed, already used. No new charting dep.

## Installation

```bash
# The ONLY new runtime dependency for this entire milestone:
yarn add @date-fns/tz

# Nothing else. recharts, date-fns, zod, react-day-picker, react-hook-form,
# @dnd-kit, radix/base-ui, sonner, and native crypto are already present.
```

Note: repo is **Yarn 1.x only** (per commit `556f6b8`) — use `yarn add`, never `npm install`.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Build calendar views with CSS grid + date-fns | `react-big-calendar`, FullCalendar, Mina Scheduler (as a dep) | If the doctor later wants heavy drag/resize/overlap-collision UX beyond a simple slot grid. Even then, prefer vendoring a shadcn block over a runtime dep |
| Opaque DB-backed token (native `crypto`) | JWT via `jose` | If tokens ever had to be verified statelessly by a *separate* service with no DB access. Not the case here; opaque wins on revocability + zero deps |
| `@date-fns/tz` (`TZDate`) | `date-fns-tz` | Only if migrating legacy `date-fns-tz` code; new v4 code should use `@date-fns/tz` |
| Store UTC + fixed clinic tz | Store naive local time, no tz | Acceptable-ish because BR has no DST today, but fragile against Vercel-UTC servers and any future multi-tz need. Not worth the risk |
| recharts | `@nivo`, `visx`, Chart.js | Never here — recharts is already installed and used; adding a second chart lib is pure bloat |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `jsonwebtoken` / `jose` for the booking token | Adds a dep; JWTs can't be cleanly revoked; overkill for a bearer link | Opaque random token (native `crypto`) + `booking_tokens` table (mirror `phone-link-codes`) |
| `nanoid` / `uuid` | Native `crypto.randomUUID()` / `crypto.getRandomValues` already available and already used in the repo | Native `crypto` |
| A calendar-scheduler npm package (FullCalendar, react-big-calendar) as a runtime dep | Fights shadcn + three-layer conventions, adds weight/CSS, hard to theme to the pediatric design system | CSS grid + date-fns; optionally vendor a shadcn calendar block's source |
| `date-fns-tz` | Legacy third-party lib; not the v4 path | `@date-fns/tz` |
| A second charting lib | recharts@3.9.0 already installed & used | recharts |
| Materializing every recurring slot into rows | Unbounded growth, painful edits to recurrence | Store rules; expand to concrete slots on read (pure module) |
| Putting token auth in `proxy.ts` middleware only | Middleware = Edge by default (partial `crypto`), and it's only a first line of defense | Re-verify token inside the Node.js route handler / token-scoped action |
| Storing money as float | Rounding errors in totals/averages | Integer `amount_cents` |

## Stack Patterns by Variant

**If the assistant link must expire / be rotated per assistant:**
- Give `booking_tokens` an `expires_at` + `revoked_at` + `label`, and a doctor-side action to mint/list/revoke tokens.
- Because token is opaque + DB-backed, revocation is a single `UPDATE ... SET revoked_at = now()`.

**If drag-to-reschedule is wanted later:**
- Reuse the already-installed `@dnd-kit/*` — no new dep.

**If multi-clinic / multi-timezone ever appears:**
- The `timestamptz` + `@date-fns/tz` design already supports it; add a `timezone` column to the clinic/profile instead of the hardcoded `America/Sao_Paulo` constant.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@date-fns/tz` ^1.x | `date-fns` ^4.1.0 | Purpose-built companion to date-fns v4; TZDate works with all v4 functions. Confirm latest patch at install time |
| `recharts` 3.9.0 | React ^19 | Already running in production (growth chart) — no action needed |
| Route Handlers (Node runtime) | Next.js ^16.2.0 | Default runtime is Node; do not opt into Edge for the token endpoint (needs full `crypto` + Supabase server client) |
| Native `crypto.subtle` | Node.js (Vercel functions) | Available in Node runtime; another reason to keep the token endpoint off Edge |

## Integration points with the existing architecture

- **Layering:** new domains `modules/agenda/`, `modules/appointments/`, `modules/booking-tokens/`, `modules/earnings/` (one function per file, injected `SupabaseClient`, throw `[DOMAIN] ...`). Doctor-side mutations via `actions/agenda/`, `actions/earnings/` with the standard auth + `paid` gate + Zod. Barrels in each `actions/<domain>/index.ts` + root `actions/index.ts`.
- **The token surface is the one deliberate exception** to the `paid` gate: its route handlers / token-scoped actions call `verifyBookingToken()` instead of `getAuthenticatedUser` + paid check, and only ever invoke the whitelisted agenda/patient-search/appointment-create modules — never general dashboard actions. This is explicitly sanctioned by the PROJECT.md key decisions ("Endpoint do link NÃO usa a sessão paga normal").
- **Ownership scoping:** every new table carries `profile_id`; all queries filter by it. The token resolves to exactly one `profile_id`.
- **Slot & aggregation logic** lives in pure `modules/` functions (no `next/cache`, no `next/headers`) so it's unit-testable with `tsx --test`, matching the existing testing convention.
- **Precedent to copy:** `modules/phone-link-codes/create-link-code.ts` is the closest existing pattern for the token flow (random secret + expiry + external validator).

## Sources

- Verified installed deps — `/Users/goker1/falaped/package.json` (recharts 3.9.0, date-fns ^4.1.0, zod ^4.3.6, react-day-picker ^9.4.4, @dnd-kit, no jwt/nanoid/uuid) — HIGH
- Existing token precedent — `modules/phone-link-codes/create-link-code.ts` (native `crypto.getRandomValues` + `expires_at`) — HIGH
- Existing recharts usage — `components/dashboard/patients/growth/growth-chart.tsx` — HIGH
- `.planning/codebase/{STACK,ARCHITECTURE,INTEGRATIONS}.md` + `CLAUDE.md` (three-layer, paid gate, Supabase scoping, Yarn-only) — HIGH
- `.planning/PROJECT.md` v1.1 key decisions (token link not paid-gated; pending-confirm; earnings as separate ledger) — HIGH
- date-fns v4 timezone / `@date-fns/tz` (TZDate) vs date-fns-tz — https://blog.date-fns.org/v40-with-time-zone-support/ , https://www.npmjs.com/package/@date-fns/tz — HIGH
- Next.js 16 Route Handlers, dynamic segments, Node vs Edge runtime, middleware-as-first-line-of-defense — https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes , https://strapi.io/blog/nextjs-16-route-handlers-explained-3-advanced-usecases — HIGH
- Appointment UTC storage + explicit timezone best practice — https://learn.microsoft.com/en-us/answers/questions/1194364/what-is-the-best-way-to-store-an-appointment-time — MEDIUM
- shadcn calendar/scheduler landscape (copy-in blocks, not deps) — https://github.com/Mina-Massoud/mina-scheduler , https://shadcn-event-calendar.vercel.app/ — MEDIUM

---
*Stack research for: appointment scheduling + earnings ledger on an existing Next.js 16 / Supabase pediatric app*
*Researched: 2026-07-20*
