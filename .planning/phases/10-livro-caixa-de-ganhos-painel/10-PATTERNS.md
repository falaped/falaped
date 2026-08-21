# Phase 10: Livro-caixa de Ganhos & Painel - Pattern Map

**Mapped:** 2026-08-21
**Files analyzed:** 38 (new/modified, from CONTEXT.md + RESEARCH.md § Recommended Project Structure + UI-SPEC.md § Surfaces In Scope)
**Analogs found:** 36 / 38 (2 genuinely greenfield)

> **Scope of this document.** RESEARCH.md already named a mould for most files. This map **verified
> every named path exists**, extracted the excerpt an executor needs, and filled the gaps. Two
> disagreements with RESEARCH.md are flagged inline (§ Disagreements) — both are cases where the
> UI-SPEC already overrode the research and the planner must follow the UI-SPEC.

---

## Mould Verification (all paths RESEARCH.md/orientation named)

| Path | Status | Lines |
|------|--------|-------|
| `supabase/migrations/20260710020400_exam_catalog_items.sql` | ✅ exists | 65 |
| `supabase/migrations/20260722200000_appointments.sql` | ✅ exists | 105 |
| `supabase/migrations/20260604000003_rls_cases.sql` | ✅ exists | 174 |
| `supabase/migrations/20260722100000_save_availability_rpc.sql` | ✅ exists | 101 |
| `supabase/migrations/20260720000500_patient_vaccine_doses.sql` | ✅ exists | 74 |
| `modules/cases/update-case-status.ts` | ✅ exists | 69 |
| `actions/cases/update-case-status.ts` | ✅ exists | 35 |
| `actions/cases/delete-case.ts` | ✅ exists | 28 |
| `components/dashboard/cases/case-detail-actions.tsx` | ✅ exists | 173 |
| `components/dashboard/cases/case-detail-header-toolbar.tsx` | ✅ exists | 46 |
| `components/dashboard/patients/growth/growth-chart.tsx` | ✅ exists (only recharts consumer) | 456 |
| `components/dashboard/patients/growth/measurement-form.tsx` | ✅ exists | — |
| `lib/brazilian-date-form.ts` | ✅ exists (+ `.spec.ts`) | 84 |
| `lib/formatters.ts` | ✅ exists → **APPEND** `formatCentsToBRL` | 162 |
| `lib/money.ts` | ❌ **ABSENT** → create (as UI-SPEC claims) | — |
| `components/ui/chart.tsx` | ❌ **ABSENT** → do NOT create (prohibition 8) | — |
| `components/segmented-toggle.tsx` | ❌ **ABSENT** → create (copy of `Segment`) | — |
| `modules/supabase/get-authenticated-user.ts` | ✅ exists — hardcoded `.select()` confirmed | 57 |
| `components/app-sidebar.tsx` | ✅ exists, `navMain` at line 37 | 167 |
| `components/dashboard/profile/profile-loading.tsx` | ✅ exists | 138 |
| `components/ui/dialog.tsx` / `components/ui/alert-dialog.tsx` | ✅ both exist | 128 / 199 |
| `lib/clinic-timezone.ts` | ✅ exists (one export) | 13 |
| `app/dashboard/agenda/page.tsx` | ✅ exists — `tz(CLINIC_TIME_ZONE)` at :42 | 163 |
| `lib/schemas/appointment.ts` | ✅ exists — pg-enum mirror mould | 67 |
| `modules/exam-catalog/` | ✅ **READ-ONLY confirmed** — only `get-exam-catalog-items.ts` + `types.ts`; no `actions/exam-catalog/` directory at all | — |
| Ownership test mould | ✅ `modules/patient-growth/delete-measurement.spec.ts` (89 lines, 4 tests) | — |

