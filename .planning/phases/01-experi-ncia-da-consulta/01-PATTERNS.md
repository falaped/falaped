# Phase 1: Experiência da Consulta - Pattern Map

**Mapped:** 2026-06-28
**Files analyzed:** 17 new/modified
**Analogs found:** 16 / 17 (1 partial — no existing free-drag floating widget)

> Scope: CONS-01 (pediatric age + corrected age), CONS-02/03 (persisted consultation timer), CONS-04 (PDF print-fix Path B). All new work follows the established three-tier slice (`app/ → actions/ "use server" + auth + paid gate + Zod → modules/ one fn per file, SupabaseClient injected`), kebab-case files, PT-BR strings, JSDoc on exports.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `lib/compute-pediatric-age.ts` (NEW) | utility (pure) | transform | `lib/brazilian-date-form.ts` | role+flow (exact) |
| `lib/compute-pediatric-age.spec.ts` (NEW) | test | transform | `lib/patient-bmi-ui-status.spec.ts` | exact |
| `lib/compute-elapsed-ms.ts` (NEW, see Wave-0 note) | utility (pure) | transform | `lib/brazilian-date-form.ts` | role-match |
| `lib/compute-elapsed-ms.spec.ts` (NEW) | test | transform | `lib/patient-bmi-ui-status.spec.ts` | exact |
| `supabase/migrations/<ts>_patients_add_gestational_age.sql` (NEW) | migration | — | `20260325140000_cases_add_assistant_turn_queue.sql` + `20260327120000_patients_sex_enum.sql` | exact |
| `supabase/migrations/<ts>_cases_add_consultation_pause.sql` (NEW) | migration | — | `20260325140000_cases_add_assistant_turn_queue.sql` | exact |
| `modules/patients/types.ts` (MODIFY) | model | — | self (add field) | exact |
| `modules/patients/create-patient.ts` (MODIFY) | service | CRUD (write) | self | exact |
| `modules/patients/update-patient.ts` (MODIFY) | service | CRUD (write) | self | exact |
| `lib/schemas/patient.ts` (MODIFY) | config (schema) | — | self | exact |
| `actions/patients/create-patient.ts` / `update-patient.ts` (MODIFY) | action | request-response | `actions/patients/update-patient.ts` | exact |
| `actions/cases/pause-consultation.ts` / `resume-consultation.ts` (NEW) | action | request-response (write) | `actions/cases/update-case-status.ts` | exact |
| `modules/cases/pause-consultation.ts` / `resume-consultation.ts` (NEW) | service | CRUD (write) | `modules/cases/update-case-status.ts` | exact |
| `hooks/use-consultation-timer.ts` (NEW) | hook | event-driven (tick) | `hooks/use-audio-recorder.ts` | role-match |
| `components/dashboard/cases/consultation-timer-widget.tsx` (NEW) | component | event-driven | `components/dashboard/cases/case-report.tsx` (@dnd-kit) | partial (sortable, not free-drag) |
| `components/dashboard/patients/patient-form/patient-form-personal-section.tsx` (MODIFY) | component | request-response (form) | `patient-form-birth-date-field.tsx` | exact |
| `components/dashboard/patients/patient-detail-hero.tsx` (MODIFY) | component | render | self (DOB badge) | exact |
| `components/dashboard/cases/case-detail-header.tsx` (MODIFY) | component | render | self + `patient-detail-hero.tsx` badge | exact |
| `modules/falaped-assistant/lib/formatters.ts` (MODIFY) | utility | transform | self (`formatAgeFromBirthDate`) | exact |
| `actions/cases/download-case-report-pdf.ts` (MODIFY) | action | file-I/O (transform) | self | exact |

---

## Shared Patterns

### Action boundary: auth + paid gate + result union
**Source:** `actions/cases/update-case-status.ts:1-32`, `actions/patients/update-patient.ts:1-31`
**Apply to:** ALL new/modified actions (`pause-consultation`, `resume-consultation`, patient create/update, download PDF).

```typescript
"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
// import the module fn + the Zod schema

export type XResult = { ok: true } | { ok: false; error: string }

export async function xAction(...): Promise<XResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  const parsed = schema.safeParse(data)            // when there is input
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  try {
    await moduleFn(supabase, ...args, profile.id, ...)  // module receives client + profile.id
    revalidatePath("/dashboard/cases")
    revalidatePath(`/dashboard/cases/${caseId}`)
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao ... Tente novamente."
    return { ok: false, error: message }
  }
}
```
Note: modules throw `Error("[DOMAIN] ...")`; the action catches and returns the union. `revalidatePath` / `next/cache` lives in the **action only**, never in modules.

