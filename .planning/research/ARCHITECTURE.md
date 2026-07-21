# Architecture Research

**Domain:** Appointment scheduling + earnings ledger + token-authenticated external surface, integrated into the existing Falaped three-layer Next.js/Supabase app
**Researched:** 2026-07-20
**Confidence:** HIGH (grounded in the actual codebase — migrations, modules, middleware, auth helper all read directly; no external assumptions about the stack)

> Scope note: this is a SUBSEQUENT-milestone integration study, not a greenfield survey. It answers "how does v1.1 (Agenda & Ganhos) fit the existing `app/ → actions/ → modules/` + Supabase architecture" and is explicit about **new vs modified** integration points and **build order**.

---

## Key Finding That Shapes Everything: RLS Is Now the Norm

The `.planning/codebase/CONCERNS.md` (dated 2026-06-04) says "no RLS on data tables." **That is stale.** Every migration written since — `20260604000004_rls_auxiliary.sql` (retrofit of the old tables), `20260710000100_rls_referrals.sql`, `20260710010100_rls_medical_reports.sql`, `..._rls_exam_requests.sql`, `20260720000100_rls_vaccine_schedules.sql` — enables RLS **in the same migration as the table** with the canonical ownership policy:

```sql
alter table public.<t> enable row level security;
create policy "<T> select own" on public.<t> for select to authenticated
using ( profile_id in (select id from public.profiles where auth_user_id = auth.uid()) );
-- + insert (with check), update (using + with check), delete (using) — same predicate
```

**Implication for v1.1:** new tables (`availability_rules`, `availability_exceptions`, `appointments`, `financial_entries`, `assistant_link_tokens`) MUST ship with RLS enabled + the four `authenticated`-role policies, keyed on `profile_id in (select id from profiles where auth_user_id = auth.uid())`. App-level `.eq("profile_id", …)` filters stay too (defense-in-depth) — but RLS is now the backstop the concerns doc wished for.