**Confirmed: there is NO per-profile catalog CRUD UI anywhere in the repo.** `actions/exam-catalog/`
does not exist. The S5 catalog editor is genuinely new interaction; only its *migration* has a mould.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `supabase/migrations/…_procedure_catalog_and_prices.sql` | migration | DDL | `20260710020400_exam_catalog_items.sql` | exact |
| `supabase/migrations/…_financial_entries.sql` | migration | DDL + enum + agg fn | `20260722200000_appointments.sql` (enum+RLS) + `20260722100000_save_availability_rpc.sql` (fn/grant) | exact (split) |
| `lib/money.ts` + `lib/money.spec.ts` | utility | transform | **none** — money is greenfield | **no analog** |
| `lib/formatters.ts` (APPEND `formatCentsToBRL`) | utility | transform | `formatLinkedPhone` in the same file | exact |
| `lib/schemas/financial-entry.ts` | config/schema | validation | `lib/schemas/appointment.ts` | exact |
| `lib/schemas/procedure-catalog-item.ts` | config/schema | validation | `lib/schemas/appointment.ts` | exact |
| `modules/financial-entries/create-financial-entries.ts` | model | CRUD (multi-row insert) | `modules/patient-growth/create-measurement.ts` | role-match |
| `modules/financial-entries/list-financial-entries.ts` | model | CRUD read | `modules/exam-catalog/get-exam-catalog-items.ts` | exact |
| `modules/financial-entries/get-earnings-summary.ts` | model | RPC read | `supabase.rpc` callers of `save_availability` | role-match |
| `modules/financial-entries/void-financial-entry.ts` | model | CRUD update | `modules/patient-growth/delete-measurement.ts` (ownership `.eq` chain) | exact |
| `modules/financial-entries/restore-financial-entry.ts` | model | CRUD update | same | exact |
| `modules/financial-entries/count-non-voided-entries-for-case.ts` | model | CRUD count | `modules/exam-catalog/get-exam-catalog-items.ts` shape + `head:true` | role-match |
| `modules/financial-entries/*.spec.ts` | test | — | `modules/patient-growth/delete-measurement.spec.ts` | exact |
| `modules/procedure-catalog/{list,create,update,delete}-*.ts` | model | CRUD | `modules/exam-catalog/get-exam-catalog-items.ts` (+ delete-measurement for the mutations) | exact |
| `actions/financial-entries/*.ts` | controller | request-response | `actions/patient-growth/create-measurement.ts` | exact |
| `actions/procedure-catalog/*.ts` | controller | request-response | same | exact |
| `actions/{financial-entries,procedure-catalog}/index.ts`, `actions/index.ts` | config | barrel | `actions/index.ts` tail (guidance block) | exact |
| `app/dashboard/earnings/page.tsx` | route (RSC) | request-response | `app/dashboard/agenda/page.tsx` (gate + `tz`) | exact |
| `app/dashboard/earnings/loading.tsx` | component | — | `components/dashboard/profile/profile-loading.tsx` | exact |
| `components/dashboard/earnings/earnings-cards.tsx` | component | — | `dashboard-home-content.tsx:247-300` metric cards | exact |
| `components/dashboard/earnings/earnings-daily-chart.tsx` | component | — | `growth-chart.tsx:329-370` | exact |
| `components/dashboard/earnings/earnings-table.tsx` | component | — | `components/ui/table.tsx` consumers | role-match |
| `components/dashboard/earnings/standalone-entry-dialog.tsx` | component | form | `measurement-form.tsx:185-275` (fields) + `components/ui/dialog.tsx` | exact |
| `components/dashboard/earnings/void-entry-button.tsx` | component | event-driven | `case-detail-actions.tsx:133-170` (AlertDialog) + `calendar-editor.tsx:991-1013` (undo toast) | exact |
| `components/dashboard/cases/close-case-with-earnings-dialog.tsx` | component | form | `case-detail-actions.tsx:74-101` (step 1 verbatim) + `measurement-form.tsx` (step 2 fields) | exact |
| `components/dashboard/cases/case-earnings-card.tsx` | component | — | `earnings-table.tsx` sibling / `Card` usage in `profile-content.tsx:267` | role-match |
| `components/dashboard/cases/case-detail-actions.tsx` (**edit**) | component | event-driven | itself (remove the close-case AlertDialog; edit the delete copy) | self |
| `components/dashboard/cases/case-detail-header-toolbar.tsx` (**edit**) | component | event-driven | itself (controlled Popover + sibling dialog) | self |
| `components/dashboard/profile/procedure-catalog-card.tsx` | component | CRUD | **none for the UI** — mould is only the migration | **no analog** |
| `app/dashboard/profile/profile-content.tsx` (**edit**) | component | form | its own `<Card>` at :267 / :549 | self |
| `app/dashboard/profile/page.tsx` (**edit**) | route (RSC) | request-response | itself :15-18 (`getReportTemplatesByProfileId`) | self |
| `components/app-sidebar.tsx` (**edit**) | component | — | itself, `navMain` :37-79 | self |
| `modules/supabase/get-authenticated-user.ts` (**edit**) | model | read | itself :38-40 | self |
| `modules/profiles/types.ts`, `modules/profiles/update-profile.ts`, `lib/schemas/profile.ts`, `actions/profile/update-profile.ts` (**edits**) | model/schema/controller | CRUD | themselves | self |
| `components/segmented-toggle.tsx` | component | — | `availability-panel.tsx:97-121` (`Segment`) | exact |

---

## Pattern Assignments

### `supabase/migrations/…_procedure_catalog_and_prices.sql` (migration, DDL)

**Analog:** `supabase/migrations/20260710020400_exam_catalog_items.sql` — copy the whole
7-block shape in ONE file: table → index → `comment on table` → `set_updated_at_*` fn → trigger →
`enable row level security` → 4 policies.

```sql
-- lines 3-11
create table public.exam_catalog_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_exam_catalog_items_profile_id on public.exam_catalog_items (profile_id);
```

```sql
-- lines 15-26 — the updated_at trigger, named per table (do NOT reuse another table's fn)
create or replace function public.set_updated_at_exam_catalog_items()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_exam_catalog_items_set_updated_at
  before update on public.exam_catalog_items
  for each row
  execute function public.set_updated_at_exam_catalog_items();
```

```sql
-- lines 28-44 — the owner-scoped policy predicate, repeated verbatim in all 4 policies
alter table public.exam_catalog_items enable row level security;

create policy "Exam catalog items select own"
on public.exam_catalog_items for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);
-- insert own → with check (same predicate)
-- update own → using (same) + with check (same)   [lines 46-57]
-- delete own → using (same)                        [lines 59-65]
```

Deltas for this phase: add `price_cents integer not null`, `check (price_cents >= 0)`,
`check (btrim(name) <> '')`; plus the `profiles.consultation_price_cents` `alter table … add column
if not exists` + non-negative check + `comment on column` (mould:
`20260316020000_profiles_add_default_location_state_and_city.sql`).