### Ownership scoping for `cases` writes (use `user_phone`, not `id` alone)
**Source:** `modules/cases/update-case-status.ts:8-61`
**Apply to:** `modules/cases/pause-consultation.ts`, `resume-consultation.ts`.
The `cases` table is scoped by `user_phone`, resolved from `profile_id` via `authenticated_users`. Do NOT write `cases` by `id` alone.

```typescript
import type { SupabaseClient } from "@supabase/supabase-js"

export async function pauseConsultation(
  supabase: SupabaseClient,
  caseId: string,
  profileId: string,
): Promise<void> {
  const { data: auRow, error: auError } = await supabase
    .from("authenticated_users")
    .select("phone")
    .eq("profile_id", profileId)
    .maybeSingle()
  if (auError) throw new Error(`[CASES] Failed to resolve phone: ${auError.message}`)
  const userPhone = auRow?.phone ?? null
  if (!userPhone) throw new Error("[CASES] No phone linked to profile.")

  // read current row scoped by user_phone, mutate, then:
  const { error } = await supabase
    .from("cases")
    .update(payload)
    .eq("id", caseId)
    .eq("user_phone", userPhone)   // ownership filter — required
    .select("id")
    .single()
  if (error) throw new Error(`[CASES] Failed to ...: ${error.message}`)
}
```
Patient writes use the simpler `profile_id` filter (see `modules/patients/update-patient.ts:72-78`): `.eq("id", id).eq("profile_id", profileId)`.

### Zod schema at the action boundary
**Source:** `lib/schemas/patient.ts:1-145`, consumed in `actions/patients/update-patient.ts:27-31`
**Apply to:** gestational-age field (integer 20–42 weeks) and pause/resume payloads.
Optional-field idiom already in this file:
```typescript
const optionalString = z
  .string()
  .transform((v) => (v?.trim() === "" ? undefined : v?.trim()))
  .optional()
```
For gestational age, follow the `blood_type` refine idiom (range check + PT-BR message). UI-SPEC error string: `"Informe um valor entre 20 e 42 semanas."` Map issues via `lib/zod-error-message.ts` if surfacing multiple.

### Migration style (additive, idempotent)
**Source:** `supabase/migrations/20260325140000_cases_add_assistant_turn_queue.sql:1-2`
```sql
alter table public.cases
add column if not exists assistant_turn_queue jsonb;
```
Both new columns are additive + nullable → inherit existing table RLS (`20260604000002_rls_patients`, `20260604000003_rls_cases`); no new policy needed. Use a `COMMENT ON COLUMN` line like `20260327120000_patients_sex_enum.sql:20`. No backfill (existing rows NULL = corrected age / pause simply unavailable, graceful).

### Badge primitive (informational, secondary variant)
**Source:** `components/dashboard/patients/patient-detail-hero.tsx:68-77`
**Apply to:** age badge (profile + case header). Reuse verbatim treatment per UI-SPEC §1.
```tsx
<Badge variant="secondary" className="max-w-full gap-1.5 font-normal">
  <CalendarIcon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
  <span className="wrap-break-word">
    {formatDate(patient.birth_date)}
    {ageText ? ` · ${ageText}` : ""}
  </span>
</Badge>
```

---

## Pattern Assignments

### `lib/compute-pediatric-age.ts` (utility, transform) — KEYSTONE

**Analog:** `lib/brazilian-date-form.ts` (date-fns + local-calendar parsing; no I/O; pure exported fns with JSDoc).

**Imports + local-calendar parsing pattern** (`lib/brazilian-date-form.ts:1-2`, and the calendar-equality guard at `:66-71`):
```typescript
import { format, isValid, parse, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
```
The analog already validates real calendar dates by reconstructing day/month/year and comparing (`parsed.getDate() !== day ...`). The age engine MUST build **local midnight** via `new Date(y, m-1, d)` (NOT `new Date("YYYY-MM-DD")` → UTC; NOT the `${birthDate}T12:00:00` noon hack the deprecated formatter uses). Research recommends `differenceInDays`, `differenceInWeeks`, `intervalToDuration`, `isAfter`, `isValid` from date-fns@4.4.0 (verified installed). Return a structured result `{ status, band?, totalDays?, parts?, corrected? }` (RESEARCH §Pattern 1) — the component renders, the engine never formats inline.

