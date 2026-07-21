# Pitfalls Research

**Domain:** Appointment scheduling + token-authenticated external booking link + financial ledger, added to a no-RLS, `profile_id`-scoped, paid-gated multi-tenant pediatric web app (Falaped v1.1 "Agenda & Ganhos")
**Researched:** 2026-07-20
**Confidence:** HIGH (grounded in this codebase's actual security posture — proxy matcher, absent RLS, IDOR precedent, `phone_link_codes` token precedent — plus verified DB techniques for overlap-prevention and money storage)

> **How to read this file.** The two highest-blast-radius families are **token-link security** (Pitfalls 1–7) and **double-booking / slot correctness** (Pitfalls 8–12). Financial precision is Pitfalls 13–16. The cross-cutting no-RLS reality (Pitfalls 17–19) applies to *every* new action and table in this milestone. Each pitfall names the owning phase so requirements/success-criteria can absorb it.

---

## Critical Pitfalls

### Pitfall 1: Token stored raw in the database (steal-the-DB = steal-every-doctor's-agenda)

**What goes wrong:**
The assistant link token is stored as a plaintext column. A read-only leak of that one table (backup, log, SQL error surfacing a row, a future IDOR on the tokens table itself) hands an attacker working links into every doctor's agenda + patient base. Note the existing precedent — `phone_link_codes` stores the code **raw** (`modules/phone-link-codes/create-link-code.ts` inserts `code` in plaintext) — so the path of least resistance is to copy that pattern. It is acceptable for a 5-minute, single-use, 6-digit code; it is **not** acceptable for a long-lived agenda link.

**Why it happens:**
Copying the `phone_link_codes` precedent without re-evaluating threat model for a long-lived, high-privilege token; "it's already random, why hash it."

**How to avoid:**
Store only a **hash** of the token (SHA-256 is sufficient for a high-entropy random secret — no per-token salt/bcrypt needed because the input is not a low-entropy password). Generate the token with `crypto.getRandomValues` / `crypto.randomBytes` (≥ 32 bytes → base64url), show the full token to the doctor exactly once, persist `token_hash`. On each request, hash the incoming token and look up by hash. The DB never holds a usable credential.

**Warning signs:**
A `token` / `link_token` text column that appears in `SELECT *` results readable in plaintext; the token visible in a DB admin panel; code that compares `row.token === incoming`.

**Phase to address:**
Phase that builds the token/link data model (assistant-link foundation) — before any external route exists.

---

### Pitfall 2: Low-entropy or guessable/enumerable token

**What goes wrong:**
Token is a sequential id, a UUIDv1 (time-ordered), a short code, or a `profile_id`-derived value. Because this is the app's **first unauthenticated surface**, a guessable token = anyone on the internet enumerating agendas and the pediatric patient base (LGPD minors). The `phone_link_codes` generator emits only **6 decimal digits** (~10^6 space) — fine for a 5-minute code, catastrophic for a durable link.

**Why it happens:**
Reusing the 6-digit generator; using `gen_random_uuid()` and assuming "UUID = unguessable" (v4 is fine; but if someone reaches for a sequence or short slug it is not).

**How to avoid:**
≥ 256 bits of CSPRNG entropy encoded base64url. Do not derive the token from `profile_id`, email, or a counter. Treat the token as the *entire* secret — no "link id + token" where the id is guessable and leaks existence.

**Warning signs:**
Token length < 20 chars; token contains readable segments; incrementing one character yields another valid link.

**Phase to address:**
Assistant-link foundation phase (same as Pitfall 1).

---

### Pitfall 3: No expiration and no revocation path

**What goes wrong:**
The link works forever. When the doctor changes assistants, or a link leaks (WhatsApp forward, shared screenshot), there is no way to kill it. Because it grants access to the children's patient base, a stale link is an open LGPD exposure with no off-switch.

**Why it happens:**
"It's just for my assistant"; revocation UI is extra work and gets cut from MVP.

**How to avoid:**
Model the token row with `revoked_at` (nullable) and optionally `expires_at`. The verification query must filter `revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())`. Ship a doctor-facing "revoke / regenerate link" control in the SAME phase as the link — regeneration issues a new token and invalidates the old row. Do not defer revocation to "later."

**Warning signs:**
No `revoked_at`/`expires_at` columns; no UI to rotate the link; verification is a bare equality lookup.

**Phase to address:**
Assistant-link foundation phase — revocation is table-stakes, not a follow-up.

---

### Pitfall 4: Token route not correctly exempted from middleware (either still redirected, OR the exemption opens a hole)

**What goes wrong:**
Two symmetric failures. (a) The token route inherits `proxy.ts` → `updateSession`, which for any unauthenticated request calls `supabase.auth.signOut()` and **redirects to `/auth/login`** (see `lib/supabase/proxy.ts` lines 77–94) — so the assistant link never loads. (b) Over-correcting: the developer broadens the matcher exemption or adds a permissive `pathname.startsWith(...)` bypass that accidentally exempts *other* protected paths, punching a hole in the auth wall for the whole dashboard.

**Why it happens:**
The current matcher (`proxy.ts`) intercepts everything except static assets; the unauth branch is aggressive (signs out + redirects). Fixing (a) by loosening the matcher is easy to get too wide.

**How to avoid:**
Add a **narrow, exact** exemption for the token path only. Prefer checking the specific prefix inside `updateSession` (e.g. an early `if (pathname.startsWith("/agenda/link/")) return supabaseResponse;` guard placed **before** the sign-out/redirect branch) rather than widening the regex matcher. The token route must do its **own** token verification — never rely on the middleware for its auth. Add a test asserting (i) `/agenda/link/...` is not redirected and (ii) a random `/dashboard/*` path still redirects unauthenticated.

**Warning signs:**
Assistant link 302-redirects to login; matcher regex grew a broad negative lookahead; any dashboard route becomes reachable logged-out.

**Phase to address:**
Assistant-link external-route phase (the phase that first serves the token URL).

---

### Pitfall 5: Token scope creep — the link grants more than the agenda

**What goes wrong:**
The token endpoint reuses existing patient/case modules or actions that were written for the authenticated doctor, and thereby exposes prontuário, documents, growth curves, vaccines, or the AI assistant. The milestone explicitly forbids this ("nunca prontuário ou resto do app"). Because there is **no RLS**, nothing at the DB layer stops an over-broad query — the scope boundary lives entirely in which code paths the token route calls.

**Why it happens:**
Convenience reuse of `getAuthenticatedUser`-style flows; importing a general `getPatientById` that returns the full clinical record; a single shared action that "does everything."

**How to avoid:**
Build a **dedicated, minimal action surface** for the token context: only `searchPatientsForBooking` (returns name/DOB/id — nothing clinical), `createPatientForBooking` (minimal demographic fields), `listAvailability`, and `createPendingAppointment`. These take the resolved `profile_id` **from the token row**, never from a user session. Do not route token traffic through `getAuthenticatedUser` or any paid-gated action. Return DTOs with an explicit allowlist of fields (never `SELECT *` / the full patient row).

**Warning signs:**
Token route imports a module used by the doctor dashboard; a booking response includes clinical fields (IMC, case notes, photos); the token path can reach anything under `/dashboard`.

**Phase to address:**
Assistant booking-actions phase.

---

### Pitfall 6: Patient-base leak via the search feature (enumeration + over-broad results)

**What goes wrong:**
The assistant search returns too much (clinical data, all patients, or fuzzy matches across tenants) or has no rate limit, letting whoever holds the link scrape the doctor's entire roster of children. Even scoped to one `profile_id`, an unbounded/wildcard search that dumps the full list on empty input exposes the whole minor patient base in one call.

**Why it happens:**
Search is written like the internal dashboard search (returns everything the doctor can see); empty query returns all rows; results include DOB + clinical hints "to help the assistant pick."

**How to avoid:**
Require a minimum query length (e.g. ≥ 3 chars) before returning anything; cap result count (e.g. 10); scope every query by the token's `profile_id`; return the **minimum** identifying fields (name + partial DOB) needed to disambiguate, nothing clinical. Log/limit search volume per token. Consider that the assistant only needs to find an *existing* child to attach a booking — it does not need the medical record.

**Warning signs:**
Empty search returns rows; results carry clinical fields; no result cap; same query repeatable thousands of times with no throttle.

**Phase to address:**
Assistant booking-actions phase (with rate-limiting from Pitfall 7).

---

### Pitfall 7: No CSRF / rate-limiting / abuse controls on the session-less route

**What goes wrong:**
Because this route does **not** use the cookie session, the app's implicit same-site cookie protections don't apply, and there's no per-user throttle. An attacker with (or brute-forcing toward) the link can hammer patient creation, spam pending appointments (DoS the doctor's confirmation queue), or attempt token guessing at high rate. There is **no rate-limiting infra today** (no Redis; per INTEGRATIONS.md) and **no error tracking**, so abuse is invisible.