---

### `supabase/migrations/…_financial_entries.sql` (migration, DDL + enum + aggregation fn)

**Analog A — the enum + owner-scoped table:** `20260722200000_appointments.sql`

```sql
-- lines 17-30 — enum with English values, PT-BR labels left to the UI, + comment on type
create type public.appointment_status as enum (
  'pending',    -- solicitada (pedido a confirmar) — segura o horário
  'confirmed',  -- confirmada — segura o horário
  'done',       -- realizada — final, NÃO segura
  'no_show',    -- falta — final, NÃO segura, distinta de cancelada
  'canceled'    -- cancelada / recusada — final, NÃO segura, libera o horário
);

comment on type public.appointment_status is
  'Ciclo da consulta (APPT-02): … Valores em inglês … rótulos PT-BR vivem no badge da UI — mesma convenção de patient_sex.';
```

```sql
-- lines 36-46 — owner-scoped table; note the explicit FK-behaviour justification comment
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  status public.appointment_status not null default 'pending',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_ends_after_starts check (ends_at > starts_at),
```

> Copy the *habit* of a prose comment stating WHY each FK behaviour was chosen. D-26 picks
> `case_id … on delete cascade` **against** this file's own precedent (which chose `restrict`
> explicitly "para preservar o histórico … que a Fase 10 (ganhos -> consulta FK) vai referenciar").
> That contradiction must be written into the migration comment, not left implicit.

**Analog B — the SQL function + grant (for `get_earnings_summary`):** `20260722100000_save_availability_rpc.sql`

```sql
-- lines 31-40 — the function header: security invoker + empty search_path
create or replace function public.save_availability(
  p_profile_id uuid, p_rules jsonb, p_overrides_add jsonb, p_overrides_remove uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Owner-check (D-13): o perfil alvo tem de pertencer ao usuário autenticado.
  if not exists (
```

```sql
-- tail — comment + revoke/grant. MANDATORY for the new aggregation fn too.
comment on function public.save_availability(uuid, jsonb, jsonb, uuid[]) is '…';
revoke all on function public.save_availability(uuid, jsonb, jsonb, uuid[]) from public;
grant execute on function public.save_availability(uuid, jsonb, jsonb, uuid[]) to authenticated;
```

Reuse: `security invoker` + `set search_path = ''` + fully-qualified names + explicit owner-check +
`comment on function` + `revoke/grant`. Do **not** reuse the RPC-for-atomicity rationale — RESEARCH
Achado 6 concluded the multi-row insert needs no RPC (a single `insert` statement is already atomic).

**Analog C — the RLS anchor, and the asymmetry that matters:** `20260604000003_rls_cases.sql`

```sql
-- lines 20-32 — cases uses a DUAL anchor
create policy "Cases select own"
on public.cases for select to authenticated
using (
  profile_id in (select id from public.profiles where auth_user_id = auth.uid())
  or user_phone in (
    select au.phone from public.authenticated_users au
    where au.profile_id in (select id from public.profiles where auth_user_id = auth.uid())
  )
);
```

Header comment, lines 4-11, explains why: *"profile_id is reliable TODAY … future WhatsApp-origin
cases may carry user_phone without profile_id => dual anchor … no security definer helper needed."*

**What the asymmetry means for `financial_entries` (the executor MUST internalise this):**

| | `cases` | `financial_entries` (new) |
|---|---|---|
| `profile_id` | **nullable** | **not null**, stamped server-side |
| RLS anchor | dual (`profile_id` OR `user_phone`) | **single `profile_id`** (Achado 1) |
| Consequence | a row can be reachable by phone with a NULL `profile_id` | a WhatsApp-origin case **can still be billed** — the entry carries the reader's own `profile_id` regardless of what `cases.profile_id` holds |
| Ownership of the referenced case | enforced by `cases` RLS on the display join | **enforced in the action**, by the phone-resolution below — NOT by the entries policy |

Because the entries policy never looks at `cases`, the `case_id` arriving from the client is an
**IDOR surface the policy does not cover**. The action must validate case ownership using the exact
resolution `modules/cases/update-case-status.ts` already uses (next section). Single anchor is
correct and simpler — but only if that action-level check exists.

---

### `modules/financial-entries/*.ts` (model, CRUD)

**Analog for a read:** `modules/exam-catalog/get-exam-catalog-items.ts` (full file, 23 lines)

```ts
import type { SupabaseClient } from "@supabase/supabase-js"
import type { ExamCatalogItem } from "./types"

/**
 * Returns the searchable exam catalog items for a profile (D-01), ordered by name.
 * Per-profile reference data — scoped by profile_id.
 */
export async function getExamCatalogItems(
  supabase: SupabaseClient,
  profileId: string,
): Promise<ExamCatalogItem[]> {
  const { data, error } = await supabase
    .from("exam_catalog_items")
    .select("id, name")
    .eq("profile_id", profileId)
    .order("name", { ascending: true })

  if (error) {
    throw new Error(`[EXAM_CATALOG] Failed to list items: ${error.message}`)
  }

  return (data ?? []) as ExamCatalogItem[]
}
```