**What it replaces:** `formatAgeFromBirthDate` in `modules/falaped-assistant/lib/formatters.ts:9-28` (the years/months-only anti-pattern — no days/weeks, no corrected age, noon hack). Route all callers through the new engine (see Pitfall 5).

**Corrected age (D-10):** when `gestationalAgeWeeks < 37`, subtract `(40 - gestationalAgeWeeks)` weeks; apply until ~24 months corrected; label "idade corrigida". Default 40-week baseline / 24-month cutoff (A3 — confirm with physician).

---

### `lib/compute-pediatric-age.spec.ts` (test) + `lib/compute-elapsed-ms.spec.ts`

**Analog:** `lib/patient-bmi-ui-status.spec.ts:1-49` (node:test + tsx --test; builder helper + `assert.deepEqual` / `assert.equal`).

**Test harness pattern** (`:1-2`):
```typescript
import test from "node:test"
import assert from "node:assert/strict"

import { computePediatricAge } from "@/lib/compute-pediatric-age"

test("computePediatricAge returns days band for newborn", () => {
  assert.deepEqual(computePediatricAge("2026-06-26", new Date(2026, 5, 28)), {
    status: "ok", band: "days", /* ... */
  })
})
```
Run via `yarn test` (script greps `modules lib -name '*.spec.ts' | xargs tsx --test`). Pass `now` as an explicit arg (engine signature `computePediatricAge(birthDateIso, now = new Date(), gestationalAgeWeeks?)`) so tests are deterministic. Cover: 0/1 day, ≤12 weeks, months+days (Jan-31, Feb-29 non-leap), years+months, year boundary, missing/invalid/future DOB (D-09/D-12), corrected vs chronological. Extract a pure `computeElapsedMs({startedAt, endedAt, pausedMs, pausedAt}, now)` (RESEARCH §Validation) so CONS-02/03 is unit-tested without React.

---

### `supabase/migrations/<ts>_patients_add_gestational_age.sql` (migration)

**Analog:** `20260325140000_cases_add_assistant_turn_queue.sql` (additive) + `20260327120000_patients_sex_enum.sql:20` (COMMENT).
```sql
alter table public.patients
add column if not exists gestational_age_weeks integer;

comment on column public.patients.gestational_age_weeks is
  'Idade gestacional ao nascer em semanas (20–42). NULL quando desconhecida; usada para idade corrigida de prematuros.';
```
Nullable, no backfill. Inherits `patients` RLS.

### `supabase/migrations/<ts>_cases_add_consultation_pause.sql` (migration)

**Analog:** same.
```sql
alter table public.cases
  add column if not exists consultation_paused_ms bigint not null default 0,
  add column if not exists consultation_paused_at timestamptz;
```
Accumulator model (RESEARCH Pitfall 3): `consultation_paused_ms` = total paused ms; `consultation_paused_at` non-null ⇒ currently paused. ⚠️ **Also verify `cases.started_at` has a DB default** (A2) — the insert in `modules/cases/create-dashboard-case-with-patient.ts:67-81` does NOT set `started_at`, so it relies on a default. If absent, add `default now()` here or set it explicitly in the create module (D-02 auto-start).

---

### `modules/patients/types.ts` (model) — MODIFY

**Analog:** self (`:6-25`). Add one field to the `Patient` type next to the existing snake_case fields:
```typescript
gestational_age_weeks: number | null
```

### `modules/patients/{create,update}-patient.ts` (service, CRUD) — MODIFY

**Analog:** self. Two coordinated edits each:
1. Extend `PATIENT_SELECT` (`create-patient.ts:6-7`, `update-patient.ts:6-7`) to add `gestational_age_weeks`.
2. Add the field to the payload type + the build block.

`update-patient.ts:41-42` provided-field idiom (apply for the new column):
```typescript
if (payload.gestational_age_weeks !== undefined)
  updates.gestational_age_weeks = payload.gestational_age_weeks ?? null
```
`create-patient.ts:34-49` insert row idiom: `gestational_age_weeks: payload.gestational_age_weeks ?? null`. Keep ownership filters unchanged (`.eq("profile_id", profileId)` at `update-patient.ts:75-76`).

---

### `actions/patients/{create,update}-patient.ts` (action) — MODIFY

**Analog:** `actions/patients/update-patient.ts:1-71` (shared action pattern above). The `gestational_age_weeks` flows through `updatePatientSchema.safeParse` (`:27-31`) and the conditional payload mapping (`:34-61`). Add one line mirroring `:36-37`:
```typescript
if (parsed.data.gestational_age_weeks !== undefined)
  payload.gestational_age_weeks = parsed.data.gestational_age_weeks ?? null
```

