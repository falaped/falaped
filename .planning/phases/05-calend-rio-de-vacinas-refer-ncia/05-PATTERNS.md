# Phase 5: Calendário de Vacinas (Referência) - Pattern Map

**Mapped:** 2026-07-19
**Files analyzed:** 12 (new/modified)
**Analogs found:** 11 / 12 (1 deliberate divergence has no exact analog — global-read RLS)

## Orientation (read first)

This phase is **read-only reference data** with a **deliberate RLS divergence** (D-07). Every other slice in this repo is owner-scoped by `profile_id`. Here the reference tables are **global** — readable by any authenticated user, no `profile_id` column, no owner filter. The analogs below are the correct *shape* to copy, but the pattern map calls out exactly which lines to KEEP and which to DROP so the planner does not copy the owner filter by reflex.

There are **no Server Actions** in this phase (no writes). The page (RSC) reads directly through `modules/` — mirroring `app/dashboard/referrals/page.tsx`, which itself calls the read module inline without an action.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/…_vaccine_schedules.sql` | migration (table + RLS) | reference-read | `supabase/migrations/20260710020400_exam_catalog_items.sql` | role-match (RLS DIVERGES — see D-07) |
| `supabase/migrations/…_rls_vaccine_schedules.sql` (if split) | migration (RLS) | reference-read | `20260710000100_rls_referrals.sql` | role-match (policies DIVERGE — SELECT-only, `using(true)`) |
| `supabase/migrations/…_seed_vaccine_schedules.sql` | migration (seed) | batch/seed | `20260710020600_seed_exam_catalog.sql` / `20260710030100_seed_guidance_templates.sql` | role-match (GLOBAL insert — NO per-profile `cross join`) |
| `modules/vaccines/types.ts` | model (types) | — | `modules/referrals/types.ts` | exact |
| `modules/vaccines/get-vaccine-schedule-with-items.ts` | module (read query) | request-response (DB read) | `modules/prescriptions/get-prescriptions-by-profile-id.ts` | role-match (DROP `.eq("profile_id")`) |
| `modules/vaccines/group-items-by-age-band.ts` (optional) | utility (pure helper) | transform | `lib/compute-pediatric-age.ts` (pure-fn shape) | partial (pure transform) |
| `app/dashboard/vaccines/page.tsx` | route (RSC page) | request-response | `app/dashboard/referrals/page.tsx` | exact |
| `components/dashboard/vaccines/vaccine-calendar-view.tsx` | component (client, tabs) | event-driven (UI) | shadcn `Tabs` + growth-section layout | role-match |
| `components/dashboard/vaccines/vaccine-column.tsx` | component | render | `components/dashboard/referrals/*` list card | role-match |
| `components/dashboard/vaccines/gestante-list.tsx` | component | render | list-by-item card | role-match |
| `components/dashboard/vaccines/schedule-provenance.tsx` | component | render | `lib/growth-reference` metadata shape (source/version/range) | role-match (concept, not code) |
| `components/app-sidebar.tsx` | config (nav) — MODIFY | — | `components/app-sidebar.tsx` `navMain` "Serviços" group | exact (self) |

## Pattern Assignments

### `supabase/migrations/…_vaccine_schedules.sql` (migration, two tables + comments + indexes)

**Analog:** `supabase/migrations/20260710020400_exam_catalog_items.sql` (table + comment + index + trigger) and `20260709000000_patient_measurements.sql` (multi-column table + CHECK + comment).

**Table + comment + index pattern to COPY** (`exam_catalog_items.sql:1-13`):
```sql
-- Relational reference table: … per profile (D-01).
create table public.exam_catalog_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,   -- DROP THIS for vaccines
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_exam_catalog_items_profile_id on public.exam_catalog_items (profile_id);
comment on table public.exam_catalog_items is 'Catálogo … escopada por profile_id.';
```

**DIVERGENCE (D-07):** vaccine tables have **NO `profile_id` column**. The parent/child schema to build (from RESEARCH Pattern 2):
```sql
create table public.vaccine_schedules (
  id uuid primary key default gen_random_uuid(),
  source text not null,                    -- 'SUS' | 'SBIm' | 'gestante'
  axis text not null default 'child_age',  -- 'child_age' | 'gestational_weeks' (D-04)
  version text not null,                   -- 'PNI 2025'
  effective_date date not null,            -- vigência (D-08/D-09)
  notes text,
  created_at timestamptz not null default now()
);
comment on table public.vaccine_schedules is
  'Metadata versionada por calendário de vacina (SUS/SBIm/gestante). Vigência por dataset (D-08). Dado de referência GLOBAL, somente leitura — SEM profile_id (D-07).';

create table public.vaccine_schedule_items (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.vaccine_schedules(id) on delete cascade,
  vaccine text not null,
  dose text,
  age_months integer,        -- structured, for Phase 6 diff
  age_months_max integer,    -- window upper bound; null = single point
  week_min integer,          -- gestational axis
  week_max integer,          -- null = "a partir de"
  age_label text not null,   -- D-05 human text the UI renders
  sort_order integer not null default 0,
  notes text
);
create index idx_vaccine_schedule_items_schedule on public.vaccine_schedule_items (schedule_id, sort_order);
```

**Provenance-shape source of truth:** mirror `lib/growth-reference/index.ts:41-51` (`GrowthReferenceTable` — `source`, `standard`, `ageMin`, `ageMax`, `version`) in table columns. That TS type is the *conceptual* precedent for the `source`/`version`/`effective_date` metadata columns.

**Note on trigger:** the analog adds a `set_updated_at_*` trigger. This table is seed-only (no app updates) — the trigger is optional/omittable. Planner decides; if omitted, drop `updated_at`.

---

### `supabase/migrations/…_rls_vaccine_schedules.sql` (migration, RLS — DELIBERATE DIVERGENCE)

**Analog for STRUCTURE:** `supabase/migrations/20260710000100_rls_referrals.sql` (header comment, `enable row level security`, one policy per verb, same-file rule).

**Analog for the "enable + policies same file" rule** (`rls_referrals.sql:1-7`):
```sql
-- Rule: always enable RLS and create all policies in the same migration file.
-- Enabling RLS without policies immediately denies all authenticated access.
alter table public.referrals enable row level security;
```

**DIVERGENCE (D-07) — DO NOT COPY the owner-scoped `using(...)` block.** The referrals/measurements policies use:
```sql
-- ❌ DO NOT COPY for vaccines:
using ( profile_id in ( select id from public.profiles where auth_user_id = auth.uid() ) )
```
Instead, build a **SELECT-only, global-read** policy set (RESEARCH Pattern 1). NO insert/update/delete policies at all:
```sql
alter table public.vaccine_schedules enable row level security;
alter table public.vaccine_schedule_items enable row level security;

-- Read: any authenticated user. NO profile_id filter — shared reference data (D-07).
create policy "Vaccine schedules readable by authenticated"
on public.vaccine_schedules for select to authenticated using (true);

create policy "Vaccine schedule items readable by authenticated"
on public.vaccine_schedule_items for select to authenticated using (true);

-- Intentionally NO insert/update/delete policies: writes are seed-only via migration (D-07).
```

**Ordering warning (Pitfall 2, from STATE.md referrals close-out):** put `enable row level security` and the SELECT policies in the **same** migration and apply in order: table → rls → seed. RLS enabled without a SELECT policy = silent total denial (zero rows, no error).

---

### `supabase/migrations/…_seed_vaccine_schedules.sql` (migration, seed — CHECKPOINT GATED)

**Analog:** `supabase/migrations/20260710020600_seed_exam_catalog.sql` and `20260710030100_seed_guidance_templates.sql` — both idempotent `insert … select … from (values …) where not exists`.

**Idempotency pattern to COPY** (`seed_guidance_templates.sql:7-66`, `seed_exam_catalog.sql:7-29`):
```sql
insert into public.<table> (<cols>)
select <cols>
from (values (...), (...)) as v(<cols>)
where not exists ( select 1 from public.<table> t where t.<key> = v.<key> );
```

**DIVERGENCE (D-07):** the analogs fan out **per profile** via `cross join public.profiles p` (see `seed_exam_catalog.sql:9` `from public.profiles p cross join (values …)`). Vaccine seed inserts **ONCE, GLOBALLY** — **NO `public.profiles`, NO `cross join`, NO `profile_id`**. Insert schedules first, then items joined on `source`/`version` (RESEARCH Pattern 3):
```sql
insert into public.vaccine_schedules (source, axis, version, effective_date, notes)
select v.source, v.axis, v.version, v.effective_date::date, v.notes
from (values
  ('SUS','child_age','PNI 2025','2025-01-01',null),
  ('SBIm','child_age','SBIm 2025','2025-01-01',null),
  ('gestante','gestational_weeks','SBIm 2025','2025-01-01',null)
) as v(source, axis, version, effective_date, notes)
where not exists (select 1 from public.vaccine_schedules s where s.source = v.source and s.version = v.version);
```

**CHECKPOINT (blocking):** copy the seed-file header convention from `seed_guidance_templates.sql:1-5` ("CONTEÚDO CLÍNICO APROVADO PELO MÉDICO no checkpoint human-verify — o executor NÃO autora os textos"). The clinical values (SUS/PNI, SBIm, gestante dose-by-age) require a `checkpoint:human-verify` sign-off (STATE.md blocker). Do not commit clinical seed content without it.

---

### `modules/vaccines/get-vaccine-schedule-with-items.ts` (module, read query — DROP owner filter)

**Analog:** `modules/prescriptions/get-prescriptions-by-profile-id.ts`.

**Module shape to COPY** (`get-prescriptions-by-profile-id.ts:1-24`): `SupabaseClient` injected as first arg, typed return, `.from().select().order()`, error → `throw new Error("[DOMAIN] …")`:
```typescript
import type { SupabaseClient } from "@supabase/supabase-js"
import type { PrescriptionListItem } from "./types"

export async function getPrescriptionsByProfileId(
  supabase: SupabaseClient,
  profileId: string,
): Promise<PrescriptionListItem[]> {
  const { data, error } = await supabase
    .from("prescriptions")
    .select("id, profile_id, patient_id, payload, …")
    .eq("profile_id", profileId)          // ❌ DROP — vaccines have no profile_id (D-07)
    .order("issued_at", { ascending: false })
  if (error) throw new Error(`[PRESCRIPTIONS] Failed to fetch list: ${error.message}`)
  …
}
```

**DIVERGENCE (D-07 / Pitfall 1):** the new module takes `source: "SUS" | "SBIm" | "gestante"` (NOT a `profileId`), uses `.eq("source", source)`, joins items via nested select, and **omits `.eq("profile_id", …)` entirely**. Add an explicit comment so no one "fixes" the missing filter. Domain tag is `[VACCINES]`. Target shape (RESEARCH Pattern 4):
```typescript
// NOTE: NO .eq("profile_id") — GLOBAL reference data (D-07). Do not add an owner filter.
const { data, error } = await supabase
  .from("vaccine_schedules")
  .select("id, source, axis, version, effective_date, notes, vaccine_schedule_items(id, vaccine, dose, age_months, age_months_max, week_min, week_max, age_label, sort_order, notes)")
  .eq("source", source)
  .order("sort_order", { referencedTable: "vaccine_schedule_items", ascending: true })
  .maybeSingle()
if (error) throw new Error(`[VACCINES] Failed to fetch schedule ${source}: ${error.message}`)
return data  // null if unseeded → UI empty state
```
**Rule (CLAUDE.md):** one exported function per file; module receives `SupabaseClient` by injection; never import `next/cache`/`next/headers`.

---

### `modules/vaccines/types.ts` (model)

**Analog:** `modules/referrals/types.ts` — named exports, PascalCase types, one file for the domain's shapes. Define `VaccineSchedule`, `VaccineScheduleItem`, `VaccineAxis = "child_age" | "gestational_weeks"`, `VaccineSource = "SUS" | "SBIm" | "gestante"`. Mirror the DB column names in snake_case where they come straight off the row (as `PrescriptionListItem` does: `profile_id`, `issued_at`).

---

### `app/dashboard/vaccines/page.tsx` (route, RSC — auth + paid gate + reads + view)

**Analog:** `app/dashboard/referrals/page.tsx` (exact structural match — RSC that creates client, authenticates, reads via module, renders).

**Preamble to COPY** (`referrals/page.tsx:1-17`):
```typescript
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
// … module + component imports

export default async function ReferralsPage() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")
  const referrals = await getReferralsByProfileId(supabase, profile.id)
  return ( … )
}
```

**KEEP for vaccines (D-10 / Pitfall 3):** the `getAuthenticatedUser` + profile check preamble stays. RESEARCH notes the referrals page checks `profile?.id`; the `paid` gate (`profile.status === "paid"`) must ALSO be enforced here — RLS `to authenticated` does NOT enforce the subscription tier. Confirm the exact `paid`-gate expression against how sibling routes gate (some gate in the route, some via layout); apply the same `paid` check the other dashboard routes use.

**DIVERGENCE:** reads take a `source` string, not `profile.id` — call `getVaccineScheduleWithItems(supabase, "SUS")`, `(…, "SBIm")`, `(…, "gestante")` (three reads). Header block copies the icon + title + subtitle shape from `referrals/page.tsx:20-39` (use `Syringe`/`Calendar` lucide icon). Empty state mirrors the `Card border-dashed` defensive empty state (`referrals/page.tsx:43-62`) for the unseeded case (module returns `null`).

**Patient entry point (D-03/D-02):** a second render path passes the child's `birth_date` into `<VaccineCalendarView birthDate={…} />`. The patient-profile components live in `components/dashboard/patients/`; the age-highlight consumers already using the engine are `patient-detail-hero.tsx` and `growth/growth-chart.tsx` — follow their `computePediatricAge(...)` call convention.

---

### `components/dashboard/vaccines/vaccine-calendar-view.tsx` (component, client — tabs)

**Analog:** shadcn `components/ui/tabs` (Claude's Discretion — reuse existing primitive) + the layout idiom from `components/dashboard/patients/growth/growth-section.tsx`.

- Tabs: "Criança (SUS × SBIm)" | "Gestante" (D-04). Tab switching is client interaction → `"use client"`.
- Optional `birthDate?: string` prop. When present, compute the current-age highlight; when absent (standalone), no highlight (C4).
- Class composition via `cn()` from `lib/utils.ts` (project convention).

**Current-age highlight (D-02/D-11) — COPY the engine call, do NOT re-implement dates** (`lib/compute-pediatric-age.ts:149`):
```typescript
import { computePediatricAge } from "@/lib/compute-pediatric-age"
const age = computePediatricAge(birthDate, new Date(), gestationalAgeWeeks)
const currentMonths = age.status === "ok" ? Math.floor((age.totalDays ?? 0) / 30.4375) : null
// item is "current" when currentMonths ∈ [age_months, age_months_max ?? age_months]
```
Highlight is **position-only** — no diff/pendência (that is Phase 6). Pitfall 5: never `new Date("YYYY-MM-DD")`; the engine already does local-midnight parsing.

---

### `components/dashboard/vaccines/vaccine-column.tsx` + `gestante-list.tsx` (components, render)

**Analog:** shadcn `Card`/`Table` + referrals list card layout. Two parallel columns grouped by age band (D-01) — NOT a vaccine×age grid, NOT an accordion. Gestante = list by vaccine with text window (D-05), NOT grouped by trimester. Render `age_label`/`window_label` (the human text), keep structured months for the highlight only.

---

### `components/dashboard/vaccines/schedule-provenance.tsx` (component, render)

**Analog (concept):** `lib/growth-reference/index.ts:41-51` metadata shape (`source`/`version`/range visible in UI — Phase 3 D-03 precedent).

Render per-dataset footer/header: `"Fonte: {version} · vigência {effective_date}"` read from that dataset's own `vaccine_schedules` row (D-09) — NOT a single detached global banner. PLUS the fixed persistent advisory text: **"Confira sempre contra o calendário oficial atual"** (D-09). Format the `effective_date` with `date-fns` (already installed), PT-BR month (e.g. "jan/2025").

---

### `components/app-sidebar.tsx` (config, MODIFY — add nav entry)

**Analog:** self — the `navMain` "Serviços" group (`app-sidebar.tsx:65-78`). Add a `{ title: "Vacinas", url: "/dashboard/vaccines" }` entry alongside "Receitas"/"Encaminhamentos". The `isNavItemActive` fallback (`return pathname.startsWith(url)`) already handles the new route. Consider a `Syringe` lucide icon for the group if a new group is created; otherwise nest under "Serviços" or a new "Referência" group (planner/UI-SPEC decides).

## Shared Patterns

### Auth + Paid Gate (D-10)
**Source:** `app/dashboard/referrals/page.tsx:12-16` (`createClient` → `getAuthenticatedUser` → `if (!profile?.id) redirect(...)`), plus the `profile.status === "paid"` business gate used across dashboard routes.
**Apply to:** `app/dashboard/vaccines/page.tsx`.
```typescript
const supabase = await createClient()
const { profile } = await getAuthenticatedUser(supabase)
if (!profile?.id) redirect("/auth/login")
// + paid gate consistent with sibling routes
```
**Note:** RLS `to authenticated using(true)` covers *any* logged-in user; the `paid` gate is a separate app-layer rule that MUST stay (Pitfall 3).

### Module error handling
**Source:** `modules/prescriptions/get-prescriptions-by-profile-id.ts:20-24`.
**Apply to:** `modules/vaccines/get-vaccine-schedule-with-items.ts`.
```typescript
if (error) throw new Error(`[VACCINES] Failed to fetch schedule ${source}: ${error.message}`)
```
Domain-tagged throw in the module; the RSC/page shows the inline error/empty state (no result-union action layer here since there are no writes).

### RLS "enable + policies same file" rule
**Source:** `supabase/migrations/20260710000100_rls_referrals.sql:1-7`, echoed in `20260709000000_patient_measurements.sql:46`.
**Apply to:** the vaccine RLS migration — enable RLS and the SELECT policies together; apply table → rls → seed in order.

### Idempotent seed
**Source:** `supabase/migrations/20260710020600_seed_exam_catalog.sql:26-29` and `20260710030100_seed_guidance_templates.sql:63-65`.
**Apply to:** the vaccine seed — `insert … select … from (values …) where not exists`, but WITHOUT the per-profile `cross join public.profiles` (global insert, D-07).

### Provenance metadata shape
**Source:** `lib/growth-reference/index.ts:41-51` (`GrowthReferenceTable`).
**Apply to:** `vaccine_schedules` columns + `schedule-provenance.tsx` — replicate `source`/`version`/range provenance in DB columns and surface in the UI footer per dataset (D-08/D-09).

### Pure age engine reuse
**Source:** `lib/compute-pediatric-age.ts:149` (`computePediatricAge`), as consumed by `components/dashboard/patients/patient-detail-hero.tsx` and `growth/growth-chart.tsx`.
**Apply to:** `vaccine-calendar-view.tsx` current-age highlight only (D-02/D-11). Do not re-implement date math (Pitfall 5).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (the global-read RLS *policy body*) `…_rls_vaccine_schedules.sql` | migration (RLS) | reference-read | Every existing RLS policy in the repo is owner-scoped (`profile_id in (select … auth.uid())`). A `select to authenticated using(true)` SELECT-only policy with NO write policies is **first of its kind** in this repo (RESEARCH State of the Art). The *file structure* copies `rls_referrals.sql`; the *policy predicate* is the deliberate D-07 divergence with no existing analog — source is the Supabase RLS docs. |

Everything else has a repo analog (structure to copy) with the divergences explicitly annotated above.

## Metadata

**Analog search scope:** `supabase/migrations/`, `modules/{prescriptions,referrals}/`, `app/dashboard/referrals/`, `components/{app-sidebar,dashboard/patients}/`, `lib/{growth-reference,compute-pediatric-age}`.
**Files scanned:** ~14 (4 migrations, 1 read module, 1 types file, 1 RSC page, 1 sidebar, 2 lib files, growth components index).
**Pattern extraction date:** 2026-07-19