Copy exactly: injected client as arg 1, `profileId` as arg 2, JSDoc, `[DOMAIN]` throw (`[EARNINGS]`
/ `[PROCEDURE_CATALOG]`), `(data ?? []) as T[]`. Add `.is("voided_at", null)` unless
`includeVoided` (D-21 default-safe).

**Analog for an ownership-scoped mutation:** `modules/patient-growth/delete-measurement.ts` (full file)

```ts
/**
 * Deletes a measurement by id, ONLY if it belongs to the given profile_id
 * (doctor) AND patient_id. This triple scope is the ownership backstop against
 * the documented IDOR bug … NEVER `.delete().eq("id")` alone …
 */
export async function deleteMeasurement(
  supabase: SupabaseClient, id: string, profileId: string, patientId: string,
): Promise<void> {
  const { error } = await supabase
    .from("patient_measurements")
    .delete()
    .eq("id", id)
    .eq("profile_id", profileId)
    .eq("patient_id", patientId)

  if (error)
    throw new Error(`[GROWTH] Failed to delete measurement: ${error.message}`)
}
```

`void-financial-entry.ts` / `restore-financial-entry.ts` are the same shape with
`.update({ voided_at: … })` instead of `.delete()` and `.eq("id").eq("profile_id")`.

**Case-ownership resolution the action must reuse:** `modules/cases/update-case-status.ts:14-32`

```ts
const { data: auRow, error: auError } = await supabase
  .from("authenticated_users").select("phone").eq("profile_id", profileId).maybeSingle()
if (auError) throw new Error(`[CASES] Failed to resolve phone: ${auError.message}`)
const userPhone = auRow?.phone ?? null
if (!userPhone) throw new Error("[CASES] No phone linked to profile.")

const { data: caseRow, error: caseError } = await supabase
  .from("cases").select("id").eq("id", caseId).eq("user_phone", userPhone).maybeSingle()
if (caseError) throw new Error(`[CASES] Failed to fetch case: ${caseError.message}`)
if (!caseRow) throw new Error("[CASES] Case not found or does not belong to profile.")
```

**Note (D-10 rationale, verified at lines 47-58):** reopening resets the timer —
`started_at: new Date().toISOString()`, `consultation_paused_ms: 0`, `consultation_paused_at: null`.
Reopen→reclose is a normal product cycle, so the re-closing guard is required. `update-case-status.ts`
gets **zero** changes.

---

### `modules/financial-entries/*.spec.ts` (test — SC-4 ownership)

**Analog:** `modules/patient-growth/delete-measurement.spec.ts` (89 lines). Copy the recording mock
verbatim; swap table name, columns and function.

```ts
import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"
import { deleteMeasurement } from "@/modules/patient-growth/delete-measurement"

const PROFILE_ID = "11111111-1111-1111-1111-111111111111"
type EqCall = { column: string; value: unknown }

function buildSupabaseMock() {
  const deleteEqCalls: EqCall[] = []
  const client = {
    from(table: string) {
      let mode: "delete" | null = null
      const builder = {
        delete() { mode = "delete"; return builder },
        eq(column: string, value: unknown) {
          if (table === "patient_measurements" && mode === "delete")
            deleteEqCalls.push({ column, value })
          return builder
        },
        then(resolve: (r: { data: unknown; error: null }) => void) {
          resolve({ data: null, error: null })
        },
      }
      return builder
    },
  } as unknown as SupabaseClient
  return { client, deleteEqCalls }
}

test("deleteMeasurement scopes the delete by profile_id (IDOR guard)", async () => {
  const { client, deleteEqCalls } = buildSupabaseMock()
  await deleteMeasurement(client, MEASUREMENT_ID, PROFILE_ID, PATIENT_ID)
  assert.ok(
    deleteEqCalls.some((c) => c.column === "profile_id" && c.value === PROFILE_ID),
    "delete must be scoped by .eq('profile_id', profileId) — never id alone",
  )
})
```

Runner: `yarn test` → `tsx --test`. No framework, no fixtures. One `assert` per invariant.

---

### `actions/financial-entries/*.ts` and `actions/procedure-catalog/*.ts` (controller, request-response)

**Analog:** `actions/patient-growth/create-measurement.ts` (full file, 66 lines) — the canonical
gate → safeParse → module → revalidate → result-union order.

```ts
"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createMeasurementSchema, type CreateMeasurementFormData } from "@/lib/schemas/patient-measurement"
import { createMeasurement } from "@/modules/patient-growth/create-measurement"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type CreateMeasurementResult =
  | { ok: true; measurementId: string }
  | { ok: false; error: string }

/** Records an anthropometric measurement for a patient owned by the current user.
 * Gated by the paid subscription; scoped to profile_id + patient_id server-side. */
export async function createMeasurementAction(
  data: CreateMeasurementFormData,
): Promise<CreateMeasurementResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  const parsed = createMeasurementSchema.safeParse(data)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dados inválidos."
    return { ok: false, error: msg }
  }

  try {
    const measurement = await createMeasurement(supabase, profile.id, parsed.data.patientId, { … })
    revalidatePath(`/dashboard/patients/${parsed.data.patientId}`)
    return { ok: true, measurementId: measurement.id }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao registrar medição. Tente novamente."
    return { ok: false, error: message }
  }
}
```