**Why it happens:**
Rate limiting feels like scale-work and gets deferred; the team assumes "middleware handles auth" and forgets this route bypasses it.

**How to avoid:**
(a) Token verification itself is the CSRF defense — mutations require the secret token in the request, which a cross-site attacker cannot supply; ensure the token is required on **every** mutating call, not just page load. (b) Add coarse rate-limiting keyed by token (and by IP for token-verification failures) — even a simple DB-backed counter or a lightweight limiter is enough at this scale; the goal is to make token-guessing and appointment-spam impractical. (c) Constant-time compare on the token hash lookup. (d) Cap pending appointments per token per hour.

**Warning signs:**
Unlimited failed-token attempts accepted; a script can create 1000 pending appointments; no counter/limit anywhere on the token path.

**Phase to address:**
Assistant external-route / booking-actions phase.

---

### Pitfall 8: Double-booking via race condition on concurrent slot reservation

**What goes wrong:**
Two requests (assistant + doctor, or two assistant tabs) check "is this slot free?" then both insert — a classic check-then-act TOCTOU. Application-level "SELECT then INSERT" **cannot** prevent this under concurrency; both see the slot free and both write. Result: two children booked into the same time.

**Why it happens:**
The natural implementation is `getSlot() → if free → insert`. It passes every single-user test and fails only under concurrency, so it ships looking done.

