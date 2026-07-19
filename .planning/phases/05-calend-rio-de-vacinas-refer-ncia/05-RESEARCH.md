# Phase 5: Calendário de Vacinas (Referência) - Research

**Researched:** 2026-07-19
**Domain:** Versioned read-only clinical reference data (vaccine schedules) — Supabase schema + RLS + Next.js read-only view
**Confidence:** HIGH (all patterns are extensions of code already in this repo; the one novel piece — global-read RLS — is confirmed against official Supabase docs)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Layout (VAC-01 / VAC-02)**
- **D-01:** Main display = **two parallel columns** — SUS/PNI left, particular/SBIm right — each its own list **by age**. Direct side-by-side comparison (NOT a vaccine×age grid, NOT a single accordion).
- **D-02:** When opened from a patient, the calendar **highlights the child's current age band** (scroll/emphasize the current age without hiding past/future) using the Phase 1 age engine (`lib/compute-pediatric-age.ts`). Does NOT filter to only the current age — shows the whole calendar with "where we are" highlighted.

**Entry points / navigation**
- **D-03:** Two access paths: (a) standalone route `/dashboard/vaccines` in the sidebar (general reference, no patient) and (b) from the **patient profile**, which opens the calendar already with the child's age highlighted (D-02). Mirrors the avulso + por-paciente pattern of prescriptions (Phase 4 D-13).

**Gestante reference (VAC-03)**
- **D-04:** Presented as a **third separate tab/section** — tabs "Criança (SUS × SBIm)" and "Gestante". Makes explicit it is another dataset on another axis (gestational weeks, not child age), satisfying VAC-04 criterion 3.
- **D-05:** Timing shown as a **list by vaccine with the window in text** — e.g. "dTpa — a partir de 20 semanas", "VSR/Abrysvo — 28–36 semanas", "Hepatite B", "Influenza — qualquer momento", "COVID-19". Do NOT group by trimester (some vaccines cross trimesters). Required vaccines: Hepatite B, dTpa (≥20 sem), Influenza, COVID-19, VSR/Abrysvo (≥28 sem).

**Data model / versioning (VAC-04)**
- **D-06:** Storage = **seed table(s) in Supabase** (user decision, diverging from the in-repo JSON pattern of Phase 3 `lib/growth-reference/`). Data populated by migration/seed SQL.
- **D-07:** Access = **global read + seed-only**. RLS permits `SELECT` to any authenticated/`paid` user — **no `profile_id` filter** — because it is **shared reference data, not owned by a doctor** (important nuance: diverges from every prior slice which scopes by `profile_id`). No write path through the app — updating vigência/data is seed-only via migration/seed SQL (no admin UI/action in this phase).
- **D-08:** Versioning = **metadata per dataset (schedule)**. One "schedule" table (SUS, SBIm, gestante) with `source`, `version`, `effective_date`/vigência (and notes); vaccine/dose/age rows reference the schedule. Vigência is for the whole dataset — matches the per-block footer (D-09). Do NOT version per row.
- **D-09:** Provenance in the UI = **footer/header per dataset** ("Fonte: PNI 2025 · vigência jan/2025") read from the schedule metadata, **plus a fixed persistent advisory** "Confira sempre contra o calendário oficial atual" (VAC-04 criterion 3). Do NOT use a single global banner detached from the dataset.

**Cross-cutting**
- **D-10:** Every route/read applies the `getAuthenticatedUser` preamble + `profile.status === "paid"` gate. Unlike owned slices, there is **no** `profile_id` scope on the reference data (D-07) — but the route `paid` gate stays.
- **D-11:** The Phase 1 age engine is reused only to **position/highlight** the current age (D-02); this phase has NO diff/pendência calculation (that is Phase 6).

### Claude's Discretion
- Exact table/column names and how to model "dose" and "recommended age" (structured months column vs text label like "2 meses", "12–15 meses") — a research/planning decision, following the granularity Phase 6 will need for the per-age diff.
- UI component for tabs and columns (reuse `components/ui/tabs`, two-column layout) — follow the existing design system.
- Whether the standalone calendar needs vaccine search — considered nice-to-have, out of minimal scope unless the planner indicates otherwise.