Note lines 17-25: the **unit conversion lives in the action**, not the module
(`kgToGrams`/`cmToMm`). That is the precedent for `parseBrlToCents` being applied at the action
boundary — the module receives integer cents only.

**Barrel:** `actions/index.ts` re-exports each fn **and** its `…Result` type, one `export { … } from
"./domain"` block per domain (tail of file shows the guidance block). Add two blocks.

---

### `app/dashboard/earnings/page.tsx` (route, RSC)

**Analog:** `app/dashboard/agenda/page.tsx:33-42`

```ts
const supabase = await createClient()
const { profile } = await getAuthenticatedUser(supabase)
if (!profile?.id) redirect("/auth/login")
// …
if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")
// …
const context = { in: tz(CLINIC_TIME_ZONE) }
```

The RSC gate mirrors the action gate (`profile.status !== "paid"` → redirect, not a result union).
`tz()` comes from `@date-fns/tz`; `CLINIC_TIME_ZONE` from `lib/clinic-timezone.ts` (single export,
`"America/Sao_Paulo"`, whose own docblock already says *"futuramente, buckets de ganhos (Phase 10)"*).
Derive "today" and the default month here and pass them down as props — never `new Date()` in a
client component (Pitfall 4 / prohibition 11).

`app/dashboard/profile/page.tsx:15-18` is the mould for adding the catalog load:

```ts
const reportTemplateOptions = await getReportTemplatesByProfileId(supabase, profile.id)
```

---

### `app/dashboard/earnings/loading.tsx` (component)

**Analog:** `components/dashboard/profile/profile-loading.tsx:1-20`

```tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function ProfileLoading() {
  return (
    <div className="flex flex-col gap-8 max-w-4xl w-full">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="mt-1 h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-9 w-full" />
```

Mirror the two bands: 3 bare card skeletons + one framed block.

---

### `components/dashboard/earnings/earnings-daily-chart.tsx` (component)

**Analog:** `components/dashboard/patients/growth/growth-chart.tsx` — the repo's **only** recharts
consumer.

```tsx
// lines 1-13
"use client"

import { useMemo, useState } from "react"
import {
  CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis,
} from "recharts"
```

```tsx
// lines 329-348 — wrapper, container, grid, axes, tooltip
<div className="rounded-xl border border-border bg-card p-4">
  <ResponsiveContainer width="100%" height={360}>
    <ComposedChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
      <XAxis type="number" dataKey="ageMonths" domain={[ageMin, ageMax]} tick={{ fontSize: 11 }} … />
      <YAxis type="number" tick={{ fontSize: 11 }} width={44} … />
      <Tooltip
        formatter={(value) => Number(value).toFixed(2).replace(".", ",")}
        labelFormatter={(label) => `${Math.round(Number(label))} meses`}
      />
```

```tsx
// lines 360-370 — token colours via var(), animation off
      <Scatter data={patientPoints} dataKey="value" fill="var(--primary)" isAnimationActive={false} />
    </ComposedChart>
  </ResponsiveContainer>
```

Reuse: `"use client"`, named recharts imports (no `components/ui/chart.tsx`), `width="100%"` +
**numeric** `height`, `className="stroke-border"` on the grid, `tick={{ fontSize: 11 }}`,
`fill="var(--primary)"`, `isAnimationActive={false}`.
Deltas per UI-SPEC: `BarChart` + one `<Bar dataKey="cents">`, `height={240}`, `YAxis width={88}`,
`tickFormatter`/`formatter` = `formatCentsToBRL` (drop the manual `.replace(".", ",")` — `Intl`
handles it), and a plain `div className="px-4 py-4 border-b border-border"` instead of the
`rounded-xl border … bg-card p-4` wrapper, because it sits inside Band B's Card.

---

### Currency + date fields (S2, S3, S5)

**Analog:** `components/dashboard/patients/growth/measurement-form.tsx`

```tsx
// lines 222-236 — the decimal-text money/decimal field
<Field className="w-full min-w-0">
  <FieldLabel htmlFor="measurement-weight">Peso (kg)</FieldLabel>
  <FieldContent>
    <Input
      id="measurement-weight"
      type="text"
      inputMode="decimal"
      placeholder="ex.: 12,4"
      className="tabular-nums"
      {...form.register("weight")}
    />
    <FieldError errors={errors.weight ? [errors.weight] : undefined} />
  </FieldContent>
</Field>
```

```tsx
// lines 190-220 — the masked dd/mm/aaaa field (Controller, not register)
<Field className="w-full min-w-0">
  <FieldLabel htmlFor="measurement-date">Data da medição</FieldLabel>
  <FieldContent>
    <Controller
      name="measured_on"
      control={looseForm.control}
      render={({ field }) => (
        <Input
          id="measurement-date"
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/aaaa"
          className="min-w-0 w-full font-mono text-sm tabular-nums"
          aria-describedby="measurement-date-hint"
          name={field.name}
          ref={field.ref}
          onBlur={field.onBlur}
          value={typeof field.value === "string" ? field.value : ""}
          onChange={(e) => field.onChange(maskBrazilianDateInput(e.target.value))}
        />
      )}
    />
    <p id="measurement-date-hint" className="text-xs text-muted-foreground">
      Formato: dd/mm/aaaa
    </p>
    <FieldError errors={errors.measured_on ? [errors.measured_on] : undefined} />
  </FieldContent>
</Field>
```

