# Phase 3: Curva de Crescimento - Pattern Map

**Mapped:** 2026-07-09
**Files analyzed:** 22 new/modified files
**Analogs found:** 20 / 22 (2 greenfield: LMS math, reference JSON assets)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/2026NNNN_patient_measurements.sql` | migration | CRUD | `supabase/migrations/20260314000000_medical_certificates.sql` + `20260604000002_rls_patients.sql` | role-match (table + RLS) |
| `modules/patient-growth/types.ts` | model | — | `modules/patients/types.ts` | exact |
| `modules/patient-growth/create-measurement.ts` | module (query) | CRUD | `modules/patients/create-patient.ts` | exact |
| `modules/patient-growth/get-measurements-by-patient.ts` | module (query) | CRUD | `modules/patients/get-patients-by-profile-id.ts` | exact |
| `modules/patient-growth/update-measurement.ts` | module (query) | CRUD | `modules/patients/update-patient.ts` | exact |
| `modules/patient-growth/delete-measurement.ts` | module (query) | CRUD | `modules/patients/delete-patient.ts` | exact |
| `modules/patient-growth/*.spec.ts` (ownership) | test | CRUD | `modules/patients/delete-patient.spec.ts` | exact |
| `actions/patient-growth/create-measurement.ts` | action | request-response | `actions/patients/create-patient.ts` | exact |
| `actions/patient-growth/update-measurement.ts` | action | request-response | `actions/patients/create-patient.ts` | exact |
| `actions/patient-growth/delete-measurement.ts` | action | request-response | `actions/patients/delete-patient.ts` | exact |
| `actions/patient-growth/index.ts` | config (barrel) | — | `actions/patients/index.ts` | exact |
| `actions/index.ts` (modified — add growth re-export) | config (barrel) | — | `actions/index.ts` (self) | exact |
| `lib/schemas/patient-measurement.ts` | schema | transform | `lib/schemas/patient.ts` | exact |
| `lib/compute-pediatric-age.ts` (modified — 36m cutoff) | utility | transform | `lib/compute-pediatric-age.ts` (self) | exact (extend) |
| `lib/compute-pediatric-age.spec.ts` (extended) | test | transform | `lib/compute-pediatric-age.spec.ts` (self) | exact |
| `lib/lms-zscore.ts` (+ `.spec.ts`) | utility | transform | none (pure math — RESEARCH formula) | no analog |
| `lib/growth-reference/index.ts` (+ `.spec.ts`) | utility | file-I/O (static import) | `lib/patient-bmi-ui-status.ts` (pure lookup shape) | partial |
| `lib/growth-reference/who/*.json` | config (static asset) | — | none (WHO LMS content) | no analog |
| `components/dashboard/patients/growth/growth-section.tsx` | component | request-response | `components/dashboard/patients/patient-clinical-overview.tsx` | role-match |
| `components/dashboard/patients/growth/measurement-form.tsx` | component | CRUD | `components/dashboard/patients/patient-form/patient-form.tsx` | role-match |
| `components/dashboard/patients/growth/measurement-history-table.tsx` | component | CRUD | `components/dashboard/patients/patient-clinical-overview.tsx` (Card layout) | partial |
| `components/dashboard/patients/growth/growth-chart.tsx` | component | transform (render) | none (Recharts — RESEARCH pattern) | no analog |

## Pattern Assignments

### `modules/patient-growth/create-measurement.ts` (module, CRUD)

**Analog:** `modules/patients/create-patient.ts`

Copy the exact shape: `SupabaseClient` injected as first arg, `profileId` threaded in, a module-level `SELECT` constant, `throw new Error("[GROWTH] ...")` on failure. Note the `[GROWTH]` domain tag (not `[PATIENTS]`).

**Signature + insert pattern** (create-patient.ts lines 30-65):
```typescript
export async function createPatient(
  supabase: SupabaseClient,
  profileId: string,
  payload: CreatePatientPayload
): Promise<Patient> {
  const row = {
    profile_id: profileId,
    // ...map + trim/nullify payload fields...
  }

  const { data, error } = await supabase
    .from("patients")
    .insert(row)
    .select(PATIENT_SELECT)
    .single()

  if (error)
    throw new Error(`[PATIENTS] Failed to create patient: ${error.message}`)

  return data as Patient
}
```

For growth: `createMeasurement(supabase, profileId, patientId, payload)`. Insert `profile_id`, `patient_id`, `measured_on`, and the optional `weight_grams` / `length_height_mm` / `head_circumference_mm`. Store integer smallest-unit values (g, mm) per RESEARCH Data Model — do the kg→g / cm→mm conversion at the schema/action boundary, not here.

---

### `modules/patient-growth/get-measurements-by-patient.ts` (module, CRUD)

**Analog:** `modules/patients/get-patients-by-profile-id.ts`

**Owner-scoped select pattern** (get-patients-by-profile-id.ts lines 10-26):
```typescript
export async function getPatientsByProfileId(
  supabase: SupabaseClient,
  profileId: string
): Promise<Patient[]> {
  const { data, error } = await supabase
    .from("patients")
    .select(PATIENT_SELECT)
    .eq("profile_id", profileId)
    .order("name", { ascending: true })

  if (error)
    throw new Error(`[PATIENTS] Failed to fetch patients: ${error.message}`)

  return (data ?? []) as Patient[]
}
```

For growth: add a SECOND scope filter `.eq("patient_id", patientId)` (D-14) and `.order("measured_on", { ascending: true })` so the chart gets chronological history. Return `(data ?? []) as Measurement[]`.

---

### `modules/patient-growth/update-measurement.ts` (module, CRUD)

**Analog:** `modules/patients/update-patient.ts`

**Dual-scope update pattern** (update-patient.ts lines 30-88) — the ownership backstop is the `.eq("id", id).eq("profile_id", profileId)` pair. For growth add `.eq("patient_id", patientId)` too:
```typescript
const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
if (payload.weight_grams !== undefined) updates.weight_grams = payload.weight_grams
// ...only set provided fields...

const { data, error } = await supabase
  .from("patients")
  .update(updates)
  .eq("id", id)
  .eq("profile_id", profileId)      // ownership backstop (D-14)
  .select(PATIENT_SELECT)
  .single()
```

---

### `modules/patient-growth/delete-measurement.ts` (module, CRUD)

**Analog:** `modules/patients/delete-patient.ts` (lines 41-50 — the row-delete portion)

This is the IDOR-critical file (CONCERNS Pitfall 5 / RESEARCH Pitfall 1). The measurement delete has NO storage/cascade side-effects (unlike patient), so it is just the scoped delete:
```typescript
const { error: deleteError } = await supabase
  .from("patients")
  .delete()
  .eq("id", id)
  .eq("profile_id", profileId)   // MUST include — plus .eq("patient_id", patientId) for growth
```
Never `.delete().eq("id", ...)` alone — that is the exact shipped bug CONCERNS documents.

---

### `modules/patient-growth/delete-measurement.spec.ts` (test, ownership)

**Analog:** `modules/patients/delete-patient.spec.ts`

Copy the hand-rolled `SupabaseClient` mock and the ownership assertion. The load-bearing test (lines 97-111) records `.eq()` calls on the delete and asserts BOTH `id` and `profile_id` are present:
```typescript
test("... scopes the row delete by BOTH id and profile_id (ownership backstop)", async () => {
  const { client, deleteEqCalls } = buildSupabaseMock(...)
  await deleteMeasurement(client, MEASUREMENT_ID, PROFILE_ID, PATIENT_ID)

  assert.ok(deleteEqCalls.some((c) => c.column === "id" && c.value === MEASUREMENT_ID))
  assert.ok(deleteEqCalls.some((c) => c.column === "profile_id" && c.value === PROFILE_ID))
  // ADD: also assert patient_id is scoped
})
```
The mock's `from(table)` builder with `mode` tracking (lines 25-68) is directly reusable — swap the recorded table name to `patient_measurements`.

---

### `actions/patient-growth/create-measurement.ts` (action, request-response)

**Analog:** `actions/patients/create-patient.ts`

Copy the full action preamble verbatim — this is the mandatory auth + paid gate + Zod boundary (CLAUDE.md Security Conventions). Result union is `{ ok: true; ... } | { ok: false; error: string }`.

**Action preamble + result union** (create-patient.ts lines 1-31):
```typescript
"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
// import module + schema

export type CreateMeasurementResult =
  | { ok: true; measurementId: string }
  | { ok: false; error: string }

export async function createMeasurementAction(data): Promise<CreateMeasurementResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile)
    return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  const parsed = createMeasurementSchema.safeParse(data)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dados inválidos."
    return { ok: false, error: msg }
  }
  // try { delegate to module; revalidatePath(...); return { ok: true, ... } }
  // catch (e) { return { ok: false, error: e instanceof Error ? e.message : "..." } }
}
```

**try/catch tail** (create-patient.ts lines 66-70):
```typescript
} catch (e) {
  const message = e instanceof Error ? e.message : "Erro ao ... Tente novamente."
  return { ok: false, error: message }
}
```

For growth: thread `profile.id` AND `patientId` into the module call (patientId comes from the parsed input, validated as `uuid`). `revalidatePath("/dashboard/patients/${patientId}")` (D-09 — history lives on the profile page).

---

### `actions/patient-growth/delete-measurement.ts` (action, request-response)

**Analog:** `actions/patients/delete-patient.ts` (lines 15-35) — takes an `id: string`, runs the same preamble, delegates, `revalidatePath`, returns `{ ok } | { ok: false; error }`.

---

### `actions/patient-growth/index.ts` (config, barrel)

**Analog:** `actions/patients/index.ts`
```typescript
export { createMeasurementAction } from "./create-measurement"
export { updateMeasurementAction } from "./update-measurement"
export { deleteMeasurementAction } from "./delete-measurement"
```
Then add a re-export block to the root `actions/index.ts` (see the existing `from "./patients"` block, lines 25-33) so components import from `@/actions`.

---

### `lib/schemas/patient-measurement.ts` (schema, transform)

**Analog:** `lib/schemas/patient.ts`

Reuse the `optionalString`/`optionalBrazilianBirthDate`/coercion idioms. Key reusable pieces:

**Brazilian date field** (patient.ts lines 24-37) — reuse `isCompleteBirthDateInputString` + `parseBirthDateFormValueToIso` for `measured_on` (D-10 retroactive dates; outputs `yyyy-mm-dd` for the `date` column).

**Numeric-with-range field** (patient.ts lines 47-63, `optionalGestationalAgeWeeks`) — copy this `union([string, number]).optional().transform(...).refine(range).transform(Number)` shape for `weight`/`height`/`head_circumference` with the RESEARCH plausible ranges (weight 0.3–180 kg, height 20–220 cm, head-circ 20–70 cm). Add a cross-field `.refine` requiring at least one of the three (RESEARCH: matches the DB CHECK).

**Export types** (patient.ts lines 179-185):
```typescript
export type CreateMeasurementFormData = z.output<typeof createMeasurementSchema>
export type CreateMeasurementFormInput = z.input<typeof createMeasurementSchema>
```

---

### `lib/compute-pediatric-age.ts` (utility, transform — MODIFY, do not fork)

**Analog:** itself (D-07 landmine)

Current hard cap at lines 59 + 167. Extend by adding an options param defaulting to 24 so Phase 1 callers are unchanged:
```typescript
// line 59 — keep, add sibling constant:
export const CORRECTED_AGE_CUTOFF_MONTHS = 24
export const GROWTH_CORRECTED_AGE_CUTOFF_MONTHS = 36   // NEW

// line 136-140 — add options param:
export function computePediatricAge(
  birthDateIso: string | null | undefined,
  now: Date = new Date(),
  gestationalAgeWeeks?: number | null,
  options?: { correctedAgeCutoffMonths?: number },   // NEW, default 24
): PediatricAge

// line 167 — use the param instead of the constant:
if (correctedMonths <= (options?.correctedAgeCutoffMonths ?? CORRECTED_AGE_CUTOFF_MONTHS)) { ... }
```
The corrected-age math (lines 155-176: birth-date shift by `(40 - gestationalAgeWeeks) * 7` days, re-band) is already correct — do NOT re-implement it in growth code (RESEARCH Anti-Pattern). Growth calls with `{ correctedAgeCutoffMonths: 36 }` and passes `measured_on` as `now`.

**Timezone safety (Pitfall 4):** the engine builds local midnight via `localMidnightFromIso` (lines 71-84). Pass the ISO date-only string; NEVER `new Date(isoDate)` and NEVER the `T12:00:00` noon hack that `patient-bmi-ui-status.ts` line 18 uses — do not copy that into the curve path.

---

### `lib/compute-pediatric-age.spec.ts` (test, transform — EXTEND)

**Analog:** itself. Add: corrected age present at 30m and 35m with `{ correctedAgeCutoffMonths: 36 }`; absent at 37m; and a REGRESSION test proving the default (no options) still cuts at 24m (RESEARCH Wave 0).

---

### `lib/lms-zscore.ts` (utility, transform — NO ANALOG)

No existing analog. Pure math from RESEARCH Code Examples (lines 341-350). Standalone `.ts` in `lib/` with a `.spec.ts` (matches `lib/*.spec.ts` convention, e.g. `compute-pediatric-age.spec.ts`). Two exported functions `lmsZScore` and `lmsValueAtZ`; JSDoc per convention. Spec must include the P50==M spot-check vs WHO published values (RESEARCH Pitfall 3 / Wave 0).

---

### `lib/growth-reference/index.ts` (utility, file-I/O)

**Partial analog:** `lib/patient-bmi-ui-status.ts` (pure lookup + presentation shape).

Static JSON import + a lookup function `getReferenceTable(standard, indicator, sex)` returning rows plus `source`/`ageMin`/`ageMax` metadata (D-02/D-03 require these visible in UI). Follow the one-purpose-per-file + JSDoc convention. `.spec.ts` asserts metadata present per file (Wave 0).

---

### `components/dashboard/patients/growth/growth-section.tsx` (component, request-response)

**Analog:** `components/dashboard/patients/patient-clinical-overview.tsx` (Card layout, lucide icons) + wiring pattern from `patient-detail-content.tsx`.

The section mounts on the patient detail page next to the clinical overview (D-09). Server data (measurement history) is fetched server-side and passed as props — see `patient-detail-content.tsx` lines 11-36 (auth + paid gate, `getPatientById` owner-scoped, `Promise.all` of owner-scoped module reads, pass to view). Add `getMeasurementsByPatient(supabase, profile.id, patient.id)` to that `Promise.all` and thread it down.

**Reuse the BMI color mapping** from `lib/patient-bmi-ui-status.ts` (`PatientBmiUiStatus` = `good`/`warn`/`bad`) for the D-13 classification color — but per RESEARCH line 198 do NOT treat its hard-coded `classifyBmiByAge` bands as source of truth for the curve; use the WHO z-score classification from `lms-zscore`. Keep the existing clinical-overview card intact (D-08).

---

### `components/dashboard/patients/growth/measurement-form.tsx` (component, CRUD)

**Analog:** `components/dashboard/patients/patient-form/patient-form.tsx`

**react-hook-form + zodResolver + action + sonner toast pattern** (patient-form.tsx lines 1-56):
```typescript
"use client"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { createMeasurementSchema, type CreateMeasurementFormInput } from "@/lib/schemas/patient-measurement"
import { createMeasurementAction } from "@/actions"

const form = useForm<CreateMeasurementFormInput>({
  mode: "onSubmit",
  reValidateMode: "onBlur",
  resolver: zodResolver(createMeasurementSchema) as Resolver<CreateMeasurementFormInput>,
  defaultValues: { ... },
})
```
Reuse the birth-date field component pattern from `patient-form/patient-form-birth-date-field.tsx` for the `measured_on` dd/mm/aaaa input.

---

### `components/dashboard/patients/growth/growth-chart.tsx` (component, render — NO ANALOG)

No existing chart in the codebase. Use RESEARCH Pattern 1 (Recharts `ComposedChart`, lines 259-277). MUST be `"use client"` (interactive toggles — RESEARCH Anti-Pattern). Reference band lines computed via `lib/lms-zscore.ts`; patient points via extended `computePediatricAge`. Empty state when `patient.sex` is null (Pitfall 5).

---

## Shared Patterns

### Auth + Paid Gate (applies to ALL 3 growth actions)
**Source:** `actions/patients/create-patient.ts` lines 20-25 (also `delete-patient.ts` lines 19-23)
```typescript
const supabase = await createClient()
const { profile } = await getAuthenticatedUser(supabase)
if (!profile)
  return { ok: false, error: "Sessão não encontrada." }
if (profile.status !== "paid")
  return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }
```
Non-negotiable preamble (CLAUDE.md Security Conventions). Copy verbatim into every growth action.

### Ownership Scoping / IDOR Guard (applies to ALL 4 growth modules)
**Source:** `modules/patients/update-patient.ts` lines 78-79; `delete-patient.ts` lines 44-45
```typescript
.eq("id", id)
.eq("profile_id", profileId)   // + .eq("patient_id", patientId) for growth (D-14)
```
Every select/update/delete in `modules/patient-growth/` MUST carry both scope filters. This is CONCERNS Pitfall 5 / RESEARCH Pitfall 1 — the exact shipped bug class. Pair with an ownership `.spec.ts` (analog: `delete-patient.spec.ts`).

### Result Union at Action Boundary (applies to ALL 3 growth actions)
**Source:** `actions/patients/create-patient.ts` lines 10-12 + try/catch lines 66-70
```typescript
export type XResult = { ok: true; ... } | { ok: false; error: string }
// module throws Error("[GROWTH] ..."); action catches and returns { ok: false, error }
```

### Zod safeParse at Boundary
**Source:** `actions/patients/create-patient.ts` lines 27-31
```typescript
const parsed = schema.safeParse(data)
if (!parsed.success) {
  const msg = parsed.error.issues[0]?.message ?? "Dados inválidos."
  return { ok: false, error: msg }
}
```

### Migration: Table + Index + updated_at trigger, then RLS
**Source (table+trigger):** `supabase/migrations/20260314000000_medical_certificates.sql`
```sql
create table public.medical_certificates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid null references public.patients(id) on delete set null,
  ...
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_medical_certificates_profile_id on public.medical_certificates (profile_id);
create trigger trg_..._set_updated_at before update ... execute function ...;
```
For `patient_measurements`: `patient_id ... on delete cascade` (not `set null` — measurements die with the patient), add `check (weight_grams is not null or length_height_mm is not null or head_circumference_mm is not null)`, index `(profile_id, patient_id, measured_on)`.

**Source (RLS):** `supabase/migrations/20260604000002_rls_patients.sql` lines 9-76 — `alter table ... enable row level security` + 4 policies (select/insert/update/delete) keyed to `profile_id in (select id from public.profiles where auth_user_id = auth.uid())`. For the NEW table, ship RLS in the same migration (RESEARCH Data Model). Growth has NO `user_phone` origin flow, so DROP the `or user_phone in (...)` branch — use only the `profile_id` predicate.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `lib/lms-zscore.ts` (+ spec) | utility | transform | No existing statistical/LMS math; pure formula from RESEARCH lines 341-350 |
| `lib/growth-reference/who/*.json` | config asset | — | WHO LMS reference content; ingested per RESEARCH Reference Datasets (STATE.md blocker — needs `checkpoint:human-verify`) |
| `components/dashboard/patients/growth/growth-chart.tsx` | component | render | No chart lib in repo today; Recharts is new (RESEARCH Pattern 1). File shape/conventions still follow existing `"use client"` components. |

## Metadata

**Analog search scope:** `modules/patients/`, `actions/patients/`, `lib/`, `lib/schemas/`, `supabase/migrations/`, `components/dashboard/patients/`
**Files scanned:** ~18 read in full or targeted
**Pattern extraction date:** 2026-07-09