### Deferred Ideas (OUT OF SCOPE)
- **Per-patient vaccination record** (applied doses, pending/late, next dose) — Phase 6 (VAC-05..07); consumes this calendar.
- **Vaccine search in the standalone calendar** — nice-to-have; out of minimal scope unless the planner indicates.
- **PDF/printing of the reference calendar** — not a requirement; possible future phase.
- **Admin UI/action to edit vigência without deploy** — considered and rejected; this phase is seed-only via migration (D-07).
- **Content accuracy checkpoint:** The seed data for all three calendars (SUS/PNI, SBIm, gestante) is **clinical content** requiring **physician accuracy sign-off** against current official sources at build time (blocker registered in STATE.md). Do NOT commit clinical seed content without a `checkpoint:human-verify`. The UI advisory (D-09) does NOT replace this seed sign-off.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VAC-01 | Médico consulta uma tabela de referência do calendário **SUS/PNI** por idade | Data model (§Data Model) provides `vaccine_schedules` (SUS row) + `vaccine_schedule_items` grouped by age band; read module `getVaccineScheduleWithItems(supabase, "SUS")`; UI two-column list (C3). |
| VAC-02 | Médico consulta o calendário **particular (SBIm)** por idade, lado a lado com o SUS | Same schedule/item tables with `source = "SBIm"`; UI renders SUS + SBIm side by side (C3); both read via one query. |
| VAC-03 | Médico consulta a referência de **vacinação da gestante** (Hepatite B, dTpa ≥20 sem, Influenza, COVID-19, VSR/Abrysvo ≥28 sem) | Gestante modeled as a schedule with `axis = "gestational_weeks"`; items store a **text window** + optional structured `week_min`/`week_max` (§Gestante Modeling); UI = separate tab, list-by-vaccine (C5). |
| VAC-04 | Calendários modelados como dado versionado (`vacina, dose, idade recomendada, fonte SUS\|SBIm, ano/versão`) com fonte e data de vigência | `vaccine_schedules` metadata table (`source`, `version`, `effective_date`, `notes`) + child `vaccine_schedule_items` (vaccine, dose, age); provenance rendered per dataset (C6). Structured age fields chosen for Phase 6 diff (§Data Model rationale). |
</phase_requirements>

## Summary

This phase adds a **read-only, seed-only, globally-readable** vaccine-schedule reference to an app whose every prior slice was per-doctor owned. The technical work is almost entirely an *extension of patterns already in this repo* — the migration shape, the seed migration idempotency pattern, the three-layer `app/ → actions/ → modules/` read path, the top-level dashboard route, and the shadcn `Tabs`/`Card`/`Table` primitives all exist and are proven. There is **no new npm dependency** and **no new shadcn block** to install.

The one genuinely novel technical decision is the **global-read RLS policy** (D-07): a `SELECT ... to authenticated using (true)` policy with **no** INSERT/UPDATE/DELETE policies, so any logged-in user can read but only migrations/service-role can write. This is the documented Supabase pattern for reference data and — critically — it does **not** introduce an IDOR concern, because there is no per-tenant row to leak; the data is intentionally identical for every doctor. The IDOR pitfall that governs every owned slice (`.eq("profile_id", ...)` on read/write/delete) is deliberately **absent** here, and that absence must be documented in the migration and read module so a future maintainer doesn't "fix" it by reflex.