`lib/brazilian-date-form.ts` exports, verified: `isCompleteBrazilianDateString`,
`isCompleteBirthDateInputString`, `parseBirthDateFormValueToIso`,
`parseBrazilianDateStringToIso` (returns null on `31/02`), `maskBrazilianDateInput`. Use
`maskBrazilianDateInput` in the client and `parseBrazilianDateStringToIso` at the action boundary.
`lib/brazilian-date-form.spec.ts` is the test mould for `lib/money.spec.ts`.

---

### `lib/formatters.ts` (APPEND `formatCentsToBRL`)

**Analog:** the last function in the same file — one JSDoc line, `export function`, pure string
work, no class, no config object.

```ts
/**
 * Formats a full Brazilian number (with optional country code 55) for display.
 * Example: "553197815503" → "+55 (31) 9781-5503"
 */
export function formatLinkedPhone(digits: string): string { … }
```

Append at the bottom; module-scope `const BRL = new Intl.NumberFormat(…)` above the function
(constructed once, not per call). **Do not create `lib/currency.ts`.**

`lib/money.ts` (`parseBrlToCents`) has **no analog** — money is greenfield in this repo. Its only
constraints come from the UI-SPEC currency contract, and it is the one file that MUST ship a spec.

---

### `lib/schemas/financial-entry.ts`, `lib/schemas/procedure-catalog-item.ts`

**Analog:** `lib/schemas/appointment.ts:1-29`

```ts
import { z } from "zod"

/**
 * Schemas de validação de consultas (APPT-01..04, Fase 7). Validação no boundary
 * (actions) via safeParse; mensagens PT-BR inline alimentam zodErrorToUserMessage.
 * … O .refine garante ends_at > starts_at, espelhando o CHECK constraint do banco.
 */

/** Os 5 valores do ciclo de status, espelhando o pg enum appointment_status. */
export const appointmentStatusSchema = z.enum([
  "pending", "confirmed", "done", "no_show", "canceled",
])
export type AppointmentStatusInput = z.infer<typeof appointmentStatusSchema>

/** Os 4 valores do tipo de consulta, espelhando o pg enum appointment_type. */
export const appointmentTypeSchema = z.enum(
  ["puericultura", "urgencia", "retorno", "primeira_consulta"],
  { message: "Tipo de consulta inválido." },
)
export type AppointmentTypeInput = z.infer<typeof appointmentTypeSchema>
```

Copy: PT-BR docblock naming the boundary, `z.enum` mirroring the pg enum with an inline PT-BR
`{ message }`, exported `z.infer` type, and a comment stating that `profile_id` is stamped
server-side and never comes from the client.

---

### `components/segmented-toggle.tsx` (new — copy of `Segment`)

**Analog:** `components/dashboard/agenda/availability-panel.tsx:97-121` (the whole helper, verbatim)

```tsx
/** Botão segmentado (aria-pressed) — token oklch, sem deps novas. */
function Segment({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-foreground/40",
      )}
    >
      {children}
    </button>
  )
}
```

`py-1.5` (6px) is inherited — do not round (UI-SPEC spacing exception). Do **not** re-point
`availability-panel.tsx` at the new module.

---

### `components/dashboard/earnings/void-entry-button.tsx` (S1 + S4 shared)

**Analog A — undo toast:** `components/dashboard/agenda/calendar-editor.tsx:991-1013`

```tsx
const result = await persistDraft(next)
if (result.ok) {
  toast.success("Disponibilidade atualizada.", {
    action: {
      label: "Desfazer",
      onClick: async () => {
        const undoResult = await persistDraft(before)
        if (undoResult.ok) {
          toast.success("Mudança desfeita.")
        } else {
          setDraft(next)
          toast.error(undoResult.error)
        }
      },
    },
  })
} else {
  setDraft(before)
  toast.error(result.error)
}
```

**Verified:** no `duration` is passed here — the agenda runs on sonner's default. The UI-SPEC's
`duration: 8000` is a declared deviation, not repo precedent.

**Analog B — the destructive AlertDialog with a pending Button in the footer:**
`case-detail-actions.tsx:148-170`

```tsx
<AlertDialogContent>
  <AlertDialogHeader>
    <AlertDialogTitle>Excluir caso?</AlertDialogTitle>
    <AlertDialogDescription>
      Esta ação não pode ser desfeita. As mensagens do caso serão removidas.
    </AlertDialogDescription>
  </AlertDialogHeader>
  {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
  <AlertDialogFooter>
    <AlertDialogCancel disabled={isPendingDelete}>Cancelar</AlertDialogCancel>
    <Button variant="destructive" disabled={isPendingDelete} onClick={handleDeleteCase}>
      {isPendingDelete ? "Excluindo…" : "Excluir"}
    </Button>
  </AlertDialogFooter>
</AlertDialogContent>
```

Note the pattern: when the confirm needs `variant="destructive"` + a pending label, the repo uses a
plain `<Button>` in the footer, **not** `AlertDialogAction`. Copy that for "Anular".

---

### The S3 hoist — `case-detail-header-toolbar.tsx` + `case-detail-actions.tsx` (edits)

