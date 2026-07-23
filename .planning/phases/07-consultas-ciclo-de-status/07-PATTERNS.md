# Phase 7: Consultas & Ciclo de Status - Pattern Map

**Mapped:** 2026-07-22
**Files analyzed:** 15 (new/modified)
**Analogs found:** 14 / 15 (1 greenfield: btree_gist exclusion constraint)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/YYYYMMDDHHMMSS_appointments.sql` | migration | — (DDL) | `supabase/migrations/20260720000500_patient_vaccine_doses.sql` (table+RLS+policies) + `20260314000000_medical_certificates.sql` (enum) | role-match (exclusion constraint = greenfield) |
| `modules/appointments/types.ts` | model | — | `modules/availability/types.ts` | exact |
| `modules/appointments/create-appointment.ts` | service (module) | CRUD (insert) | `modules/availability/create-availability-override.ts` | exact |
| `modules/appointments/list-appointments-by-profile-id.ts` | service (module) | CRUD (window select) | `modules/availability/list-availability-overrides.ts` | exact |
| `modules/appointments/update-appointment-status.ts` | service (module) | CRUD (compare-and-set update) | `modules/availability/delete-availability-override.ts` (double-scoped) + `modules/availability/create-availability-override.ts` | role-match |
| `modules/appointments/appointment-transitions.ts` | utility | transform (pure) | `modules/patients/patient-sex.ts` (pure domain helper + spec) | role-match |
| `lib/schemas/appointment.ts` | config (schema) | validation | `lib/schemas/availability.ts` | exact |
| `actions/appointments/create-appointment.ts` | controller (action) | request-response | `actions/availability/save-availability.ts` | exact (+ 23P01 branch: greenfield) |
| `actions/appointments/update-appointment-status.ts` | controller (action) | request-response | `actions/availability/save-availability.ts` | exact |
| `actions/appointments/index.ts` | config (barrel) | — | `actions/availability/index.ts` | exact |
| `actions/index.ts` (modified) | config (barrel) | — | `actions/index.ts` (existing block per domain) | exact |
| `components/dashboard/agenda/appointment-create-dialog.tsx` | component | request-response (form + search) | `components/ui/dialog.tsx` + `components/ui/command.tsx` + `availability-cell-menu.tsx` (state/anchor patterns) | role-match |
| `components/dashboard/agenda/pending-requests-panel.tsx` | component | event-driven (list + actions) | `availability-cell-menu.tsx` (action-item + AlertDialog usage in `calendar-editor.tsx`) | partial |
| `components/dashboard/agenda/calendar-editor.tsx` (modified) | component | event-driven | itself (extend) | exact |
| `components/dashboard/agenda/calendar-day-week-grid.tsx` (modified) | component | event-driven | itself (extend) | exact |
| `app/dashboard/agenda/page.tsx` (modified) | route (RSC) | request-response | itself (extend, add parallel appointments load) | exact |

---

## Pattern Assignments

### `supabase/migrations/YYYYMMDDHHMMSS_appointments.sql` (migration)

**Analogs:** `20260720000500_patient_vaccine_doses.sql` (owner table + RLS + 4 policies), `20260314000000_medical_certificates.sql` (`create type ... as enum` + FK `on delete set null/restrict` style), `20260722000000_availability_overrides_hybrid.sql` (named CHECK constraint style).

**Enum pattern** (copy shape from `medical_certificates.sql` lines 2-10):
```sql
create type public.medical_certificate_type as enum (
  'comparecimento', 'aptidao_fisica', 'medico', 'acompanhante'
);
comment on type public.medical_certificate_type is '...';
```
Apply as `create type public.appointment_status as enum ('pending','confirmed','done','no_show','canceled');` (values in English per UI-SPEC "DB value" column; PT-BR labels live in the UI badge — mirrors `patient_sex` keys/labels split).

**Owner-scoped table + FK pattern** (copy from `patient_vaccine_doses.sql` lines 17-25):
```sql
create table public.patient_vaccine_doses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  ...
);
```
CRITICAL DEVIATION (Pitfall 5 / research A3): `patient_id` must use `on delete restrict` (NOT `cascade`) to preserve appointment history that Phase 10 (earnings) will FK. `profile_id` keeps `on delete cascade`. Confirm with planner/user.

**Named CHECK constraint style** (copy from `availability_overrides_hybrid.sql` lines 54-58 / 65-75): use named constraints, e.g. `constraint appointments_ends_after_starts check (ends_at > starts_at)`.

**RLS + 4 policies pattern** (copy verbatim structure from `patient_vaccine_doses.sql` lines 37-74):
```sql
alter table public.patient_vaccine_doses enable row level security;