### `lib/schemas/patient.ts` (config/schema) — MODIFY

**Analog:** self (`:58-136`). Add `gestational_age_weeks` to both `createPatientSchema` and `updatePatientSchema`. Model on the `blood_type` optional-with-range-refine idiom (`:77-84`). Form value is a string; coerce to int and range-check 20–42; empty → undefined. UI-SPEC error: `"Informe um valor entre 20 e 42 semanas."`

---

### `actions/cases/pause-consultation.ts` / `resume-consultation.ts` (action) — NEW

**Analog:** `actions/cases/update-case-status.ts:1-32`. Same auth + paid gate + result union (shared pattern). Signature: `pauseConsultationAction(caseId: string)`. Validate `caseId` (non-empty string; or a small Zod schema). `revalidatePath("/dashboard/cases")` + `` `/dashboard/cases/${caseId}` `` like `:24-25`. Delegate to the module below. Export `PauseConsultationResult` union and barrel through `actions/cases/index.ts` + `actions/index.ts`.

### `modules/cases/pause-consultation.ts` / `resume-consultation.ts` (service, CRUD) — NEW

**Analog:** `modules/cases/update-case-status.ts:8-61` (the `user_phone` resolution + ownership-scoped update — shared pattern above). One exported fn per file, JSDoc, `SupabaseClient` injected, throws `Error("[CASES] ...")`.
- **pause:** set `consultation_paused_at = now()` (only if not already paused / not ended).
- **resume:** `consultation_paused_ms += now - consultation_paused_at; consultation_paused_at = null` (read current row first, scoped by `user_phone`, then write).

---

### `hooks/use-consultation-timer.ts` (hook) — NEW

**Analog:** `hooks/use-audio-recorder.ts` (client hook structure; `"use client"` not needed in `hooks/` file itself — consumer is `"use client"`). RESEARCH §Pattern 2 gives the exact shape: `setInterval(1s)` triggers a repaint only; elapsed is computed from the persisted `started_at` timestamp minus `pausedMs`, frozen at `pausedAt` when paused. Wrap the pure `computeElapsedMs` (tested separately).
```typescript
import { useEffect, useState } from "react"
// running = !endedAt && !pausedAt; interval repaints; elapsed = computeElapsedMs(opts, Date.now())
```
Inputs come from `CaseWithPatient` (`modules/cases/types.ts:11-25`: `started_at: string`, `ended_at: string | null`) plus the two new pause columns.

---

### `components/dashboard/cases/consultation-timer-widget.tsx` (component) — NEW

**Analog (partial):** `components/dashboard/cases/case-report.tsx:1-21` uses `@dnd-kit` but with **`useSortable` + `SortableContext`** (a list reorder), NOT the free-drag `useDraggable` this widget needs. Reuse the **import + sensor wiring** convention from it:
```typescript
import { DndContext, type DragEndEvent, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core"
```
Per UI-SPEC §2 + RESEARCH §"Draggable timer widget": use `useDraggable` (free drag, not sortable), `DndContext` at the case-detail level, `GripVerticalIcon` handle (`min-h-11` touch target), persist `{x,y}` to `localStorage` on `DragEnd` (clamp to viewport). `Card`-toned panel (`bg-card border border-border rounded-lg shadow-md p-3`, fixed, `z-50`). Running-state pinging dot **reuses the `StatusBadge` treatment** from `case-detail-header.tsx:11-17` (the `animate-ping` span). Honor `prefers-reduced-motion`. Controls: `Button variant="ghost" size="icon"` with `PauseIcon`/`PlayIcon` (lucide) calling the pause/resume actions; aria-labels "Pausar consulta" / "Retomar consulta".

---

### `components/dashboard/patients/patient-form/patient-form-personal-section.tsx` (component) — MODIFY

**Analog:** `patient-form-birth-date-field.tsx:1-63` (the exact `Field`/`FieldLabel`/`FieldContent`/`Input`/`FieldError` structure + `Controller` + `inputMode="numeric"` + `font-mono text-sm tabular-nums` + `aria-describedby` hint). Build a new `PatientFormGestationalAgeField` mirroring it, then render it in the personal section row alongside birth-date/sex (`patient-form-personal-section.tsx:49-62`, the `flex ... md:flex-row` row). UI-SPEC §3 copy: label "Idade gestacional ao nascer", hint "Em semanas. Usada para calcular a idade corrigida de prematuros.", placeholder "Ex.: 34", width `w-full md:w-[12rem]`. Default value added to `patient-form-defaults.ts` (`buildEditPatientDefaultValues` + `CREATE_PATIENT_DEFAULT_VALUES`).