**Confirmed contained edit:** `CaseDetailActions` has exactly **one** consumer —
`case-detail-header-toolbar.tsx:41`. `CaseDetailHeaderToolbar` has exactly one consumer —
`case-detail-header.tsx:128` (`<CaseDetailHeaderToolbar caseId={detail.id} status={detail.status} />`),
so any new prop (`hasEarnings`, `earningsCount`, `earningsTotalCents`) must be threaded there too.

**Current toolbar (full file, 46 lines) — the uncontrolled `Popover` to convert:**

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button type="button" variant="outline" className="gap-2" aria-label="Ações do caso">
      <MoreHorizontal className="h-4 w-4" aria-hidden />
      Ações
    </Button>
  </PopoverTrigger>
  <PopoverContent align="end" className="w-64 p-2">
    <CaseDetailActions caseId={caseId} status={status} layout="menu" />
  </PopoverContent>
</Popover>
```

Add `const [actionsOpen, setActionsOpen] = useState(false)` → `<Popover open={actionsOpen}
onOpenChange={setActionsOpen}>`, plus `closeFlowOpen` state, and render
`<CloseCaseWithEarningsDialog … />` as a **sibling** of `<Popover>` inside the existing
`<div className="flex shrink-0 flex-wrap items-center gap-2">`. The file currently has no
`useState` import — it will need one.

**Current close-case block to remove from `case-detail-actions.tsx:74-101`:**

```tsx
{status === "active" ? (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="outline" size="sm"
        className={cn("gap-2", menu && "w-full justify-start")}
        disabled={isPendingStatus}>
        <LockIcon className="h-4 w-4" />
        Encerrar caso
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Encerrar caso?</AlertDialogTitle>
        <AlertDialogDescription>
          O caso será marcado como encerrado. Você poderá reabri-lo depois.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction onClick={handleCloseCase}>Encerrar</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
) : ( … reopen dialog, lines 103-130, UNCHANGED … )}
```

`AlertDialogContent`/`Header`/`Title`/`Description`/`Footer`/`Cancel`/`Action` markup and the copy
move **verbatim** into step 1 of `close-case-with-earnings-dialog.tsx`. The button left behind keeps
`variant="outline" size="sm" className={cn("gap-2", menu && "w-full justify-start")}` + `LockIcon`
and calls `onRequestCloseCase()`. Also drop the now-unused `AlertDialogTrigger`/`handleCloseCase`
from this file, and delete `AlertDialogAction` from the import list only if the reopen dialog stops
using it (it does not — keep it).

Reopen (103-130) and delete (133-170) blocks: **untouched structurally**; only the delete
description/confirm-label change (S7).

---

### `components/app-sidebar.tsx` (edit — S6)

**Analog:** itself, `navMain` at lines 37-79.

```ts
const navMain = [
  { title: "Principal", icon: HomeIcon, isActive: true,
    items: [{ title: "Início", url: "/dashboard" }] },
  { title: "Atendimentos", icon: MessagesSquareIcon, isActive: false,
    items: [
      { title: "Casos", url: "/dashboard/cases" },
      { title: "Discussões", url: "/dashboard/discussions" },
      { title: "Pacientes", url: "/dashboard/patients" },
    ] },
  { title: "Templates", … },
  { title: "Serviços", icon: FileCheckIcon, isActive: false, items: [ …8 items… ] },
]
```

Current lucide imports (lines 7-13): `ChevronRightIcon, FileCheckIcon, HomeIcon,
LayoutTemplateIcon, MessagesSquareIcon` — add `WalletIcon`, and **do not** re-add `CalendarIcon`
(removed in `4475d4d`). Append one group after "Serviços".

---

### `app/dashboard/profile/profile-content.tsx` (edit — S5)

**Analog:** the file's own `<Card>` sequence — verified boundaries:
`Informações do perfil` `<Card>` at **:267** (`CardTitle` :271, `CardDescription` :273,
`CardContent` :277) · `Logos` at **:549** · `Aparência` at **:677** · `Plano` at **:731** ·
danger zone `<Card className="border-destructive/50 bg-destructive/5">` at **:777**.

Insert the new "Preços" `<Card>` between :548 and :549, using the same
`<Card><CardHeader><CardTitle/><CardDescription/></CardHeader><CardContent/></Card>` shape.
The danger-zone card at :777 is also the token precedent for the S7 destructive block
(`border-destructive/50 bg-destructive/5`).

---

### `modules/supabase/get-authenticated-user.ts` (edit — the landmine)

**Verified hardcoded select, lines 36-42.** Exact current string:

```ts
const { data: profileData, error: profileError } = await supabase
  .from("profiles")
  .select(
    "id, auth_user_id, phone, first_name, surname, email, crm, rqe, logo_url_full, logo_url_short, social_media_handle, website, report_template_id, default_location_state, default_location_city, authenticated_users(id, phone, status, profile_id, whatsapp_linked_at, linked_phone_status)"
  )
  .eq("auth_user_id", user.id)
  .maybeSingle();