create policy "Patient vaccine doses select own"
on public.patient_vaccine_doses for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);
-- insert (with check), update (using + with check), delete (using) follow same shape
```
Replicate all 4 policies (select/insert/update/delete) with the exact `profile_id in (select id from public.profiles where auth_user_id = auth.uid())` predicate. RLS + policies ONLY on table creation (never re-emit — see `availability_overrides_hybrid.sql` lines 91-93).

**Index pattern** (copy from `patient_vaccine_doses.sql` lines 30-31): `create index idx_appointments_profile_starts on public.appointments (profile_id, starts_at);`

**GREENFIELD — exclusion constraint (NO in-repo analog).** Grep confirmed zero `exclude using gist` / `btree_gist` / `tstzrange` anywhere in `supabase/migrations/`. Use RESEARCH.md §Pattern 3 / §Code Examples verbatim:
```sql
create extension if not exists btree_gist with schema extensions;  -- BEFORE create table
-- ...
constraint appointments_no_double_booking
  exclude using gist (
    profile_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status in ('pending', 'confirmed'))
```
Extension MUST be created before the table (Pitfall 1). Half-open `[)` matches Phase 6 slot semantics (Pitfall 2).

---

### `modules/appointments/types.ts` (model)

**Analog:** `modules/availability/types.ts`

**Row-type pattern** (lines 10-40): snake_case row types mirroring DB columns, JSDoc noting owner-scoping / IDOR defense.
```typescript
export type AvailabilityRuleRow = {
  id: string
  profile_id: string
  weekday: number
  ...
  created_at: string
}
```
Apply: `AppointmentRow` (id, profile_id, patient_id, status, starts_at, ends_at, created_at, updated_at) + `AppointmentStatus` union type (`"pending" | "confirmed" | "done" | "no_show" | "canceled"`) matching the pg enum.

---

### `modules/appointments/create-appointment.ts` (service, CRUD insert)

**Analog:** `modules/availability/create-availability-override.ts`

**Signature + insert + error-tag pattern** (lines 25-51):
```typescript
export async function createAvailabilityOverride(
  supabase: SupabaseClient,
  profileId: string,
  input: CreateAvailabilityOverrideData,
): Promise<AvailabilityOverrideRow> {
  const { data, error } = await supabase
    .from("availability_exceptions")
    .insert({ profile_id: profileId, ... })
    .select("id, profile_id, ...")
    .single()
  if (error)
    throw new Error(`[AVAILABILITY] Failed to create availability override: ${error.message}`)
  return data as AvailabilityOverrideRow
}
```
Apply: `createAppointment(supabase, profileId, input)` — `profile_id` stamped server-side (never from client), tag `[APPOINTMENTS]`.

**CRITICAL DEVIATION (Pitfall 3 — 23P01 code preservation):** the current repo pattern throws `new Error(...message...)` which HIDES `error.code`. The action needs `error.code === '23P01'` to branch. Module must preserve the code:
```typescript
if (error) {
  const e = new Error(`[APPOINTMENTS] Failed to create appointment: ${error.message}`)
  ;(e as { code?: string }).code = error.code
  throw e
}
```
Planner must fix this contract explicitly (see Shared Patterns → 23P01).

---

### `modules/appointments/list-appointments-by-profile-id.ts` (service, window select)

**Analog:** `modules/availability/list-availability-overrides.ts`

**Scoped-select + ordering pattern** (lines 14-32):
```typescript
export async function listAvailabilityOverrides(
  supabase: SupabaseClient, profileId: string,
): Promise<AvailabilityOverrideRow[]> {
  const { data, error } = await supabase
    .from("availability_exceptions")
    .select("id, profile_id, ...")
    .eq("profile_id", profileId)
    .order("exception_date", { ascending: true })
  if (error) throw new Error(`[AVAILABILITY] Failed to list ...: ${error.message}`)
  return (data ?? []) as AvailabilityOverrideRow[]
}
```
Apply with a `[from, to)` window (RESEARCH §"Leitura das consultas na RSC"): add `.gte("starts_at", from.toISOString()).lt("starts_at", to.toISOString())`, order `starts_at` ascending, tag `[APPOINTMENTS]`.

---

### `modules/appointments/update-appointment-status.ts` (service, compare-and-set update)

**Analogs:** `modules/availability/delete-availability-override.ts` (double-scoped `.eq`), `modules/availability/create-availability-override.ts` (update + code preservation).

**Double-scoped mutation pattern** (from `delete-availability-override.ts` lines 14-29): NEVER mutate by `id` alone — always `.eq("profile_id", profileId).eq("id", id)` (IDOR backstop).
```typescript
const { error } = await supabase
  .from("availability_exceptions")
  .delete()
  .eq("profile_id", profileId)
  .eq("id", id)