---

### `components/dashboard/patients/patient-detail-hero.tsx` (component) — MODIFY

**Analog:** self (`:23` consumes the deprecated `formatAgeFromBirthDate`; `:68-77` is the DOB badge). Replace the `formatAgeFromBirthDate(patient.birth_date)` call with a render of `computePediatricAge(...)` (passing `patient.gestational_age_weeks`). Keep the existing `Badge variant="secondary"` + `CalendarIcon` treatment (shared Badge pattern). Handle D-09 (missing DOB → "Completar cadastro" CTA) and D-12 (invalid/future → `text-destructive` message) per UI-SPEC copy contract. Corrected age → second adjacent "idade corrigida" badge/line.

### `components/dashboard/cases/case-detail-header.tsx` (component) — MODIFY

**Analog:** self (`:55-66` meta row `flex flex-wrap items-center gap-x-4`) + the hero Badge pattern. Add an **abbreviated** age badge (`"3m 12d"`, `"6 sem"`, `"2a 4m"`) in the meta row next to the timer, wrapped in `Tooltip` exposing full by-extenso text + DOB (UI-SPEC §1 + "Case-header age"). Reuse the existing `StatusBadge` (`:8-22`) running treatment for the timer dot. Requires the patient DOB + gestational age be available on `CaseDetail`.

---

### `modules/falaped-assistant/lib/formatters.ts` (utility) — MODIFY

**Analog:** self (`formatAgeFromBirthDate` at `:9-28`). Per RESEARCH State-of-the-Art + Pitfall 5: do NOT extend the inline formatter. Convert it to a **thin adapter** over `computePediatricAge` (format the engine result into the assistant's `- Idade:` line at `:80-81`) or deprecate. This keeps the patient hero, case header, and assistant context consistent (one source of truth).

---

### `actions/cases/download-case-report-pdf.ts` (action, file-I/O) — MODIFY (CONS-04 Path B)

**Analog:** self (`:51-66`). Two concrete edits:
1. **Sanitize sections** before building `datapdf` (RESEARCH §Code Examples) — replace `:51-53`:
```typescript
const sections = (report.sections ?? [])
  .sort((a, b) => a.order - b.order)
  .map((s) => ({ title: s.name, content: (s.content ?? "").replace(/\n{3,}/g, "\n\n").trim() }))
  .filter((s) => s.content.length > 0)   // drop empty sections (cause #1)
```
2. **Remove** `console.log("datapdf", datapdf)` at `:65` (leaks minors' clinical data to logs — LGPD-adjacent; RESEARCH Pitfall 6).

⚠️ Path B is **partial** — it attacks empty-paragraph inflation only. The phantom page at the ~1.05-page boundary (200pt forced footer reserve, cause #2/#3) lives in `@falaped/falaped-kit@0.2.7` (published, dist-only, **not editable in this repo**). Full CONS-04 success criterion #4 requires **Path A** (kit refactor + release + version bump) — planner must confirm kit-repo access (A1) before claiming CONS-04 done. Do NOT nudge kit gap constants.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `components/dashboard/cases/consultation-timer-widget.tsx` (free-drag part) | component | event-driven | Only existing `@dnd-kit` usage is **sortable list reorder** (`case-report.tsx`, `report-template-sections-editor.tsx`), not free-drag `useDraggable`. Import/sensor convention is reusable; the `useDraggable` + `localStorage` position is new — follow RESEARCH §"Draggable timer widget" + UI-SPEC §2. |

> CONS-04 Path A (kit fix) has no in-repo analog by design — the kit source is not in this repo. Path B (above) is the only in-repo work.

## Metadata

**Analog search scope:** `lib/`, `lib/schemas/`, `modules/cases/`, `modules/patients/`, `actions/cases/`, `actions/patients/`, `components/dashboard/cases/`, `components/dashboard/patients/`, `components/dashboard/patients/patient-form/`, `hooks/`, `supabase/migrations/`, `components/ui/`.
**Files scanned:** ~30 (12 read in full / targeted).
**Pattern extraction date:** 2026-06-28
**Open verification for planner:** A1 (kit editability — blocks full CONS-04), A2 (`cases.started_at` default — insert does not set it), A3 (corrected-age baseline/cutoff — confirm with physician).