**How to avoid:**
Enforce non-overlap **at the database level**, not in app code. Use a Postgres exclusion constraint over a time range:
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE appointments ADD CONSTRAINT no_overlap
  EXCLUDE USING gist (
    profile_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (status = 'confirmed');
```
This makes Postgres atomically reject the second overlapping insert. Decide deliberately whether **pending** ("pedido a confirmar") requests also block the slot: since the milestone models bookings as pending-then-confirmed, either (a) only `confirmed` participates in the constraint (pending requests can overlap, doctor resolves conflicts at confirm time — simpler, matches "pedido a confirmar" semantics), or (b) include pending too (no double *requests*). Pick one explicitly and encode it in the `WHERE`. Catch the unique/exclusion violation in the action and return a friendly "horário já ocupado" result union.

**Warning signs:**
Booking logic is `select ... then insert ...` with no DB constraint; no `btree_gist`/EXCLUDE in migrations; the only test is single-user.

**Phase to address:**
Availability & appointments data-model phase — the constraint is part of the schema, not the UI.

---

### Pitfall 9: Timezone/DST bugs in recurring availability

**What goes wrong:**
Recurring rules ("seg/qua 14h–18h") are stored or computed in UTC or in the server's timezone. When Brazil's local time or any DST-style shift is involved, a "14:00" recurring slot drifts to 13:00 or 15:00, or a slot appears/disappears on transition days. Even without current Brazilian DST, storing wall-clock intent as a UTC instant and regenerating slots re-introduces the bug the moment the server TZ ≠ the doctor's TZ (Vercel runs UTC).

**Why it happens:**
`new Date()` / `toISOString()` on the server (UTC) is treated as local; recurrence expanded by adding 7×24h in ms (which is wrong across any offset change); mixing "wall clock" (14:00 every Wednesday) with "instant" (a specific UTC timestamp).

**How to avoid:**
Store the recurring **rule** as wall-clock intent (day-of-week + local start/end time) plus an explicit IANA timezone (e.g. `America/Sao_Paulo`), **not** as pre-materialized UTC instants. Convert to concrete instants only when generating slots for a specific date, using a timezone-aware conversion — never by adding fixed millisecond offsets. `date-fns` (already a dependency, v4 with `@date-fns/tz`) or storing everything in the doctor's local zone consistently. Concrete `appointments` rows store real `timestamptz` instants; the *recurrence template* stores wall-clock + zone.

**Warning signs:**
Slots shift by an hour for some users; a recurring rule stored as an array of UTC timestamps; slot generation uses `+ n*86400000`; times computed with server-local `Date` and no zone.

**Phase to address:**
Availability (recurring grid) phase.

---

### Pitfall 10: Off-by-one on week/month boundaries and slot generation from recurrence

**What goes wrong:**
The day/week/month views double-count or drop the boundary slot: the last slot of the day, the Sunday-vs-Monday week start, the appointment exactly at midnight or at the month edge. Inclusive-vs-exclusive end handling means a 14:00–15:00 slot and a 15:00–16:00 slot either collide or leave a gap; a week view built with `< endOfWeek` vs `<= endOfWeek` shows 6 or 8 days.

**Why it happens:**
Half-open interval discipline isn't applied consistently ([start, end) everywhere); week-start locale (BR often Monday) not pinned; boundary instants assigned to two adjacent buckets.

**How to avoid:**
Adopt **half-open intervals `[start, end)`** everywhere — a slot owns its start instant, not its end; this also aligns with the `tstzrange` `&&` semantics from Pitfall 8. Pin an explicit `weekStartsOn` (Monday for BR) in every `date-fns` range call. Generate slots from the recurrence with a single tested function and unit-test it against boundary cases: first/last slot of day, DST-ish transition, month-end, week wrap. This is exactly the kind of pure function the codebase already tests in `modules/` — add specs.

**Warning signs:**
A slot shows in two views; week view has 6 or 8 columns; overlapping/gapped adjacent slots; no boundary unit tests.

**Phase to address:**
Availability + agenda-views phase.

---

### Pitfall 11: Materializing recurrence into rows (and drift when the rule changes)

**What goes wrong:**
Availability is expanded into thousands of concrete slot rows up front. Then the doctor edits the weekly grid and past/future materialized rows are now inconsistent with the rule; deleting a day of availability doesn't cascade; the table grows unbounded.

**Why it happens:**
"Slots as rows" is easier to query for the calendar; materializing feels concrete.

**How to avoid:**
Keep availability as a compact **recurrence rule** and compute free slots on the fly for the requested date range (day/week/month window is small). Persist a concrete row **only** when an actual appointment is booked. This keeps the rule as the single source of truth and avoids drift. If performance ever demands materialization, materialize a bounded forward window and regenerate on rule change — but at this scale (one doctor's agenda) on-the-fly generation is correct.

**Warning signs:**
An `availability_slots` table with row-per-slot; editing the grid leaves stale slots; unbounded row growth.

**Phase to address:**
Availability (recurring grid) phase.

---

### Pitfall 12: Confirmation flow doesn't atomically claim the slot ("pedido a confirmar" → double confirm)

**What goes wrong:**
Two pending requests exist for the same time (allowed, per Pitfall 8 option a). The doctor confirms one; the second confirm should now fail — but if confirm is a plain `UPDATE status='confirmed'` with no re-check, both become confirmed and the slot is double-booked at the moment it matters most.

**Why it happens:**
The exclusion constraint (if scoped `WHERE status='confirmed'`) is the backstop, but a poorly written confirm path can still surprise the user with a raw DB error instead of a graceful message; or the constraint was scoped to include pending and now legitimate double-*requests* are blocked.

**How to avoid:**
Make **confirmation** the step that must pass the `confirmed`-only exclusion constraint (Pitfall 8). On confirm, attempt the state transition inside a transaction; if the exclusion constraint rejects it, catch it and return `{ ok: false, error: "Esse horário já foi confirmado para outro paciente." }`. Never let a raw Postgres constraint error reach the client (matches the project rule: actions convert throws to result unions).

**Warning signs:**
Confirm is a bare `UPDATE` with no conflict handling; a raw `23P01`/exclusion error surfaces to the UI; two confirmed appointments share a time.

**Phase to address:**
Appointments / confirmation-flow phase.

---

### Pitfall 13: Money stored as float (or as reais that permit rounding drift)

**What goes wrong:**
Consultation values stored as `float`/`double precision` (or as JS `number` reais) accumulate binary-rounding error. Sums over a month, and especially the "valor médio por consulta" average, produce off-by-a-cent totals that a doctor tracking income will notice and distrust.

**Why it happens:**
`number` is the default JS type; `float8` is the default "decimal" reach in Postgres; it looks fine for a single value and only drifts on aggregation.

**How to avoid:**
Store money as **integer cents** (`bigint` cents) OR as `NUMERIC(12,2)` — never `float`/`double`. Integer cents is the recommended default for a single-currency (BRL) app: exact, compact, no rounding surprises; convert to reais only at display. If cents, do all arithmetic in cents and format for the UI (`R$ ${(cents/100).toLocaleString('pt-BR', ...)}`). Add a `CHECK (amount_cents >= 0)` if negatives are disallowed. Confirmed by PostgreSQL docs and Crunchy Data guidance: floats are unsuitable for money; avoid the `money` type too (locale/precision footguns).

**Warning signs:**
Column type `float`/`double precision`/`real` on an amount; JS math on reais with decimals; totals ending in `.9999`/`.0001`; `money` type used.

**Phase to address:**
Earnings ledger data-model phase.

---

### Pitfall 14: Rounding in averages / aggregation across timezones

**What goes wrong:**
"Valor médio por consulta" divides total by count and rounds each row then sums (double-rounding), or rounds too early. Separately, day/week/month totals bucket entries by a timestamp interpreted in UTC while the doctor thinks in local time — an 22:00 BRT consultation lands in the *next* UTC day, so daily/weekly totals shift entries into the wrong bucket (same TZ family as Pitfall 9).

**Why it happens:**
Rounding per-row for display then reusing those rounded values in aggregates; grouping by `date_trunc('day', created_at)` where `created_at` is UTC; server-local date math on Vercel (UTC).

**How to avoid:**
Aggregate on **exact stored values** (cents), round **once** at the very end for display. Compute the average as `sum(cents) / count` in integer/decimal space, round only the displayed result. For time bucketing, group by the **doctor's local date**: either store an explicit local-date column for the ledger entry, or bucket with `date_trunc('day', ts AT TIME ZONE 'America/Sao_Paulo')`. Decide and document the timezone the earnings panel reports in.

**Warning signs:**
Averages don't reconcile with `total/count`; a late-evening entry appears on the wrong day's total; `date_trunc` on a raw UTC `timestamptz` with no `AT TIME ZONE`.

**Phase to address:**
Earnings panel (totals + average) phase.

---

### Pitfall 15: Test/void/cancelled entries silently mixed into totals

**What goes wrong:**
An entry created by mistake, a voided/refunded value, or a cancelled-appointment charge stays in the sum. The doctor's "ganhos" number is inflated and untrustworthy, or deleting an entry hard-removes audit history.

**Why it happens:**
No status/soft-delete on ledger entries; "just delete it" or "just edit the amount" mutates history; totals `SUM(amount)` over all rows.

**How to avoid:**
Give ledger entries a status (`active` / `void`) or a `voided_at`; totals and averages filter to active entries only (`WHERE voided_at IS NULL`). Prefer voiding over hard-deleting so history is auditable. Since earnings may or may not be tied to an appointment (per the milestone decision), ensure a cancelled appointment does **not** auto-drop its money entry without an explicit void — money received is money received.

**Warning signs:**
`SUM(amount)` with no status filter; entries hard-deleted; cancelling an appointment changes historical totals unexpectedly.

**Phase to address:**
Earnings ledger data-model + panel phases.

---

### Pitfall 16: Ledger entries not scoped by `profile_id` (money IDOR / cross-tenant totals)

**What goes wrong:**
A new `earnings`/`ledger` table is created and its read/write/delete actions forget the `profile_id` filter — the exact failure already present in this codebase (`deletePrescription`/`deleteMedicalCertificate` delete by `id` only; see CONCERNS.md IDOR finding). One doctor sees or edits another's income; totals leak across tenants. With **no RLS**, a missing filter is directly exploitable.

**Why it happens:**
Copying an existing module that has the bug; assuming a doc-comment "RLS ensures ownership" that is false here.

**How to avoid:**
Every ledger query — SELECT, INSERT (`profile_id` set), UPDATE, DELETE/void, and every aggregate — includes `.eq("profile_id", profileId)` with `profile.id` threaded from the action. Aggregates especially: `SUM`/`AVG`/`GROUP BY` must be inside a `profile_id`-scoped query. Add an ownership unit test for the delete/void path (the IDOR bug "would have been caught by a single ownership test" — CONCERNS.md).

**Warning signs:**
A ledger delete/update by `id` only; an aggregate query with no `profile_id` predicate; no ownership test.

**Phase to address:**
Earnings ledger data-model phase (and enforced in every earnings action).

---

### Pitfall 17: New scheduling/booking actions omit `profile_id` scoping (the systemic no-RLS trap)

**What goes wrong:**
This is the milestone-wide version of Pitfall 16, applied to appointments and availability. Because there is **no table-level RLS** (CONCERNS.md: "All data isolation... depends entirely on the application layer adding `profile_id`/`user_phone` filters to every query"), *any* new appointment/availability read, write, update, or delete that misses the filter leaks or corrupts another doctor's agenda. The token route makes this worse: it resolves `profile_id` from the token, so a bug there scopes to the wrong tenant entirely.

**Why it happens:**
New domain, many new modules written quickly; the filter is easy to forget on one of them; the token path introduces a *second* way to obtain `profile_id` (from the token, not the session), doubling the surface.

**How to avoid:**
Treat `profile_id` scoping as a non-negotiable requirement on **every** new module in this milestone. In the token context, derive `profile_id` **only** from the verified token row and pass it explicitly into modules — never trust any `profile_id` sent in the request body. Add ownership specs for appointment/availability read+write+delete (CONCERNS.md flags these modules as "the sole line of defense" while RLS is absent). Strongly consider this milestone as the trigger to finally **enable RLS** on the new tables (appointments, availability, ledger, tokens) as defense-in-depth — a new domain with an external surface is the highest-value place to start.

**Warning signs:**
An appointment/availability query without `.eq("profile_id", ...)`; `profile_id` read from request input on the token route; new tables created without RLS while carrying LGPD minor data.

**Phase to address:**
Every phase in the milestone; verified in the availability, appointments, and token phases. Consider a dedicated "RLS on new tables" hardening step.

---

### Pitfall 18: New actions skip the paid gate — but the token route must *not* use it (two opposite mistakes)

**What goes wrong:**
Symmetric failure. (a) A new **doctor-facing** action (create availability, add earnings entry) forgets `getAuthenticatedUser` + `profile.status === "paid"`, so a non-paying account uses paid features (violates the security convention: "Every action... gates on `profile.status === 'paid'`"). (b) The **token** route wrongly reuses the paid-gated auth flow (or `getAuthenticatedUser`), which either breaks (no session) or accidentally couples the assistant link to the doctor's subscription session — the milestone explicitly requires the token endpoint to NOT inherit the paid session.

**Why it happens:**
Copy-paste of the standard action header includes the paid gate (good for doctor actions, wrong for token); or a rushed token action skips auth entirely.

**How to avoid:**
Doctor-facing new actions: keep the standard `getAuthenticatedUser` + paid gate. Token route: its own verification (hash lookup + not-revoked/expired) that yields a `profile_id`, with **no** session and **no** paid check — but still restricted to the minimal booking action surface (Pitfall 5). Make the two auth models explicit and separate in code so neither leaks into the other. Optionally verify the linked doctor is still `paid` when serving the link (a lapsed doctor's assistant link should probably stop working) — decide this deliberately.

**Warning signs:**
A new doctor action without the paid gate; the token route importing `getAuthenticatedUser`; the token route reachable only with a doctor session.

**Phase to address:**
Every action phase; especially the assistant-link route phase for the token half.

---

### Pitfall 19: Service-role/admin client reused on the new session-less paths

**What goes wrong:**
To "make the token route work without a session," a developer reaches for `createAdminClient()` (service-role, bypasses all RLS — CONCERNS.md warns it's already misused in bulk deletes). Now the app's first external, unauthenticated surface runs with god-mode DB access; any logic bug (missing `profile_id`, an injected id) operates with full privileges across all tenants.

**Why it happens:**
The admin client is the easy way to query without a user session; the pattern already exists in the repo (delete paths), so it's the obvious copy.

**How to avoid:**
Serve the token route with the **normal (anon/publishable) server client**, applying the token-derived `profile_id` filter in application code — exactly like the rest of the app. Reserve the service-role client strictly for genuine admin operations (`auth.admin.deleteUser`). Never use the admin client on a query lacking an explicit ownership filter (CONCERNS.md). If RLS is enabled on the new tables (Pitfall 17), a scoped anon client is safe by construction.

**Warning signs:**
`createAdminClient()` imported in any appointment/availability/ledger/token module; the token route using the service-role key.

**Phase to address:**
Assistant-link route phase; also revisit the existing bulk-delete admin misuse if touched.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| App-level "select-then-insert" instead of a DB exclusion constraint | Ships faster; no `btree_gist` | Double-bookings under concurrency (unfixable in app code); silent corruption | **Never** for slot booking — the constraint is cheap |
| Store the assistant token raw (copying `phone_link_codes`) | Reuses existing pattern | One DB read leaks every agenda + child patient base | **Never** for a long-lived link (fine only for the 5-min code) |
| Money as `float`/JS `number` reais | Zero conversion code | Cent drift on every aggregate; doctor distrusts totals | **Never** — use integer cents from day one |
| Materialize recurrence into slot rows | Simple calendar queries | Drift on rule edits; unbounded growth | Only with a bounded window + regen-on-change; not for MVP |
| Defer link revocation UI to "later" | Smaller MVP | Stale/leaked link with no off-switch = open LGPD exposure | **Never** — ship revoke with the link |
| Broaden the middleware matcher to expose the token route | One-line fix | Risk of exempting other protected paths | Only via a narrow exact-prefix guard, tested both ways |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase (no RLS) | Assuming doc-comment "RLS ensures ownership" (false here) | Explicit `.eq("profile_id", ...)` on every query; enable RLS on new tables |
| Supabase service-role client | Using it to bypass "no session" on the token route | Normal client + token-derived `profile_id`; admin client only for `auth.admin.*` |
| Next.js middleware (`proxy.ts`) | Token route redirected to `/auth/login`, or matcher loosened too far | Narrow exact-prefix exemption inside `updateSession`, before the sign-out branch; test both directions |
| Vercel runtime (UTC) | Server-local `Date` math for recurrence/earnings buckets | Store wall-clock+IANA zone for rules; `AT TIME ZONE 'America/Sao_Paulo'` for buckets |
| Postgres `timestamptz` + ranges | Inclusive-end ranges collide/gap | Half-open `[start, end)` + `tstzrange` `&&` exclusion constraint |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| On-the-fly slot generation over a huge date window | Slow month view | Generate only the visible window (day/week/month); cache within request | Only if querying years at once — not at single-doctor scale |
| Unbounded token-search / no result cap | Slow search, full-roster dump | Min query length + result cap + `profile_id` scope | Immediately (also a security issue — Pitfall 6) |
| Per-row aggregation of earnings in app code | Slow panel as entries grow | `SUM`/`AVG` in a single scoped SQL query | Thousands of entries |
| No index on `appointments(profile_id, starts_at)` | Slow agenda queries | Composite index; `btree_gist` index backs the exclusion constraint | Hundreds of appointments |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Raw token storage | DB read → every doctor's agenda + child roster compromised | Store SHA-256 hash of a ≥256-bit CSPRNG token; show once |
| Guessable/enumerable token | Internet-wide enumeration of pediatric patient base (LGPD) | High-entropy random token; no id-derived/sequential tokens |
| No revocation/expiry | Leaked link works forever | `revoked_at`/`expires_at` + doctor rotate-link UI |
| Token scope creep | Assistant link exposes prontuário/documents/AI | Dedicated minimal action surface; allowlisted DTO fields; no clinical data |
| Search leaks roster | Full list of minors scraped via link | Min query length, result cap, non-clinical fields, rate limit |
| No rate limit on session-less route | Token brute-force, appointment/patient spam | Per-token + per-IP throttle; constant-time hash compare; cap pending/hour |
| Missing `profile_id` on new tables | Cross-tenant agenda/money IDOR (no RLS backstop) | `.eq("profile_id",...)` everywhere + enable RLS on new tables |
| Admin client on token route | God-mode DB access on first external surface | Normal client + token-derived scoping only |
| Minors' data over an external link (LGPD) | Sensitive minor data exposed beyond the doctor | All of the above, plus minimize fields the link ever returns |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Raw Postgres constraint error on double-book | Confusing failure at confirm time | Catch exclusion violation → friendly "horário já ocupado" result union |
| Slot shows in two calendar views | Doctor distrusts the agenda | Half-open intervals + single tested slot generator |
| Earnings total shifts an entry to wrong day | Doctor thinks money is missing | Bucket by local date (`AT TIME ZONE`), document the reporting zone |
| Deleting a mistaken earnings entry loses history | No audit trail | Void (soft) instead of hard delete; totals filter voided |
| Assistant can't tell if a slot is pending vs confirmed | Double requests, unclear queue | Distinct visual states for pending "pedido a confirmar" vs confirmed |

## "Looks Done But Isn't" Checklist

- [ ] **Slot booking:** Often missing the DB exclusion constraint — verify two concurrent bookings for the same time: exactly one succeeds.
- [ ] **Recurring availability:** Often missing timezone correctness — verify a 14:00 rule renders 14:00 on a UTC-server deploy (Vercel), and boundary slots (first/last of day, week wrap, month end) aren't doubled/dropped.
- [ ] **Assistant token:** Often missing hash-at-rest + revocation — verify the DB stores no usable token and that revoking kills the link immediately.
- [ ] **Token route:** Often missing correct middleware exemption — verify the link loads logged-out AND a random `/dashboard/*` path still redirects to login.
- [ ] **Token scope:** Often missing scope enforcement — verify the link cannot reach prontuário, documents, growth curve, vaccines, or AI; and search returns no clinical fields.
- [ ] **Token search:** Often missing rate limit + result cap — verify empty query returns nothing and volume is throttled.
- [ ] **Earnings money:** Often missing integer-cents storage — verify no float column and that month total + average reconcile to the cent.
- [ ] **Earnings totals:** Often missing void/status filter — verify a voided entry is excluded from totals and average.
- [ ] **Every new action:** Often missing `profile_id` scope and/or paid gate — verify each doctor action gates on paid and each query filters by owner; verify the token route does neither the paid gate nor session auth but still scopes by token-derived `profile_id`.
- [ ] **New tables:** Often missing RLS — verify whether RLS was enabled on appointments/availability/ledger/token tables (defense-in-depth for LGPD minor data).

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Double-booking already in prod | MEDIUM | Add `btree_gist` exclusion constraint; identify & manually resolve existing overlaps (constraint creation fails until conflicts cleared) |
| Token stored raw | MEDIUM | Migrate to hashed storage; force-regenerate all existing links (invalidate old raw tokens) |
| Leaked/over-broad link discovered | LOW (if revocation exists) / HIGH (if not) | Revoke + regenerate token; if no revocation was built, emergency schema change + rotate — build revocation first |
| Money stored as float | MEDIUM | Add `amount_cents bigint`; backfill via careful conversion; switch reads/writes/aggregates; drop float column |
| Missing `profile_id` filter shipped | HIGH | Audit all new queries; add filters + ownership tests; enable RLS to prevent recurrence; assess whether cross-tenant exposure occurred |
| Timezone drift in agenda | MEDIUM | Re-model rules as wall-clock+zone; regenerate slots; reconcile any mis-bucketed earnings |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 8 Double-booking race | Availability/appointments data model | Concurrent-insert test: one wins |
| 9 Timezone/DST in recurrence | Availability (recurring grid) | 14:00 rule renders 14:00 on UTC deploy |
| 10 Week/month off-by-one | Availability + agenda views | Boundary unit tests pass; week has 7 days |
| 11 Recurrence materialization drift | Availability (recurring grid) | Editing grid updates all views; no stale rows |
| 12 Double-confirm | Appointments/confirmation flow | Second confirm returns friendly conflict |
| 1 Raw token | Assistant-link foundation | DB holds only hashes |
| 2 Weak token | Assistant-link foundation | Token ≥256-bit CSPRNG; not id-derived |
| 3 No revoke/expiry | Assistant-link foundation | Revoke kills link; expiry honored |
| 4 Middleware exemption | Assistant-link route | Link loads logged-out; dashboard still protected |
| 5 Scope creep | Assistant booking-actions | Link cannot reach clinical data/AI |
| 6 Search roster leak | Assistant booking-actions | Min-length, capped, non-clinical, throttled |
| 7 No CSRF/rate-limit | Assistant route/booking-actions | Token required per mutation; abuse throttled |
| 13 Float money | Earnings ledger data model | No float column; cents used |
| 14 Average/TZ aggregation | Earnings panel | Average reconciles; local-date buckets |
| 15 Test/void in totals | Earnings ledger + panel | Voided excluded from totals |
| 16 Ledger IDOR | Earnings ledger data model | Ownership test on delete/void |
| 17 Missing profile_id (systemic) | All phases (+ RLS hardening) | Ownership tests; RLS on new tables |
| 18 Paid gate vs token auth | All action phases | Doctor actions gated; token route session-less+scoped |
| 19 Admin-client misuse | Assistant-link route | No service-role on token/new paths |

## Sources

- PostgreSQL docs — Monetary/Numeric types (float unsuitable for money): https://www.postgresql.org/docs/current/datatype-money.html , https://www.postgresql.org/docs/current/datatype-numeric.html
- Crunchy Data — "Working with Money in Postgres" (integer cents vs numeric guidance): https://www.crunchydata.com/blog/working-with-money-in-postgres
- Exclusion constraints for overlap/double-booking (`btree_gist` + `tstzrange &&`, atomic at DB level; app-level check cannot prevent the race): https://www.jusdb.com/blog/postgresql-range-types-exclusion-constraints , https://jsupskills.dev/how-to-solve-the-double-booking-problem/ , https://boringsql.com/posts/beyond-start-end-columns/
- Falaped codebase intel (this repo): `.planning/codebase/CONCERNS.md` (no RLS; IDOR delete-by-id; service-role misuse; no error tracking), `.planning/codebase/INTEGRATIONS.md` (no Redis/rate-limit infra; Supabase client model)
- Falaped source: `lib/supabase/proxy.ts` + `proxy.ts` (middleware matcher + unauth sign-out/redirect branch), `modules/phone-link-codes/create-link-code.ts` (raw-code token precedent — 6-digit, 5-min, single-use)
- Falaped milestone decisions: `.planning/PROJECT.md` v1.1 (private token link, session-less endpoint, pending-then-confirm, separate financial ledger, LGPD minors constraint)

---
*Pitfalls research for: appointment scheduling + token-authenticated external booking + financial ledger on a no-RLS profile_id-scoped app*
*Researched: 2026-07-20*