The second decision worth locking is **age granularity** (Claude's Discretion): store a **structured `age_months` integer** (plus optional `age_months_max` for windows) on each item **in addition to** a human `age_label` text. The structured field is what Phase 6 needs to diff a child's computed age against the schedule; the text label is what the UI renders. Modeling only the text label would force Phase 6 to re-parse "12–15 meses" strings — a known trap. Gestante items sit on a different axis (`week_min`/`week_max` + text window), so the schedule needs an `axis` discriminator.

**Primary recommendation:** Two tables — `vaccine_schedules` (metadata: source, version, effective_date, axis, notes) and `vaccine_schedule_items` (schedule_id FK, vaccine, dose, structured `age_months`/`age_months_max` OR `week_min`/`week_max`, human `age_label`/`window_label`, sort_order). Global-read RLS (`select to authenticated using (true)`, no write policies). Clinical seed values gated behind a `checkpoint:human-verify` task. One read module per axis, `paid`-gated route, shared view component with an optional `birthDate` prop that drives the current-age highlight.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Store versioned schedule metadata + rows | Database (Supabase Postgres) | — | Versioned relational reference data with global-read RLS (D-06/D-07). |
| Enforce read-only / seed-only writes | Database (RLS) | Migrations/service-role | RLS with only a SELECT policy denies all client writes; writes happen via migration SQL (D-07). |
| Gate access on `paid` subscription | Frontend Server (route + action preamble) | — | RLS is `to authenticated` (any logged-in user); the `paid` business gate lives at the app layer (D-10), consistent with every other route. |
| Fetch schedules + items | Frontend Server (`modules/` via injected client) | — | Server Component reads via one module per axis; no client-side DB access. |
| Compute current age band for highlight | Frontend Server (pure `lib/compute-pediatric-age.ts`) | Client (highlight render) | Age is computed from the patient's `birth_date` (already fetched server-side); the engine is pure (D-11). Highlight is position-only. |
| Render tabs / two columns / provenance | Client (shadcn `Tabs` interaction) | Frontend Server (data + SSR shell) | Tab switching is client interaction; the data and page shell are server-rendered (C1/C2). |

## Standard Stack

No new packages. Every capability is served by dependencies already in `package.json` (verified in CLAUDE.md tech-stack section and `package.json`).

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` + `@supabase/ssr` | latest (installed) | Per-request server client, schedule/item reads | Every data slice in this app reads through these; per-request client factory in `lib/supabase/server.ts` [VERIFIED: codebase]. |
| `next` (App Router / Server Components) | ^16.2.0 (installed) | Read-only Server Component page + top-level route | Matches the `app/dashboard/referrals/page.tsx` route pattern [VERIFIED: codebase]. |
| `date-fns` | ^4.1.0 (installed) | Age computation is already implemented over date-fns in `lib/compute-pediatric-age.ts` | Reused, not re-added [VERIFIED: codebase]. |
| shadcn/ui primitives (`tabs`, `card`, `table`, `badge`, `separator`, `skeleton`, `breadcrumb`) | present in `components/ui/` | Tabs (Criança/Gestante), two-column cards, provenance footer, skeleton loading | UI-SPEC confirms all needed primitives already exist — no new block install [CITED: 05-UI-SPEC.md §Design System]. |
| `zod` | ^4.3.6 (installed) | (Optional) validate/parse the `axis`/`source` param at the route boundary | Project convention: Zod safeParse at boundaries [VERIFIED: codebase / CLAUDE.md]. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | ^0.511.0 (installed) | Section/nav icons (e.g. `Syringe`/`CalendarIcon` in the sidebar) | Sidebar entry + page header icon, matching sibling routes. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase table (D-06) | In-repo typed JSON (Phase 3 `lib/growth-reference/`) | User explicitly chose DB (D-06). JSON would be simpler and avoids RLS, but D-06 is locked — do not re-open. The *shape* of the growth-reference metadata (`source`/`version`/range) is still the model to mirror, in table columns instead of a TS type. |
| Two tables (schedule + items) | One denormalized table with repeated source/version columns | Denormalizing duplicates provenance across every row and makes "version the whole dataset" (D-08) awkward. Two tables match D-08 exactly. |
| Structured `age_months` int | Text-only `age_label` ("12–15 meses") | Text-only forces Phase 6 to parse strings for the diff — a known trap. Store both (structured for logic, text for display). |

**Installation:** None. Confirm no new dependency creeps in during planning.

## Package Legitimacy Audit

> **Not applicable.** This phase installs **no external packages**. All libraries used are already in `package.json` and all shadcn primitives already exist in `components/ui/` (confirmed in 05-UI-SPEC.md §Registry Safety: "No new shadcn block install is required for this phase"). If the planner discovers a package is needed after all, run the Package Legitimacy Gate before adding it.

## Architecture Patterns

### System Architecture Diagram

```
                         ┌───────────────────────────────────────────┐
  Two entry points       │            Next.js App Router              │
                         │                                            │
  (a) Sidebar link ─────▶│  app/dashboard/vaccines/page.tsx (RSC)     │
      /dashboard/vaccines│    • createClient() (per-request)          │
                         │    • getAuthenticatedUser(supabase)        │
  (b) Patient profile ──▶│    • gate: profile.status === "paid" ──┐   │
      (passes birthDate) │                                        │   │
                         │         no paid ──▶ redirect / 403 ◀───┘   │
                         │                                            │
                         │    getVaccineScheduleWithItems(sb,"SUS")   │
                         │    getVaccineScheduleWithItems(sb,"SBIm")  │──┐
                         │    getVaccineScheduleWithItems(sb,"gestante")│ │
                         └───────────────────┬────────────────────────┘ │
                                             │ SELECT (RLS: authenticated, using true)
                                             ▼                           │
                         ┌───────────────────────────────────────────┐  │
                         │           Supabase Postgres                │  │
                         │  vaccine_schedules   (source,version,      │  │
                         │                       effective_date,axis) │  │
                         │        │ 1───N                             │  │
                         │  vaccine_schedule_items (vaccine,dose,     │  │
                         │        age_months / week_min..max, labels) │  │
                         │  RLS: SELECT to authenticated using(true)  │  │
                         │       NO insert/update/delete policies     │  │
                         └───────────────────────────────────────────┘  │
                                                                         │
   birthDate present? ─── yes ──▶ computePediatricAge() (pure) ──────────┘
                                    │ band + totalDays/parts
                                    ▼
                         ┌───────────────────────────────────────────┐
                         │  <VaccineCalendarView>  (client for tabs)  │
                         │   Tabs: Criança (SUS × SBIm) | Gestante    │
                         │   • two columns grouped by age band        │
                         │   • current-age band: border-l+primary/10  │
                         │   • per-dataset provenance footer          │
                         │   • fixed advisory "Confira sempre..."     │
                         └───────────────────────────────────────────┘
```

### Recommended Project Structure
```
supabase/migrations/
├── 202607XX000000_vaccine_schedules.sql          # 2 tables + indexes + comments
├── 202607XX000100_rls_vaccine_schedules.sql      # global-read RLS (SELECT only)
└── 202607XX000200_seed_vaccine_schedules.sql     # CLINICAL SEED — checkpoint:human-verify

modules/vaccines/
├── types.ts                                       # VaccineSchedule, VaccineScheduleItem, axis
├── get-vaccine-schedule-with-items.ts             # one exported fn; joins schedule + items
└── group-items-by-age-band.ts                     # pure helper: items → age-band groups (optional)

app/dashboard/vaccines/
└── page.tsx                                        # RSC: auth + paid gate + reads + view

components/dashboard/vaccines/
├── vaccine-calendar-view.tsx                      # shared view (tabs, columns) — client
├── vaccine-column.tsx                             # one dataset column grouped by age band
├── gestante-list.tsx                              # gestante tab (list by vaccine)
└── schedule-provenance.tsx                        # "Fonte: … · vigência …" + advisory
```

Note: `modules/` receives `SupabaseClient` by injection and never imports `next/cache`/`next/headers` (CLAUDE.md rule). The patient-profile entry point renders the same `<VaccineCalendarView>` with a `birthDate` prop.

### Pattern 1: Global-read reference table (RLS divergence, D-07)
**What:** Enable RLS, add exactly one SELECT policy `to authenticated using (true)`, and create **no** INSERT/UPDATE/DELETE policies. With RLS on and no write policies, all writes from the publishable/authenticated key are denied; only `service_role` (bypasses RLS) or SQL migrations can write. [CITED: supabase.com/docs/guides/database/postgres/row-level-security]
**When to use:** Shared reference data that is identical for every tenant and never written through the app.
**Example:**
```sql
-- Source: Supabase RLS docs + repo migration conventions (all policies in same file as enable)
alter table public.vaccine_schedules enable row level security;
alter table public.vaccine_schedule_items enable row level security;

-- Read: any authenticated user. NO profile_id filter — this is shared reference data (D-07).
create policy "Vaccine schedules readable by authenticated"
on public.vaccine_schedules for select to authenticated
using (true);

create policy "Vaccine schedule items readable by authenticated"
on public.vaccine_schedule_items for select to authenticated
using (true);

-- Intentionally NO insert/update/delete policies: writes are seed-only via migration (D-07).
```

### Pattern 2: Two-table versioned schedule (D-08)
**What:** Parent `vaccine_schedules` holds provenance/version (versioned as a whole dataset); child `vaccine_schedule_items` holds the vaccine/dose/age rows FK'd to the schedule.
**When to use:** VAC-04's "dado versionado com fonte e vigência" where vigência belongs to the dataset, not the row.
**Example:**
```sql
-- Source: modeled on patient_measurements / guidance_templates repo migrations + D-08
create table public.vaccine_schedules (
  id uuid primary key default gen_random_uuid(),
  source text not null,                 -- 'SUS' | 'SBIm' | 'gestante' (label + dataset key)
  axis text not null default 'child_age', -- 'child_age' | 'gestational_weeks' (D-04)
  version text not null,                 -- e.g. 'PNI 2025'
  effective_date date not null,          -- vigência (D-08/D-09)
  notes text,
  created_at timestamptz not null default now()
);
comment on table public.vaccine_schedules is
  'Metadata versionada por calendário de vacina (SUS/SBIm/gestante). Vigência por dataset (D-08). Dado de referência global, somente leitura (D-07).';

create table public.vaccine_schedule_items (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.vaccine_schedules(id) on delete cascade,
  vaccine text not null,                 -- 'Pentavalente', 'dTpa', ...
  dose text,                             -- '1ª dose', 'reforço', null when N/A
  -- Structured age (child_age axis) — what Phase 6 diffs against:
  age_months integer,                    -- recommended age in months (0 = ao nascer)
  age_months_max integer,                -- upper bound for a window (e.g. 12–15m); null = single point
  -- Structured window (gestational_weeks axis):
  week_min integer,                      -- e.g. 20 for dTpa
  week_max integer,                      -- e.g. 36 for VSR; null = "a partir de"/open-ended
  -- Human-readable label the UI renders (D-05 windows in text):
  age_label text not null,               -- 'Ao nascer', '2 meses', '12–15 meses', 'a partir de 20 semanas'
  sort_order integer not null default 0, -- deterministic display order within a schedule
  notes text
);
create index idx_vaccine_schedule_items_schedule on public.vaccine_schedule_items (schedule_id, sort_order);
comment on table public.vaccine_schedule_items is
  'Linhas vacina/dose/idade de um calendário. age_months/age_months_max (eixo criança) ou week_min/week_max (eixo gestante) são estruturados p/ o diff da Phase 6; age_label é o texto exibido (D-05).';
```

### Pattern 3: Idempotent seed migration (checkpoint-gated clinical content)
**What:** Insert the metadata row(s) then the item rows via `insert ... where not exists`, so re-running the migration doesn't duplicate. Unlike the exam-catalog seed (per-profile `cross join public.profiles`), this seed inserts **once, globally** — no `profile_id`, no `cross join profiles`.
**When to use:** Seeding the three schedules. **Gate behind `checkpoint:human-verify`** — the actual clinical values require physician sign-off (STATE.md blocker).
**Example:**
```sql
-- Source: modeled on 20260710020600_seed_exam_catalog.sql, but GLOBAL (no per-profile fan-out)
-- CLINICAL CONTENT — physician-approved values only. Placeholder shown; real values via checkpoint.
insert into public.vaccine_schedules (source, axis, version, effective_date, notes)
select v.source, v.axis, v.version, v.effective_date::date, v.notes
from (values
  ('SUS',      'child_age',         'PNI 2025',  '2025-01-01', null),
  ('SBIm',     'child_age',         'SBIm 2025', '2025-01-01', null),
  ('gestante', 'gestational_weeks', 'SBIm 2025', '2025-01-01', null)
) as v(source, axis, version, effective_date, notes)
where not exists (
  select 1 from public.vaccine_schedules s where s.source = v.source and s.version = v.version
);
-- items inserted per schedule via a join on source/version, likewise guarded by where not exists.
```

### Pattern 4: Read path (three layers) with NO profile_id scope
**What:** One module reads a schedule + its items; the page calls it once per dataset. Explicitly **omits** the `.eq("profile_id", ...)` filter that every owned module uses.
**Example:**
```typescript
// modules/vaccines/get-vaccine-schedule-with-items.ts
// Source: modeled on modules/prescriptions/get-prescriptions-by-profile-id.ts
// NOTE: NO .eq("profile_id") — this is GLOBAL reference data (D-07). Do not add an owner filter.
import type { SupabaseClient } from "@supabase/supabase-js"

export async function getVaccineScheduleWithItems(
  supabase: SupabaseClient,
  source: "SUS" | "SBIm" | "gestante",
) {
  const { data, error } = await supabase
    .from("vaccine_schedules")
    .select(
      "id, source, axis, version, effective_date, notes, " +
      "vaccine_schedule_items(id, vaccine, dose, age_months, age_months_max, week_min, week_max, age_label, sort_order, notes)",
    )
    .eq("source", source)
    .order("sort_order", { referencedTable: "vaccine_schedule_items", ascending: true })
    .maybeSingle()

  if (error) throw new Error(`[VACCINES] Failed to fetch schedule ${source}: ${error.message}`)
  return data // null if unseeded → UI defensive empty state (C7)
}
```

### Pattern 5: Current-age highlight (position-only, D-02/D-11)
**What:** Compute the child's age once server-side via the existing engine, derive `totalMonths` (from `totalDays` or `parts`), and mark the item whose `[age_months, age_months_max ?? age_months]` window contains the current age. Highlight only — no diff.
**Example:**
```typescript
// The engine returns { band, totalDays, parts }. For band matching use whole months.
import { computePediatricAge } from "@/lib/compute-pediatric-age"
const age = computePediatricAge(patient.birth_date, new Date(), patient.gestational_age_weeks)
const currentMonths = age.status === "ok" ? Math.floor((age.totalDays ?? 0) / 30.4375) : null
// An item is "current" when currentMonths ∈ [age_months, age_months_max ?? age_months].
// Standalone mode passes no birthDate → currentMonths null → no highlight (C4).
```

### Anti-Patterns to Avoid
- **Copying `.eq("profile_id", ...)` by reflex.** Every other module in this repo scopes by owner; this one must NOT. Add a comment at the query and in the migration so no one "fixes" the missing filter (this is a deliberate D-07 divergence, not the IDOR bug from CONCERNS.md).
- **Storing age only as text.** Phase 6's pending/late diff needs a numeric comparison; a text-only `"12–15 meses"` forces brittle re-parsing. Store both.
- **A single global provenance banner.** D-09 requires per-dataset provenance read from that dataset's metadata, plus the fixed advisory — not one detached banner.
- **Grouping gestante by trimester.** D-05: some vaccines cross trimesters; list by vaccine with the text window.
- **Committing clinical seed values without physician sign-off.** STATE.md blocker; gate the seed with `checkpoint:human-verify`.
- **A vaccine×age matrix grid or single accordion.** D-01 mandates two parallel age-grouped lists.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pediatric age from birth date | A new age/date calculator | `lib/compute-pediatric-age.ts` (Phase 1, tested) | Handles bands, corrected age, timezone-safe local-midnight parsing, invalid/future guards [VERIFIED: codebase]. |
| Write-blocking on reference data | App-layer "is this a write?" checks | RLS with only a SELECT policy | DB denies writes automatically; no app code needed [CITED: Supabase RLS docs]. |
| Provenance/version display shape | New metadata schema from scratch | Mirror `lib/growth-reference` `source`/`version`/range concept in table columns | Proven shape the UI already knows how to render (Phase 3) [VERIFIED: codebase]. |
| Tabs / columns / skeleton / table | Custom tab or grid components | shadcn `Tabs`/`Card`/`Table`/`Skeleton` already in `components/ui/` | UI-SPEC confirms all present; no new install [CITED: 05-UI-SPEC.md]. |
| Idempotent seeding | Ad-hoc insert scripts | `insert ... select ... where not exists` (exam-catalog seed pattern) | Re-runnable migration without duplicate rows [VERIFIED: codebase]. |

**Key insight:** This phase is 90% recombination of existing, tested repo patterns. The only thing to invent is the *global-read RLS shape* and the *age-granularity decision* — both resolved above.

## Common Pitfalls

### Pitfall 1: Reflexive owner-scoping breaks global reference reads
**What goes wrong:** A developer (or an autonomous executor) adds `.eq("profile_id", profile.id)` to the read module because "that's how every module works," and the query returns nothing (schedules have no `profile_id` column) or fails.
**Why it happens:** Every prior slice is owned; the muscle memory is strong (STATE.md logs multiple `profile_id`-scoping decisions).
**How to avoid:** No `profile_id` column on the tables; explicit "NO owner filter (D-07)" comment in the module and migration; a read test that asserts a second doctor sees the same rows.
**Warning signs:** Empty calendar for a logged-in paid user; `column vaccine_schedules.profile_id does not exist`.

### Pitfall 2: RLS enabled without a SELECT policy → silent total denial
**What goes wrong:** `alter table ... enable row level security` is applied but the SELECT policy lands in a later/failed migration, so every read returns empty with no error.
**Why it happens:** Enabling RLS without policies denies everything; the repo convention (noted in `rls_prescriptions.sql`) is "enable RLS and create all policies in the same migration file."
**How to avoid:** Put `enable row level security` and the SELECT policies in the **same** migration; apply to the live DB in the correct order (the referrals close-out in STATE.md shows migration-ordering has bitten this project before).
**Warning signs:** No error, but zero rows for all users right after enabling RLS.

### Pitfall 3: `paid` gate confusion vs RLS scope
**What goes wrong:** Someone assumes RLS `to authenticated` already enforces the subscription gate, and drops the `profile.status === "paid"` check on the new route.
**Why it happens:** RLS *looks* like it's doing access control. But `to authenticated` includes non-paid users; the `paid` gate is a business rule enforced at the app layer (D-10), exactly as in every other route/action.
**How to avoid:** Keep the `getAuthenticatedUser` + `profile.status === "paid"` preamble on the route (mirror `app/dashboard/referrals/page.tsx`), even though the data is global.
**Warning signs:** A non-paid authenticated user can view the calendar.

### Pitfall 4: Phase 6 can't diff because age is text-only
**What goes wrong:** Items store only `age_label` ("12–15 meses"); Phase 6 must regex-parse Portuguese age strings to compute pending/late.
**Why it happens:** The UI only needs the label, so the structured field feels redundant now.
**How to avoid:** Store `age_months`/`age_months_max` (and `week_min`/`week_max` for gestante) now, even though this phase renders only `age_label`. The Discretion note in CONTEXT.md explicitly ties granularity to Phase 6's needs.
**Warning signs:** Phase 6 research proposes string parsing of `age_label`.

### Pitfall 5: Timezone off-by-one in age computation
**What goes wrong:** New age math uses `new Date("YYYY-MM-DD")` (UTC midnight) → off-by-one in BRT.
**Why it happens:** Re-implementing instead of reusing.
**How to avoid:** Do not re-implement — call `computePediatricAge`, which already does local-midnight parsing and is tested. Highlight logic only reads its output.
**Warning signs:** Highlighted band is one day/band off near birthdays.

## Code Examples

See Patterns 1–5 above — each carries a verified source header. No additional external-doc examples are needed; the phase composes existing repo code.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| In-repo typed JSON reference (Phase 3 `lib/growth-reference/`) | Supabase seed tables with global-read RLS (this phase, D-06) | Phase 5 decision | User chose DB storage; the *provenance shape* still mirrors the growth-reference metadata, but storage moves to Postgres. |
| Owner-scoped RLS (`profile_id in (...)`) on every table | Global-read RLS (`using (true)` to authenticated) for shared reference data | Phase 5 (first of its kind in this repo) | First deliberate divergence from per-tenant scoping — must be documented so it isn't "corrected." |

**Deprecated/outdated:** None specific to this phase. (Note: `@tanstack/react-query` is referenced in a project skill but is **not installed** — CONCERNS.md; do not introduce it here.)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Modeling age as `age_months` (0 = ao nascer) with `age_months_max` for windows is the right granularity for Phase 6's diff | Data Model / Pitfall 4 | If Phase 6 needs day-level or dose-interval precision, the column set expands (additive migration, low cost). Confirm against Phase 6 discuss/spec. |
| A2 | `axis` discriminator (`child_age` vs `gestational_weeks`) on the schedule cleanly separates gestante | Gestante Modeling | If a future dataset mixes axes, the model needs revisiting; low risk for the three known datasets. |
| A3 | `effective_date` as a single `date` (vigência = one point) is sufficient for D-09's "vigência jan/2025" footer | Data Model | If the doctor wants a validity *range*, add `effective_until`; additive, low cost. |
| A4 | The real seed values (SUS/PNI, SBIm, gestante dose-by-age) are clinical content requiring physician sign-off — NOT researched here | Deferred / seed pattern | Committing unverified clinical content is the STATE.md blocker; the planner MUST gate the seed with `checkpoint:human-verify`. |
| A5 | `week_max = null` cleanly encodes "a partir de N semanas" (open-ended) and a value encodes "N–M semanas" | Gestante Modeling | If a vaccine needs "até N semanas" (upper-only), add a nullable `week_min` semantics note; low risk given VAC-03's listed windows. |

## Open Questions

1. **Exact age-band granularity for the SUS/SBIm lists (Claude's Discretion → planner)**
   - What we know: Structured `age_months`/`age_months_max` + text `age_label` covers both display and Phase 6 diff.
   - What's unclear: Whether the *display* groups strictly by the official age milestones (0, 2, 3, 4, 6, 9, 12, 15 months...) or by a coarser set. This is a display grouping, independent of the stored structured field.
   - Recommendation: Group the UI by distinct `age_months` values present in the seed; let the seed's `sort_order` drive order. Planner decides the exact milestone set alongside the physician when seeding.

2. **Alignment across the two columns when one dataset lacks a band (C3)**
   - What we know: UI-SPEC C3 says render an explicit empty marker (`—`) rather than silent misalignment.
   - What's unclear: Whether to align strictly by `age_months` rows or render each column independently.
   - Recommendation: Compute the union of age bands across SUS+SBIm, render each band in both columns, `—` where a dataset has none. Purely a view concern; data model already supports it (shared `age_months`).

3. **Does the standalone route need a patient picker / search? (Discretion)**
   - What we know: CONTEXT marks vaccine search as nice-to-have, out of minimal scope.
   - Recommendation: Ship without search; standalone = full reference, patient entry = highlighted. Revisit only if the planner elevates it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase project (Postgres + Auth) | Schedule tables, RLS, reads | ✓ | live project `acstugafrgrqzvtuznxv` (per STATE.md) | — |
| Supabase MCP `apply_migration` | Applying the 3 new migrations to the live DB | ✓ | (used for referrals migrations per STATE.md) | Run migration SQL via Supabase SQL editor |
| Node.js / Next.js / yarn | Build & run the route | ✓ | Next ^16.2.0, yarn 1.22.22 | — |
| shadcn primitives | UI | ✓ | already in `components/ui/` | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None blocking.

> Note: as with the referrals migrations (STATE.md), applying the new migrations to the **live** DB in the correct order is a BLOCKING task the planner should schedule explicitly (order: `vaccine_schedules` → `rls_vaccine_schedules` → `seed_vaccine_schedules`), with the seed behind `checkpoint:human-verify`.

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1` (from `.planning/config.json`). Included.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture | yes | Read-only, seed-only reference tier; documented global-read divergence (D-07). |
| V2 Authentication | yes (inherited) | `getAuthenticatedUser` preamble on the route (existing pattern). |
| V4 Access Control | yes | RLS `select to authenticated using (true)` + app-layer `paid` gate (D-10). No write policies → writes denied. **No `profile_id` scope by design** (D-07) — global read-only data. |
| V5 Input Validation | minimal | Only input is the `source`/`axis` param at the route; validate with a Zod enum/`safeParse` to avoid arbitrary query params. No user-supplied writes. |
| V6 Cryptography | no | No secrets, no crypto in this phase. |
| V7 Error Handling / Logging | yes | Modules throw `[VACCINES] ...`; route/UI shows inline error + retry (C7). Do not leak DB errors to the client — convert to result/PT-BR messages. |

### Known Threat Patterns for {Next.js + Supabase reference data}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR via missing owner filter | Information Disclosure | **N/A here by design** — data is global reference, no per-tenant rows to leak. This is the deliberate exception to the CONCERNS.md IDOR pitfall; document it so the absent filter is not mistaken for the bug. |
| Unauthorized write to reference data | Tampering | RLS with no INSERT/UPDATE/DELETE policies denies all client writes; only migrations/service-role write [CITED: Supabase RLS docs]. |
| Non-paid user accessing the feature | Elevation of Privilege | App-layer `profile.status === "paid"` gate on the route (RLS `to authenticated` does not enforce the subscription tier). |
| Injection via `source`/`axis` param | Tampering | Zod enum validation at the route boundary; Supabase client parameterizes `.eq()` values. |
| Stale/incorrect clinical data presented as authoritative | (Safety / Repudiation) | Per-dataset provenance (source+version+vigência) + fixed advisory "Confira sempre contra o calendário oficial atual" (D-09); seed accuracy gated by physician sign-off (STATE.md). |

## Sources

### Primary (HIGH confidence)
- Repo codebase (read this session): `lib/growth-reference/index.ts`, `lib/compute-pediatric-age.ts`, `modules/prescriptions/get-prescriptions-by-profile-id.ts`, `modules/supabase/get-authenticated-user.ts`, `app/dashboard/referrals/page.tsx`, `components/app-sidebar.tsx`, migrations (`20260709000000_patient_measurements.sql`, `20260710020400_exam_catalog_items.sql`, `20260710020600_seed_exam_catalog.sql`, `20260710030000_guidance_templates.sql`, `20260604000000_rls_prescriptions.sql`), `.planning/codebase/CONCERNS.md`, `CLAUDE.md`.
- Phase docs: `05-CONTEXT.md`, `05-UI-SPEC.md`, `REQUIREMENTS.md`, `STATE.md`.

### Secondary (MEDIUM confidence)
- Supabase RLS documentation (WebFetch, official): row-level-security guide — global-read `to authenticated using (true)` pattern and write-denial when only a SELECT policy exists. [CITED: supabase.com/docs/guides/database/postgres/row-level-security]

### Tertiary (LOW confidence)
- None. (Clinical seed values were deliberately NOT researched — see A4 / Deferred.)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps; all confirmed present in `package.json`/`components/ui/`.
- Architecture / data model: HIGH — direct extension of existing repo migrations + read modules; age-granularity is a well-reasoned Discretion call (A1).
- Global-read RLS: HIGH — confirmed against official Supabase docs and consistent with repo RLS conventions.
- Pitfalls: HIGH — grounded in this repo's own history (CONCERNS.md IDOR, STATE.md migration-order and profile_id-scoping decisions).
- Clinical seed values: N/A — out of scope by design (physician sign-off blocker).

**Research date:** 2026-07-19
**Valid until:** ~2026-08-18 (stable domain; Supabase RLS semantics and repo patterns are not fast-moving). Clinical calendar content (PNI/SBIm/gestante) changes ~annually and must be re-verified with the physician at seed time regardless of this date.