```
Apply as a **compare-and-set UPDATE** (RESEARCH §Pattern 2 concurrency note): add a guard on the current status —
`.update({ status: next, updated_at: ... }).eq("profile_id", profileId).eq("id", id).eq("status", from).select().single()`.
If 0 rows affected, the state changed concurrently → surface as a result union in the action. Preserve `error.code` (23P01 can also fire on `pending→confirmed`, Pitfall 4). Tag `[APPOINTMENTS]`.

---

### `modules/appointments/appointment-transitions.ts` (utility, pure)

**Analog:** `modules/patients/patient-sex.ts` (pure domain helper with a co-located `.spec.ts`).

**Pattern:** pure, side-effect-free, testable function + its transition table, with a `.spec.ts` run by `tsx --test`. Use RESEARCH §Pattern 2 content verbatim (`APPOINTMENT_TRANSITIONS` record + `isLegalTransition`). One exported function per file is the convention, but a pure lookup table + guard is acceptable as a single utility module (mirrors `patient-sex.ts` exporting a small helper set).

---

### `lib/schemas/appointment.ts` (config, validation)

**Analog:** `lib/schemas/availability.ts`

**Schema + inferred-type pattern** (lines 1-9 header JSDoc; lines 77-142 `.refine` chains; lines 202-213 `z.infer` exports):
```typescript
export const createAvailabilityOverrideSchema = z.object({ ... })
  .refine((input) => ..., { message: "...", path: ["end_minute"] })
export type CreateAvailabilityOverrideInput = z.infer<typeof createAvailabilityOverrideSchema>
```
Apply: `createAppointmentSchema` (patient_id `z.string().uuid()`, starts_at/ends_at ISO datetime, refine `ends_at > starts_at`), `updateAppointmentStatusSchema` (id uuid, from/to status via `z.enum([...])`). All messages PT-BR inline (matches this file's convention). Feed into `zodErrorToUserMessage` at the action boundary.

---

### `actions/appointments/create-appointment.ts` (controller, request-response)

**Analog:** `actions/availability/save-availability.ts`

**Auth + paid gate + Zod + result union + revalidate pattern** (lines 1-72, copy verbatim structure):
```typescript
"use server"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { ...Schema } from "@/lib/schemas/..."
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type SaveAvailabilityResult = { ok: true } | { ok: false; error: string }