**The pivotal consequence for the token surface:** the external assistant endpoint has **no `auth.uid()`** (no Supabase Auth session). The `authenticated`-role RLS policies above will therefore deny it everything. So the token surface CANNOT use the normal per-request cookie client. It must use the **service-role admin client** (which bypasses RLS) and re-impose isolation at the application layer by (a) resolving the token → exactly one `profile_id`, and (b) hard-filtering every query and stamping every insert with that resolved `profile_id`. This is the single most important design decision in the milestone and drives the build order.

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│  PRESENTATION (app/, components/)                                          │
│  ┌───────────────────────────┐    ┌──────────────────────────────────┐   │
│  │ DOCTOR (authenticated)    │    │ ASSISTANT (token, NO session)    │   │
│  │ app/dashboard/agenda/*    │    │ app/agenda-link/[token]/*        │   │
│  │ app/dashboard/ganhos/*    │    │  (public route, middleware-exempt)│   │
│  │ calendar day/week/month   │    │  patient search/create + booking │   │
│  └────────────┬──────────────┘    └───────────────┬──────────────────┘   │
├───────────────┼──────────────────────────────────┼──────────────────────┤
│  ACTION LAYER (actions/, app/api/…/route.ts)      │                       │
│  ┌────────────▼──────────────┐    ┌───────────────▼──────────────────┐   │
│  │ "use server" actions       │    │ POST app/api/agenda-link/route.ts│   │
│  │ getAuthenticatedUser →     │    │ verifyLinkToken(token) → profileId│   │
│  │ paid gate → zod → modules  │    │ zod → modules (with resolved     │   │
│  │ (cookie client, RLS on)    │    │ profileId, ADMIN client)         │   │
│  └────────────┬──────────────┘    └───────────────┬──────────────────┘   │
├───────────────┼──────────────────────────────────┼──────────────────────┤
│  DOMAIN LAYER (modules/) — one fn/file, injected SupabaseClient           │
│  ┌────────────▼────────────────────────────────────▼──────────────────┐  │
│  │ availability/  appointments/  financial-entries/  assistant-links/  │  │
│  │  (every fn takes (supabase, profileId, …); throws "[DOMAIN] …")     │  │
│  └────────────────────────────────┬───────────────────────────────────┘  │
├───────────────────────────────────┼──────────────────────────────────────┤
│  DATA (Supabase Postgres, RLS-enabled)                                     │
│  availability_rules │ availability_exceptions │ appointments │            │
│  financial_entries  │ assistant_link_tokens   │ patients (existing)       │
└──────────────────────────────────────────────────────────────────────────┘
```

**Two auth doors, two client factories:**
- Doctor door → `lib/supabase/server.ts` cookie client → RLS resolves `auth.uid()`.
- Assistant door → `createAdminClient()` (service-role, bypasses RLS) → app code supplies the `profile_id` resolved from the token. **Never** hands the token or service key to the browser.

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| `app/dashboard/agenda/*` | Doctor calendar day/week/month; manage availability; confirm/cancel pending requests | Server components read via modules; client components for interactions; **new** |
| `app/dashboard/ganhos/*` | Earnings panel: totals by day/week/month, avg per consultation, entry CRUD | Server components + aggregation modules; **new** |
| `app/agenda-link/[token]/*` | Assistant surface: verify token, search/create patient, create pending appointment. NO prontuário, NO nav to rest of app | Server component verifies token server-side, renders a minimal shell; **new**, middleware-exempt |
| `app/api/agenda-link/route.ts` | External mutations (patient search/create, booking) authenticated by token, not session | Route handler; uses admin client + resolved `profileId`; **new** |
| `actions/availability`, `actions/appointments`, `actions/financial-entries`, `actions/assistant-links` | Doctor-side "use server" actions; standard auth+paid gate | **new** action domains + barrels |
| `modules/availability`, `modules/appointments`, `modules/financial-entries`, `modules/assistant-links` | Domain queries, one fn per file, injected client, `profile_id`-scoped | **new** module domains |
| `modules/assistant-links/verify-link-token.ts` | Hash incoming token → look up row → check active/not-expired/not-revoked → return `{ profileId, scope }` or throw | **new**, security-critical |
| `lib/supabase/proxy.ts` + `proxy.ts` | Session middleware; **modify** to exempt the `agenda-link` route from the auth redirect | **modified** |
| `patients` (table + modules) | Reused for appointment↔patient; `create-patient.ts` and `find-patient-by-profile-id-name-responsible.ts` already exist | **reused**, lightly extended |

---

## Recommended Project Structure

```
app/
├── dashboard/
│   ├── agenda/                      # NEW — doctor calendar + availability
│   │   ├── page.tsx                 # day/week/month calendar (server component)
│   │   ├── disponibilidade/page.tsx # weekly recurring grid + exceptions editor
│   │   └── link/page.tsx            # generate/revoke assistant link, show URL
│   └── ganhos/                      # NEW — earnings panel
│       └── page.tsx                 # period totals + avg/consult + entry list
├── agenda-link/                     # NEW — external, token-scoped, session-less
│   └── [token]/
│       └── page.tsx                 # verify token server-side → minimal booking UI
└── api/
    └── agenda-link/                 # NEW — token-authenticated mutations
        └── route.ts                 # POST { action: search|create-patient|book }

actions/
├── availability/{set-weekly-rules,add-exception,list-availability}.ts + index.ts   # NEW
├── appointments/{create,confirm,cancel,reschedule,list-range}.ts + index.ts         # NEW
├── financial-entries/{create,update,delete,list-period,period-summary}.ts + index.ts# NEW
└── assistant-links/{create-link,revoke-link,list-links}.ts + index.ts               # NEW (doctor-side)

modules/
├── availability/
│   ├── set-weekly-rules.ts          # upsert recurring rules for a profile
│   ├── add-exception.ts             # one-off block/extra-hours
│   ├── get-rules-by-profile-id.ts
│   ├── get-exceptions-in-range.ts
│   └── expand-slots.ts              # pure fn: rules + exceptions + range → free/busy (NO db)
├── appointments/
│   ├── create-appointment.ts        # takes profileId + (patientId | newPatientPayload)
│   ├── confirm-appointment.ts / cancel-appointment.ts / reschedule-appointment.ts
│   ├── get-appointments-in-range.ts # for calendar render, scoped by profile_id
│   ├── check-slot-conflict.ts       # overlap guard within a profile
│   └── types.ts
├── financial-entries/
│   ├── create-financial-entry.ts    # amount_cents, occurred_on, appointment_id?
│   ├── update/delete-financial-entry.ts
│   ├── get-entries-in-period.ts
│   └── summarize-period.ts          # totals + avg/consult (SQL aggregation)
└── assistant-links/
    ├── create-link-token.ts         # gen secret, store HASH only, return plaintext ONCE
    ├── verify-link-token.ts         # hash(input) → row → active check → { profileId, scope }
    ├── revoke-link-token.ts
    └── get-links-by-profile-id.ts
```

### Structure Rationale

- **`app/agenda-link/` sits OUTSIDE `app/dashboard/`** so it doesn't inherit the dashboard layout, nav, or any authenticated context. Physical separation makes the "no prontuário, no rest of app" constraint structural, not just conventional.
- **Assistant mutations go through a route handler, not a server action** (see Pattern 4). Server Actions in this app are all gated by `getAuthenticatedUser` + paid; the assistant has neither. A route handler gives an explicit, isolated auth path (token verify) that never touches the paid gate.
- **`expand-slots.ts` is a pure function** (no DB): rules + exceptions + a date range → concrete slots. Keeps calendar math unit-testable — important because the codebase's testing gap is exactly at the action/component layer, and availability math is where off-by-one/timezone bugs live.
- **`assistant-links/` split into doctor-side (create/revoke, in `actions/`) and verify (called only from the route handler)** mirrors the existing `phone-link-codes` precedent (`modules/phone-link-codes/create-link-code.ts`) but hardens it (hash-at-rest, revocation, scope).

---

## Data Model

All timestamps `timestamptz`; all money as **integer `amount_cents`** (never float). Every table: `id uuid default gen_random_uuid()`, `profile_id uuid not null references profiles(id) on delete cascade`, `created_at`/`updated_at` + the `set_updated_at_*` trigger pattern already used in `referrals`. **All get RLS in the same migration.**

### 1. Availability — recurring rules + exceptions (NOT materialized slots)

**Decision: store rules, not slots.** Materializing every 30-min slot into rows is an anti-pattern here (unbounded growth, hard to change hours retroactively, timezone drift). Store the *intent* (weekly rules + exceptions) and expand to concrete slots on read via the pure `expand-slots.ts`.

```
availability_rules
  id, profile_id
  weekday            smallint  not null      -- 0=Sun … 6=Sat
  start_minute       smallint  not null      -- minutes from midnight, local clinic tz
  end_minute         smallint  not null
  slot_minutes       smallint  not null default 30   -- consult granularity
  active             boolean   not null default true
  -- e.g. (weekday=1, 840, 1080) = Monday 14:00–18:00
  index (profile_id, weekday)

availability_exceptions
  id, profile_id
  exception_date     date      not null
  kind               text      not null      -- 'block' (day off) | 'extra' (added hours)
  start_minute       smallint  null           -- null when kind='block' & whole-day
  end_minute         smallint  null
  reason             text      null
  index (profile_id, exception_date)
```

Timezone: store a `clinic_timezone` (IANA, e.g. `America/Sao_Paulo`) on `profiles` (or default app-wide) and do all local↔UTC conversion in `expand-slots.ts`. Appointments store an absolute `timestamptz` so the calendar is unambiguous regardless of DST.

### 2. Appointments — status lifecycle + patient link (existing OR new)

```
appointments
  id, profile_id
  patient_id         uuid null references patients(id) on delete set null
  -- snapshot fields, populated by the assistant BEFORE a patient row is confirmed,
  -- and kept for display even if patient_id is later nulled:
  patient_name       text not null
  responsible_name   text null
  contact_phone      text null
  starts_at          timestamptz not null
  ends_at            timestamptz not null
  status             text not null default 'pending'
                     -- pending → confirmed → completed | cancelled | no_show
  source             text not null default 'doctor'   -- 'doctor' | 'assistant_link'
  created_by_token_id uuid null references assistant_link_tokens(id) on delete set null
  notes              text null
  index (profile_id, starts_at)
  index (profile_id, status)
```

**appointment ↔ patient (the "existing or new" reconciliation):**
- **Existing patient:** assistant searches (scoped to the token's `profile_id`), picks a match → `patient_id` set, snapshot fields copied from the patient row.
- **New patient:** assistant fills name/responsible/phone. Two viable shapes — recommend **(A)**:
  - **(A) Create the patient row immediately** (reusing `modules/patients/create-patient.ts` with the resolved `profileId`) and link `patient_id`. Pro: single source of truth, no reconciliation later, matches how the doctor already expects patients to exist. Con: assistant can create patient rows — acceptable because it's a trusted person and the row is minimal (name/responsible/phone only; NO clinical data — the token scope forbids prontuário fields). Guard against dupes with the existing `find-patient-by-profile-id-name-responsible.ts`.
  - (B) Defer: store only snapshot fields, leave `patient_id` null until the doctor confirms and "promotes" to a real patient. More moving parts; only choose if the doctor objects to the assistant writing to the patient list.
- The **snapshot fields are kept regardless** so a cancelled/deleted patient still renders correctly on the calendar (mirrors how `referrals.payload` snapshots `patientName`/`birthDate`).
- **Status is a `text` + `check` constraint**, not a Postgres enum — the codebase uses text status columns elsewhere (`profiles.status`, `phone_link_codes` semantics) and enums are painful to migrate.

### 3. Financial entries — ledger + period aggregation

```
financial_entries
  id, profile_id
  appointment_id     uuid null references appointments(id) on delete set null  -- link OR avulso
  amount_cents       integer not null            -- always cents, never float
  currency           text not null default 'BRL'
  occurred_on        date not null               -- the day it counts toward totals
  description        text null
  index (profile_id, occurred_on)
```

- **`appointment_id` nullable** = per the Key Decision "ligado ou não à consulta." Neither side is forced.
- **Aggregation in SQL, not JS:** `summarize-period.ts` runs `sum(amount_cents)` grouped by day/week/month via `date_trunc`, and **average per consultation** = `sum(amount_cents) / count(distinct appointment_id)` over entries that have an `appointment_id` in the period. Do this in one query per period bucket; don't pull rows and reduce in Node.

### 4. assistant_link_tokens — the security foundation

```
assistant_link_tokens
  id, profile_id
  token_hash         text not null unique       -- sha-256 of the secret; PLAINTEXT NEVER STORED
  label              text null                   -- "Recepção manhã"
  scope              text not null default 'agenda_booking'  -- future-proof; today one scope
  expires_at         timestamptz null            -- null = no expiry
  revoked_at         timestamptz null
  last_used_at       timestamptz null
  created_at
  index (token_hash)  where revoked_at is null
```

- **Store only the hash** (like a password). The plaintext token is shown to the doctor **once** at creation and embedded in the URL they copy. This improves on the existing `phone_link_codes` table, which stores the code in plaintext (acceptable there because it's a 6-digit, 5-minute, single-use code; a long-lived agenda link needs hash-at-rest).
- **Token format:** a long random secret (e.g. 32 bytes base64url via `crypto.getRandomValues`, same primitive as `create-link-code.ts`). URL: `/agenda-link/<plaintext-token>`.
- **Revocation + expiry are first-class columns** so the doctor can kill a leaked link instantly (`revoked_at = now()`), satisfying the Key Decision "auth própria por token (segredo, expiração, revogação)."
- **RLS:** `authenticated` policies scope by `profile_id` (doctor manages own links). The verify path does NOT use those policies — it runs under the admin client (service-role bypasses RLS) and looks up by `token_hash`.

---

## Architectural Patterns

### Pattern 1: Store rules, expand slots on read (availability)

**What:** Persist recurring `availability_rules` + sparse `availability_exceptions`; compute concrete free/busy slots at query time from (rules ∩ range) − exceptions − booked appointments.
**When:** Any recurring-schedule domain where hours change and horizons are open-ended.
**Trade-offs:** + tiny storage, retroactive edits trivial, no cron to materialize. − read-time computation (cheap for a single doctor's week/month) and careful timezone handling.

```typescript
// modules/availability/expand-slots.ts — PURE, no SupabaseClient, unit-tested
export function expandSlots(
  rules: AvailabilityRule[],
  exceptions: AvailabilityException[],
  range: { from: Date; to: Date },
  tz: string,
): Slot[] { /* rules → candidate slots in tz → subtract blocks / add extras */ }
```

### Pattern 2: Two client factories, one isolation invariant

**What:** Doctor paths use the cookie client (RLS via `auth.uid()`). The token path uses `createAdminClient()` and the app supplies the `profileId` resolved from the token.
**When:** Any session-less surface that must be scoped to one tenant.
**Trade-offs:** + lets the external endpoint work without a Supabase Auth user. − admin client bypasses RLS, so **every** token-path module call must receive and apply the resolved `profileId`; a single omission is a cross-tenant leak (this is exactly the IDOR class flagged in CONCERNS.md). Mitigate by: (a) never calling a token-path module without `profileId`, (b) stamping `profile_id` on every insert, (c) `.eq("profile_id", profileId)` on every select/update/delete, (d) unit tests asserting the filter.

```typescript
// app/api/agenda-link/route.ts (sketch)
export async function POST(req: Request) {
  const { token, action, payload } = await req.json();
  const admin = createAdminClient();
  const link = await verifyLinkToken(admin, token);   // throws if invalid/expired/revoked
  if (!link) return Response.json({ error: "Link inválido" }, { status: 401 });
  const { profileId, scope } = link;
  if (scope !== "agenda_booking") return Response.json({ error: "Escopo negado" }, { status: 403 });
  // EVERY module call below is passed profileId; nothing derives it from the request
  switch (action) {
    case "search-patient": return Response.json(await findPatientsForBooking(admin, profileId, payload.q));
    case "create-patient": return Response.json(await createPatient(admin, profileId, minimalPayload(payload)));
    case "book":           return Response.json(await createAppointment(admin, profileId, { ...payload, status: "pending", source: "assistant_link", created_by_token_id: link.id }));
    default: return Response.json({ error: "Ação inválida" }, { status: 400 });
  }
}
```

### Pattern 3: Middleware exemption for exactly one route prefix

**What:** The current `updateSession` redirects any non-`/auth`, non-home path to `/auth/login` when there's no user. The assistant has no user, so `/agenda-link/*` would be bounced to login. Exempt just that prefix.
**When:** Introducing the app's first session-less surface.
**Trade-offs:** + minimal, surgical. − must be tight (`startsWith("/agenda-link")`) so you don't accidentally open dashboard routes.

```typescript
// lib/supabase/proxy.ts — add near the isAuthRoute block
const isPublicTokenRoute =
  pathname.startsWith("/agenda-link") ||          // assistant UI (RSC)
  pathname.startsWith("/api/agenda-link");        // assistant mutations
// ...
if (!user && !isHomePage && !pathname.startsWith("/auth") && !isPublicTokenRoute) {
  // existing redirect-to-login
}
```

The route still self-authenticates by verifying the token server-side; the middleware exemption only stops the *redirect*, it does not grant access. **Do NOT rely on the `matcher` for this** — the exemption belongs in code so it's explicit and reviewable next to the redirect it bypasses.

### Pattern 4: Route handler (not Server Action) for external mutations

**What:** External booking mutations live in `app/api/agenda-link/route.ts`, not a `"use server"` action.
**When:** A caller that lacks the standard auth+paid session.
**Trade-offs:** Server Actions in this app *are* the auth+paid pattern (every one calls `getAuthenticatedUser` → paid gate). Bending one to accept a token instead would fork that contract and invite mistakes. A route handler is the codebase's existing escape hatch ("Route handlers only when a Server Action cannot serve the response type" — the response type here is "authenticated by token, not cookie"). It also matches how the app already treats external/webhook writers (service_role, per `rls_auxiliary.sql`).

### Pattern 5: Scope the token to data, not just routes

**What:** `verify-link-token` returns a `scope`; the route handler asserts `scope === "agenda_booking"` before any action, and the token modules only ever touch `patients` (search/create minimal) + `appointments` (create pending). They import **nothing** from `modules/cases`, `modules/prescriptions`, `modules/patient-*` clinical readers, etc.
**When:** Least-privilege for a delegated actor.
**Trade-offs:** + prontuário exposure is impossible by construction (the code path can't reach it). − requires discipline: the `agenda-link` module surface must be a deliberately small allow-list, reviewed as such.

---

## Data Flow

### Doctor sets availability + views calendar (standard path)

```
Doctor UI (app/dashboard/agenda/disponibilidade)
  → setWeeklyRulesAction  → getAuthenticatedUser → paid gate → zod
    → modules/availability/set-weekly-rules(cookieClient, profileId, rules)   [RLS enforces]
Calendar render (server component)
  → get-rules + get-exceptions-in-range + get-appointments-in-range(profileId, range)
  → expandSlots(rules, exceptions, range, tz)   [pure]  → free/busy grid
```

### Assistant books via token link (session-less path)

```
Assistant opens /agenda-link/<token>
  → middleware: isPublicTokenRoute → skip login redirect
  → RSC page: verifyLinkToken(admin, token) → profileId | 404/expired screen
  → renders minimal booking UI (search box + new-patient form + slot picker)
Assistant searches patient
  → POST /api/agenda-link { action:"search-patient", token, q }
  → verifyLinkToken → profileId → findPatientsForBooking(admin, profileId, q)   [app-scoped, NO clinical fields returned]
Assistant books
  → POST /api/agenda-link { action:"book", token, patientId|newPatient, startsAt }
  → verify → check-slot-conflict(profileId) → createAppointment(admin, profileId, {status:"pending", source:"assistant_link", created_by_token_id})
Doctor later
  → confirmAppointmentAction (authenticated) → status pending→confirmed
```

### Earnings panel

```
app/dashboard/ganhos (server component)
  → summarizePeriod(cookieClient, profileId, {period:"month", from, to})
    → SQL: sum(amount_cents) by date_trunc; avg = sum / count(distinct appointment_id)
  → create/update/delete entry via financial-entries actions (authenticated + paid)
```

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `actions/* ↔ modules/*` (doctor) | direct call, cookie client injected | Unchanged pattern; add auth+paid gate to every new action |
| `app/api/agenda-link ↔ modules/*` (assistant) | direct call, **admin client** injected + `profileId` from token | New boundary; the ONLY caller allowed to use admin client for these modules; must pass `profileId` every time |
| `appointments ↔ patients` | FK `patient_id` + snapshot columns | Reuses `create-patient` / `find-patient-by-profile-id-name-responsible`; assistant may create *minimal* patients only |
| `financial_entries ↔ appointments` | nullable FK `appointment_id` | Enables both linked and avulso entries; avg-per-consult joins on this |
| `proxy middleware ↔ agenda-link route` | pathname allow-list | Exemption stops redirect only; token verify is the real gate |

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Postgres | RLS-on for doctor paths; service-role for token path | New tables ship with RLS + 4 policies in the same migration (codebase norm) |
| Supabase Auth | Doctor only | Assistant surface deliberately has NO auth user |
| (none new) | — | No WhatsApp/email notifications this cycle (Out of Scope); no payment processor (Out of Scope) |

---

## Anti-Patterns

### Anti-Pattern 1: Materializing every slot as a row
**What people do:** Insert an `appointments`-shaped row for every free 30-min slot.
**Why wrong:** Unbounded growth, painful hour changes, timezone drift, hard to reason about "free vs booked."
**Instead:** Store rules + exceptions; expand on read (Pattern 1). Only *booked* appointments are rows.

### Anti-Pattern 2: Deriving `profile_id` from the request on the token path
**What people do:** Let the assistant POST a `profileId` (or read it from a query param) and trust it.
**Why wrong:** Cross-tenant write/read — the exact IDOR class already flagged in CONCERNS.md, now with the admin client (no RLS backstop).
**Instead:** `profileId` comes ONLY from `verifyLinkToken(hash)`. The request never supplies it.

### Anti-Pattern 3: Reusing the paid-gated server action for the assistant
**What people do:** Add a `token?` param to an existing action and branch the auth.
**Why wrong:** Forks the auth+paid contract that every action currently upholds; easy to leak the doctor's authenticated capabilities.
**Instead:** Separate route handler with its own token-only auth (Pattern 4).

### Anti-Pattern 4: Storing the link token in plaintext
**What people do:** Copy the `phone_link_codes` plaintext pattern for a long-lived link.
**Why wrong:** A long-lived, high-privilege secret at rest is a DB-dump liability.
**Instead:** Store `token_hash` (sha-256); show plaintext once; support `revoked_at`/`expires_at`.

### Anti-Pattern 5: Money as float / aggregating in JS
**What people do:** `numeric`/float `amount`, then `reduce` rows in Node for totals.
**Why wrong:** Rounding errors; N-row transfers for a dashboard number.
**Instead:** `integer amount_cents`; `sum()`/`date_trunc` in SQL.

### Anti-Pattern 6: Letting the assistant surface import clinical modules
**What people do:** Reuse a rich `get-patient-by-id` that returns allergies/history on the booking screen.
**Why wrong:** Leaks prontuário through the delegated link (LGPD violation, explicit Out-of-Scope).
**Instead:** A dedicated `findPatientsForBooking` that selects only `id, name, responsible, contact_phone`.

---

## Scaling Considerations

| Scale | Adjustments |
|-------|-------------|
| 1 doctor (today) | Read-time slot expansion trivial; single-week/month queries are tiny. No concern. |
| Many doctors | All queries already `profile_id`-indexed; add composite indexes `(profile_id, starts_at)` / `(profile_id, occurred_on)`. Fine on Postgres. |
| Heavy booking concurrency | Add a DB-level overlap guard (exclusion constraint on `(profile_id, tstzrange(starts_at, ends_at))` for non-cancelled) so two assistants can't double-book the same slot; the app-level `check-slot-conflict` is the first line, the constraint is the backstop. |

**First bottleneck:** double-booking under concurrent assistant use → solve with the exclusion constraint, not app locks.

---

## Build Order (phase decomposition) — security foundation FIRST

The dependency chain forces the token/isolation foundation before any assistant-facing UI. Suggested phases:

1. **Phase A — Availability model + doctor calendar (no external surface yet).**
   Tables `availability_rules`/`availability_exceptions` (+RLS), `modules/availability/*` incl. pure `expand-slots`, `actions/availability/*`, `app/dashboard/agenda` day/week/month. Delivers standalone value; establishes the calendar the assistant will later write into. Lowest risk, no new security surface.

2. **Phase B — Appointments (doctor-created) + status lifecycle.**
   Table `appointments` (+RLS, `(profile_id, starts_at)` index, overlap guard), `modules/appointments/*` (create/confirm/cancel/reschedule/conflict), `actions/appointments/*`, calendar shows pending→confirmed. Reuses existing `patients` for the doctor-create path. Still no external surface.

3. **Phase C — Token model + scoped external endpoint (SECURITY FOUNDATION).**
   Table `assistant_link_tokens` (+RLS, hash-at-rest, expiry/revocation), `modules/assistant-links/{create,verify,revoke}`, `actions/assistant-links/*` (doctor generates/revokes), **middleware exemption** for `/agenda-link*`, `app/api/agenda-link/route.ts` with token verify + admin client, and the deliberately-small token module allow-list (`findPatientsForBooking`, minimal `createPatient`, `createAppointment` pending). **Build and test the isolation here — before any assistant UI exists** — with explicit cross-tenant tests (token for doctor X cannot see/write doctor Y's data). This is the phase the milestone flags as security-critical.

4. **Phase D — Assistant booking UI on top of the proven endpoint.**
   `app/agenda-link/[token]/*`: search/create-patient + slot picker + "pedido a confirmar." Pure UI over Phase C's endpoint; the security invariant is already established and tested.

5. **Phase E — Earnings ledger + panel.**
   Table `financial_entries` (+RLS), `modules/financial-entries/*` (incl. SQL `summarize-period`), `actions/financial-entries/*`, `app/dashboard/ganhos`. Independent of A–D except the optional `appointment_id` link — can run in parallel with D, but slots after B so the FK target exists.

**Ordering rationale:** A→B give a working doctor agenda with zero new attack surface. C introduces the app's first session-less door and MUST be hardened and tested in isolation before D exposes it to a real user. E is orthogonal and can float, but depends on B for the appointment FK. This puts the token model + scoped endpoint (the risk) before the assistant UI (the convenience), exactly as the milestone requires.

---

## Sources

- Existing codebase (read directly, HIGH confidence): `proxy.ts`, `lib/supabase/proxy.ts`, `lib/supabase/server.ts`, `lib/supabase/server-admin.ts`, `modules/supabase/get-authenticated-user.ts`, `modules/patients/create-patient.ts`, `modules/patients/find-patient-by-profile-id-name-responsible.ts`, `modules/phone-link-codes/create-link-code.ts`
- Migrations (RLS + table patterns): `20260604000004_rls_auxiliary.sql`, `20260710000000_referrals.sql`, `20260710000100_rls_referrals.sql`, `20260228130000_phone_link_codes.sql`, `20260720000100_rls_vaccine_schedules.sql`
- Route-handler precedent: `app/api/medical-reports/[id]/download/route.ts`
- Project intent: `.planning/PROJECT.md` (v1.1 Agenda & Ganhos, Key Decisions), `CLAUDE.md` (layering + security conventions), `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/CONCERNS.md` (RLS note now superseded by post-2026-06-04 migrations)

---
*Architecture research for: Falaped v1.1 — appointment scheduling + earnings ledger + token-authenticated external surface*
*Researched: 2026-07-20*