```

`consultation_price_cents` must be added to this string (suggested: after
`default_location_city`) **or the RSC silently reads `undefined`** and the closing dialog opens with
an empty field forever, with no error anywhere. Confirmed second-order fact: this file's `Profile`
type comes from `modules/profiles/types.ts`, so the type edit and the select edit are two separate
places. Note also `if (!profile)` never fires — the function returns `{} as AuthenticatedUserProfile`
on failure (lines 34, 46), so gates rely on `profile.status !== "paid"` / `!profile?.id`.

This file uses **semicolons**; most of the phase's analogs (`actions/*`, `modules/cases/*`,
`lib/clinic-timezone.ts`) do **not**. Match the file being edited (CLAUDE.md § Formatting).

---

## Shared Patterns

### Auth + paid gate (every new action)
**Source:** `actions/cases/update-case-status.ts:16-20` — **Apply to:** all 9 new actions.
```ts
const supabase = await createClient()
const { profile } = await getAuthenticatedUser(supabase)
if (!profile) return { ok: false, error: "Sessão não encontrada." }
if (profile.status !== "paid")
  return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }
```
**Exception, verified:** `actions/profile/update-profile.ts` has **no** `paid` gate by design
(Perfil is where an unpaid user finishes onboarding). Do not add one while wiring
`consultation_price_cents` through it.

### Error handling (module → action)
**Source:** `modules/exam-catalog/get-exam-catalog-items.ts:19` + `actions/cases/delete-case.ts:23-26`
— **Apply to:** all new modules and actions.
```ts
// module
throw new Error(`[EARNINGS] Failed to create entries: ${error.message}`)
// action
} catch (e) {
  const message = e instanceof Error ? e.message : "Erro ao excluir caso. Tente novamente."
  return { ok: false, error: message }
}
```

### Validation
**Source:** `actions/patient-growth/create-measurement.ts:41-45` — **Apply to:** every new action
that takes client input.
```ts
const parsed = createMeasurementSchema.safeParse(data)
if (!parsed.success) {
  const msg = parsed.error.issues[0]?.message ?? "Dados inválidos."
  return { ok: false, error: msg }
}
```

### `revalidatePath` + `router.refresh()`
**Source:** `actions/cases/update-case-status.ts:24-28` (multiple targets, with a comment explaining
the `cacheComponents` reason for the third) — **Apply to:** all new mutating actions, per the
RESEARCH revalidate table. Every client call site follows with `router.refresh()`
(prohibition 12).

### Owner-scoped mutation (IDOR backstop)
**Source:** `modules/patient-growth/delete-measurement.ts` — **Apply to:** void, restore, and all 3
catalog mutations. Never `.eq("id")` alone.

### Clinic timezone
**Source:** `lib/clinic-timezone.ts` + `app/dashboard/agenda/page.tsx:42` — **Apply to:** the
earnings RSC and every default date. Never `new Date()` in a client component, never
`toISOString().slice(0,10)`.

---

## Disagreements With the Named Moulds

1. **RESEARCH Achado 7 says the closing dialog is rendered by `CaseDetailActions` and that
   `case-detail-header-toolbar.tsx` needs "Nenhuma" change.** That is wrong on the code as written:
   `PopoverContent` (toolbar :40) unmounts when the popover closes, taking any dialog rendered by
   its child with it — and with it the typed amounts. The UI-SPEC's hoist (state moves to the
   toolbar, dialog becomes a sibling of `<Popover>`) is the correct reading. **Follow the UI-SPEC.**
   Both consumers are single-call-site (verified by grep), so the hoist is contained.
2. **RESEARCH Achado 9 recommends a `Select` with placeholder for payment method.** The UI-SPEC
   overrides this with the `Segment` group (avoids a third portal level inside dialog-inside-popover
   and halves the clicks). **Follow the UI-SPEC**; the `Segment` mould is verified at
   `availability-panel.tsx:97-121`.
3. **CONTEXT D-04 calls `exam_catalog_items` the "molde exato" for the catalog.** True for the
   *migration* only. Verified: `modules/exam-catalog/` has just `get-exam-catalog-items.ts` +
   `types.ts`, and `actions/exam-catalog/` **does not exist** — there is no CRUD action, no CRUD UI,
   nowhere in the repo, for any per-profile catalog. The S5 editor is genuinely new interaction and
   should be estimated as such.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `lib/money.ts` + `lib/money.spec.ts` | utility | transform | Money is greenfield — zero `R$` formatting and zero monetary input in the repo. Only the field *shape* has a precedent (`measurement-form.tsx`); the parse logic has none. Ship the spec (money path). |
| `components/dashboard/profile/procedure-catalog-card.tsx` | component | CRUD | No per-profile catalog CRUD UI exists (see Disagreement 3). Nearest structural relatives: `profile-content.tsx` Card shape + the `AlertDialog` from `case-detail-actions.tsx:133-170`; the row/edit/add interaction itself is authored fresh from the UI-SPEC. |
| `get_earnings_summary` aggregation body | migration | transform | No migration in the repo uses `date_trunc` or `AT TIME ZONE` today. The function *envelope* (`security invoker`, `set search_path = ''`, comment, revoke/grant) is copied from `save_availability`; the body is new. Storing `received_on` as `date` (RESEARCH Achado 3) removes the timezone conversion entirely. |

---

## Metadata

**Analog search scope:** `supabase/migrations/`, `modules/`, `actions/`, `lib/`, `app/dashboard/`,
`components/` (dashboard + ui)
**Files read this session:** 26 (all single-pass; large files via targeted `sed -n` ranges)
**Absences verified:** `lib/money.ts`, `components/ui/chart.tsx`, `components/segmented-toggle.tsx`,
`actions/exam-catalog/`
**Pattern extraction date:** 2026-08-21