export async function saveAvailabilityAction(input): Promise<SaveAvailabilityResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }
  const parsed = saveAvailabilitySchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }
  // ... delegate to module ...
  revalidatePath("/dashboard/agenda")
  return { ok: true }
}
```
Apply: `createAppointmentAction` — same gate/Zod/revalidate. Status stamped `"confirmed"` (D-05: doctor creates confirmed). Before insert, run the server-side "slot is free?" check (RESEARCH §Pattern 5) reusing `expandAvailability` + `listAvailabilityRules`/`listAvailabilityOverrides` + `CLINIC_TIME_ZONE`.

**GREENFIELD — 23P01 branch (NO in-repo analog; `save-availability` uses bare `error.message`).** Add per RESEARCH §Pattern 4:
```typescript
try {
  const id = await createAppointment(supabase, profile.id, { ...parsed.data, status: "confirmed" })
  revalidatePath("/dashboard/agenda")
  return { ok: true, id }
} catch (error: unknown) {
  if (isExclusionViolation(error)) // error.code === "23P01"
    return { ok: false, error: "Este horário já foi ocupado por outra consulta. Escolha outro horário livre." }
  return { ok: false, error: "Não foi possível agendar a consulta. Verifique sua conexão e tente novamente." }
}
```
Copy strings verbatim from UI-SPEC §Error states.

---

### `actions/appointments/update-appointment-status.ts` (controller, request-response)

**Analog:** `actions/availability/save-availability.ts` (same gate/Zod/result-union/revalidate skeleton).

Add: legal-transition check via `isLegalTransition(from, to)` before delegating (reject illegal → `{ ok: false, error: "Não foi possível atualizar a consulta. Tente novamente." }`). Capture 23P01 on `pending→confirmed` (Pitfall 4) → "horário já ocupado" copy; other transitions → generic update copy (UI-SPEC §Error states). Handle 0-rows-affected (compare-and-set miss) → "Não foi possível atualizar o pedido. Tente novamente." `revalidatePath("/dashboard/agenda")`.

---

### `actions/appointments/index.ts` + `actions/index.ts` (config barrels)

**Analog:** `actions/availability/index.ts` + `actions/index.ts`

**Barrel pattern** (`actions/availability/index.ts`):
```typescript
export {
  saveAvailabilityAction,
  type SaveAvailabilityResult,
} from "./save-availability"
```
Apply: export `createAppointmentAction`/`updateAppointmentStatusAction` + their result types from `actions/appointments/index.ts`, then add a per-domain block in the root `actions/index.ts` (mirrors existing `from "./patients"` / `from "./cases"` blocks).

---

### `components/dashboard/agenda/appointment-create-dialog.tsx` (component, form + patient search)

**Analogs:** `components/ui/dialog.tsx` (vendored), `components/ui/command.tsx` / `components/ui/combobox.tsx` (patient search), `availability-cell-menu.tsx` (client-component state + controlled open + PT-BR copy patterns), `calendar-editor.tsx` lines 13-14 (`toast` from sonner, `Loader2` from lucide for the saving state).

**Client-component + controlled-open + action-call pattern** (from `availability-cell-menu.tsx` lines 1-3, 90-108 and `calendar-editor.tsx` toast/loader imports):
```typescript
"use client"
import * as React from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
```
Patient search delegates to existing `getPatientsByProfileId` / `findPatientByProfileIdNameAndResponsible` (D-04) via a server action or preloaded list; client-side filter over the profile's patients is acceptable. Result row = name (`text-base`) + responsável (`text-sm text-muted-foreground`). Header shows locked `{data} · {horário}` from the clicked slot (D-01, no time editing). CTA "Agendar consulta" (disabled until patient selected; "Agendando..." + `Loader2` while saving). On 23P01 result union → inline error inside the dialog. All copy from UI-SPEC §Copywriting / §Key Layout 1.

---

### `components/dashboard/agenda/pending-requests-panel.tsx` (component, list + actions)

**Analogs:** `availability-cell-menu.tsx` (menu-item + button action pattern), `calendar-editor.tsx` lines 16-27 (AlertDialog import + destructive-confirm usage), `components/ui/badge.tsx` + `components/ui/card.tsx` + `components/ui/alert-dialog.tsx` (vendored).

**AlertDialog destructive-confirm pattern** (import block from `calendar-editor.tsx` lines 16-27):
```typescript
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
```
Each request row: name + responsável + `{data} {horário}` + "Pendente" badge; inline **Confirmar** (`Button size="sm"`) and **Recusar** (`Button size="sm" variant="outline"` → destructive `AlertDialog`). Confirm/reject call `updateAppointmentStatusAction`; surface outcome via `toast`. Empty state uses dashed-border pattern (UI-SPEC §Empty states). Count badge "{n} pendente(s)".

---

### `components/dashboard/agenda/calendar-day-week-grid.tsx` (modified — extend)

**Analog:** itself.

Extend the per-cell rendering (lines 264-309) to overlay appointment status treatment when a cell is booked, and route left-click on a **free/available** cell to appointment creation (UI-SPEC §Key Layout 1 disambiguation rule). The existing `onCellMenu`/`onDragSelect` callbacks and `CellState` type (line 35) are the extension seam — add an appointment layer without changing the Pointer-Events gesture logic (lines 135-223). Fill/border/icon/badge per status from UI-SPEC §Appointment status color system. In-grid text uses `text-xs` (line 251/261 precedent).

---

### `components/dashboard/agenda/calendar-editor.tsx` (modified — extend)

**Analog:** itself.

Extend the `CalendarEditor` props (lines 230-238) to also receive appointment rows from the RSC:
```typescript
export function CalendarEditor({ rules, overrides, timeZone }: {
  rules: RuleRow[]; overrides: OverrideRow[]; timeZone: string
}) { ... }
```
Add an `appointments: AppointmentRow[]` prop (snake_case crude rows, mirroring the `RuleRow`/`OverrideRow` local types at lines 48-65). Host the creation dialog + pending-requests panel; map cell status by matching `starts_at` against the expanded `FreeSlot.start` (from `expandAvailability`, `lib/expand-availability.ts` `FreeSlot` type lines 61-68). Reuse `toast`/`Loader2` already imported (lines 13-14).

---

### `app/dashboard/agenda/page.tsx` (modified — extend RSC)

**Analog:** itself.

Extend the parallel load (lines 38-41) to also fetch appointments for the default week window:
```typescript
const [ruleRows, overrideRows] = await Promise.all([
  listAvailabilityRules(supabase, profile.id),
  listAvailabilityOverrides(supabase, profile.id),
])
```
Add `listAppointmentsByProfileId(supabase, profile.id, weekStart, weekEnd)` to the `Promise.all`, map snake_case rows to the editor prop, and pass `appointments` to `<CalendarEditor>`. The auth + paid gate (lines 32-36) and `CLINIC_TIME_ZONE` / week-window derivation (lines 44-47) are unchanged and reused.

---

## Shared Patterns

### Auth + Paid Gate
**Source:** `actions/availability/save-availability.ts` lines 38-45; `app/dashboard/agenda/page.tsx` lines 32-36.
**Apply to:** every new action (`create-appointment`, `update-appointment-status`) AND the RSC page.
```typescript
const { profile } = await getAuthenticatedUser(supabase)
if (!profile) return { ok: false, error: "Sessão não encontrada." }
if (profile.status !== "paid")
  return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }
```
RSC form: `if (!profile?.id) redirect("/auth/login"); if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")`. RLS `to authenticated` does NOT enforce the subscription — the paid gate is mandatory app-layer logic (research §Security V2).

### Ownership Scoping (IDOR defense)
**Source:** `modules/availability/delete-availability-override.ts` lines 19-24 (double `.eq`); `modules/availability/create-availability-override.ts` lines 32-38 (`profile_id` stamped, never from client).
**Apply to:** every appointments module. `profile_id` always stamped server-side from `profile.id`; every SELECT/UPDATE/DELETE double-scoped `.eq("profile_id", profileId).eq("id", id)`.

### Result Union at Action Boundary
**Source:** `actions/availability/save-availability.ts` lines 13-15.
**Apply to:** both actions. `export type XResult = { ok: true; ... } | { ok: false; error: string }`. Modules throw `Error("[APPOINTMENTS] ...")`; actions catch and convert. Never return raw `PostgrestError`.

### 23P01 Code Preservation (GREENFIELD contract — module↔action)
**Source:** RESEARCH §Pattern 3/4/Pitfall 3 (no in-repo analog — the repo's `save-availability` uses bare `error.message`).
**Apply to:** `create-appointment.ts` module + both actions.
Module preserves the SQLSTATE so the action can branch:
```typescript
const e = new Error(`[APPOINTMENTS] ...: ${error.message}`)
;(e as { code?: string }).code = error.code
throw e
```
Action branches on `error.code === "23P01"` → UI-SPEC copy "Este horário já foi ocupado por outra consulta. Escolha outro horário livre." Planner must pin this as an explicit task (it deviates from the established "throw message only" module pattern).

### Zod Validation at Boundary
**Source:** `actions/availability/save-availability.ts` lines 47-49; `lib/schemas/availability.ts`.
**Apply to:** both actions. `const parsed = schema.safeParse(input); if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }`.

### revalidatePath
**Source:** `actions/availability/save-availability.ts` line 70.
**Apply to:** both actions on success. `revalidatePath("/dashboard/agenda")` so the RSC re-loads appointments + re-expands slots.

### Slot-derivation (timezone)
**Source:** `app/dashboard/agenda/page.tsx` lines 44-73 (`expandAvailability` + `tz(CLINIC_TIME_ZONE)` + `weekStartsOn: 1`); `lib/expand-availability.ts` `FreeSlot` type lines 61-68 (UTC `start`/`end`).
**Apply to:** the RSC window + the action's server-side "slot is free?" check + the create module. Appointments store `starts_at`/`ends_at` directly from `FreeSlot.start`/`.end` (UTC instants); NO timezone re-derivation in the DB (research anti-pattern).

### Pure-helper + spec (test) convention
**Source:** `modules/patients/patient-sex.ts` + `modules/patients/patient-sex.spec.ts` (run by `tsx --test`).
**Apply to:** `modules/appointments/appointment-transitions.ts` + a `.spec.ts` covering legal/illegal transitions and final states.

---

## No Analog Found

| File / Concern | Role | Reason |
|------|------|--------|
| btree_gist exclusion constraint (`EXCLUDE USING gist ... tstzrange ... WHERE status in (...)`) inside `appointments.sql` | migration (partial) | Grep confirmed **zero** `exclude using gist` / `btree_gist` / `tstzrange` in `supabase/migrations/`. Greenfield — use RESEARCH §Pattern 3 + §Code Examples verbatim. |
| 23P01 (`error.code`) branching in an action | controller (partial) | Existing actions (`save-availability`) surface bare `error.message`; none inspect `error.code`. Module↔action code-preservation contract is new — use RESEARCH §Pattern 4. |

## Metadata

**Analog search scope:** `supabase/migrations/` (enum, owner table, RLS/policies, hybrid CHECK, save RPC), `modules/availability/`, `modules/patients/`, `actions/availability/`, `lib/schemas/`, `components/dashboard/agenda/`, `components/ui/`, `app/dashboard/agenda/`.
**Files scanned:** ~20 read in full or targeted; grep sweep for exclusion-constraint primitives across all migrations.
**Pattern extraction date:** 2026-07-22
