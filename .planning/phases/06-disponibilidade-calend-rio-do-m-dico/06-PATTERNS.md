# Phase 06: Disponibilidade & Calendário do Médico (v2 REDESIGN) - Pattern Map

**Mapped:** 2026-07-21
**Files analyzed:** 12 (new/modified)
**Analogs found:** 12 / 12

> **This is a v2 rewrite, not greenfield.** The v1 slice was shipped and is live in the DB. The closest analog for almost every v2 file is its own **live v1 counterpart** in the repo. This map points each v2 file at that live analog with concrete excerpts, plus the two canonical molds (`patient_vaccine_doses.sql` for owner-scoped migrations, `compute-pediatric-age.ts` for the pure-fn+spec shape). Where a file is genuinely modified in place (not created), that is marked in the Match Quality column.

## File Classification

| v2 File | Role | Data Flow | Closest Analog | Match Quality |
|---------|------|-----------|----------------|---------------|
| `supabase/migrations/<ts>_availability_overrides_hybrid.sql` | migration | batch (ALTER+backfill) | `supabase/migrations/20260721000200_availability_exceptions.sql` (the table being altered) + `20260720000500_patient_vaccine_doses.sql` (owner-scope mold) | exact (evolves the very table) |
| `lib/expand-availability.ts` (rewrite) | utility (pure fn) | transform | itself (v1) + `lib/compute-pediatric-age.ts` (pure-fn mold) | exact (in-place rewrite) |
| `lib/expand-availability.spec.ts` (rewrite) | test | transform | itself (v1) + `lib/compute-pediatric-age.spec.ts` | exact (in-place, add cases) |
| `lib/schemas/availability.ts` (modify) | config (schema) | transform | itself (v1) + `computePediatricAge` ISO-date helper | exact (in-place edit) |
| `modules/availability/types.ts` (modify) | model | — | itself (v1) | exact (in-place edit) |
| `modules/availability/list-availability-overrides.ts` | service | CRUD (read) | `modules/availability/list-availability-exceptions.ts` | exact (rename/evolve) |
| `modules/availability/create-availability-override.ts` | service | CRUD (create) | `modules/availability/create-availability-exception.ts` | exact (rename/evolve) |
| `modules/availability/delete-availability-override.ts` | service | CRUD (delete) | `modules/availability/delete-availability-exception.ts` | exact (rename/evolve) |
| `modules/availability/upsert-availability-rules.ts` (reuse) | service | CRUD (delete-then-insert) | itself (v1) — unchanged | exact (reuse as-is) |
| `actions/availability/save-availability.ts` | route (server action) | request-response (batch save) | `actions/availability/save-availability-rules.ts` + `create-availability-exception.ts` | exact (evolve/merge) |
| `components/dashboard/agenda/calendar-editor.tsx` (+ subcomponents) | component | event-driven (pointer paint) → request-response | `components/dashboard/agenda/agenda-view.tsx` + `availability-grid.tsx` (replaced) | role-match (client shell reused, interaction new) |
| `app/dashboard/agenda/page.tsx` (modify) | route (RSC) | request-response | itself (v1) | exact (in-place edit) |

## Pattern Assignments

### `supabase/migrations/<ts>_availability_overrides_hybrid.sql` (migration, ALTER+backfill)

**Analog:** `supabase/migrations/20260721000200_availability_exceptions.sql` (the live table this migration ALTERs) — **do NOT recreate it** (D-22; RLS lives on it, recreate = silent RLS loss, Pitfall 2/5).

**Owner-scope RLS mold (all 4 policies, same file):** `supabase/migrations/20260720000500_patient_vaccine_doses.sql` lines 37-74 — the canonical `select/insert/update/delete ... to authenticated using (profile_id in (select id from public.profiles where auth_user_id = auth.uid()))` block. Reference only; **the ALTER migration must NOT re-emit these** — the existing table already carries them (v1 file lines 51-88). Recreating the table would require re-emitting them, which is exactly what D-22 forbids.

**What the ALTER must do (RESEARCH §Modelo de Dados, lines 334-368):**
```sql
-- 1. add override_type; existing rows (v1 folgas) are subtractive
alter table public.availability_exceptions
  add column override_type text not null default 'subtract'
  check (override_type in ('add', 'subtract'));

-- 2. explicit backfill (auditable intent; covers any inherited null)
update public.availability_exceptions
  set override_type = 'subtract'
  where override_type is null;

-- 3. WR-03 minute ceiling (1440 = fim do dia, coherent with WR-04)
alter table public.availability_exceptions
  add constraint availability_exceptions_minute_ceiling
  check (start_minute is null or (start_minute <= 1440 and end_minute <= 1440));

-- 4. slot_minutes for additive bands (AGENDA-05, D-09 applied to override)
alter table public.availability_exceptions add column slot_minutes smallint;
alter table public.availability_exceptions
  add constraint availability_exceptions_add_needs_range_and_slot
  check (
    override_type = 'subtract'
    or (start_minute is not null and end_minute is not null and slot_minutes is not null and slot_minutes > 0)
  );
```

**CHECK-constraint style to mirror:** `availability_rules` migration lines 26-31 (named `constraint <table>_<meaning> check (...)`, one per rule). Apply the same `1440` ceiling to `availability_rules` too (WR-03) via ALTER in this same file.

**Header comment convention:** copy the multi-line intent header from the v1 exceptions migration (lines 1-11) — explain WHY (preserve rows, D-22), forward constraint (Phase 7 writes appointments over the top, no FK now).

---

### `lib/expand-availability.ts` (utility, pure transform) — IN-PLACE REWRITE

**Analog:** itself (v1, `lib/expand-availability.ts`). Keep the whole scaffold; change three things: the `exceptions`→`overrides` type/param, the DST-safe wall-clock (WR-01), and the hybrid precedence (D-21).

**Purity contract to preserve (v1 lines 64-71) — the `computePediatricAge` mold:** never `new Date()` internal, never `process.env.TZ`; `window` + `timeZone` by parameter only.
```typescript
export function expandAvailability(input: {
  rules: AvailabilityBand[]
  overrides: AvailabilityOverride[]   // was `exceptions`
  window: { from: Date; to: Date }
  timeZone: string
}): ExpandResult {
```

**New override type (replaces `AvailabilityException`, v1 lines 26-30):** per RESEARCH lines 385-391 add `type: "add" | "subtract"` and `slotMinutes: number | null`.

**Zone-safe day iteration to KEEP verbatim (v1 lines 81-98):** the `{ in: tz(timeZone) }` context, `eachDayOfInterval`, `startOfDay(day, context)`, and `new TZDate(day, timeZone).getDay()` for weekday are all correct and stay.
```typescript
const context = { in: tz(timeZone) }
const days = eachDayOfInterval({ start: from, end: to }, context)
for (const day of days) {
  const localDate = format(day, "yyyy-MM-dd", context)
  const weekday = new TZDate(day, timeZone).getDay()
```

**WR-01 FIX — the anti-pattern to REMOVE (v1 lines 120-131):** `addMinutes(dayStart, band.startMinute, context)` sums absolute clock-minutes and drifts 1h across a DST transition. Replace with wall-clock construction (RESEARCH Pattern 1, lines 216-236):
```typescript
// REMOVE (v1): addMinutes(dayStart, minute, context)  ← drifts in DST
// USE: derive h/m from minute-of-day and SET in the zone context
function wallClock(day: Date, minuteOfDay: number, timeZone: string): Date {
  const ctx = { in: tz(timeZone) }
  let d = setHours(day, Math.floor(minuteOfDay / 60), ctx)
  d = setMinutes(d, minuteOfDay % 60, ctx)
  d = setSeconds(d, 0, ctx); d = setMilliseconds(d, 0, ctx)
  return new Date(d.getTime())
}
// slot advance ALSO wall-clock: wallClock(day, currentMinute + slotMinutes), never addMinutes on the instant
```

**D-10 emit + half-open compare to KEEP (v1 lines 123-135):** `while (advance <= bandEnd)` for whole-slot-only, and window recut with `slotStart >= from && slotStart < to` (half-open, `<` never `<=`, D-11).

**D-21 hybrid precedence — NEW body logic (RESEARCH Pattern 2, lines 239-252):**
```
slotsDoDia = template(weekday) ∪ additiveOverrides(date)   // union, dedupe by start.getTime()
slotsDoDia = slotsDoDia − subtractiveOverrides(date)        // folga wins, applied LAST
```
Full-day subtractive (`startMinute === null`) removes template AND additives (extend v1 lines 100-110 `fullDayBlocked` to also drop additives). Partial-subtractive overlap check reuses v1 lines 127-132 half-open overlap (`slotStart < exEnd && slotEnd > exStart`). Dedupe additive-over-template by `start.getTime()` (Pitfall 3).

---

### `lib/expand-availability.spec.ts` (test, transform) — ADD CASES

**Analog:** itself (v1, 13 cases) + `lib/compute-pediatric-age.spec.ts` for structure. Node built-in test runner (`tsx --test`, run via `yarn test`).

**New cases required (RESEARCH lines 411-418):** DST-safe (America/New_York spring-forward 2026-03-08 under `TZ=UTC` and `TZ=America/New_York`); additive-basic (AGENDA-05); additive-over-template dedupe; additive+subtractive same band (folga wins → 0); full-day subtractive removes additives; additive with own `slotMinutes`; combined precedence. Keep all 13 v1 cases (map `exceptions`→`overrides` with `type`).

---

### `lib/schemas/availability.ts` (config/schema, transform) — IN-PLACE EDIT

**Analog:** itself (v1). Keep `availabilityRuleSchema` (lines 13-37) and `saveAvailabilityRulesSchema` (lines 40-42). Evolve `createAvailabilityExceptionSchema` (lines 45-82) into the override schema.

**WR-02 FIX — replace the loose `Date.parse` (v1 lines 48-52):**
```typescript
// REMOVE: .refine((value) => !Number.isNaN(Date.parse(value)), "Data da exceção inválida.")
// USE the strict ISO + real-date pattern from compute-pediatric-age.ts (lines 84, 91-104):
const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
// + reject rollovers (2026-02-30) by rebuilding the Date and comparing y/m/d back
```

**WR-03 FIX — add ceiling (missing in v1):** add `.max(1440, "...")` to `start_minute`/`end_minute` (mirrors the DB CHECK). Keep the `multipleOf30` refine (v1 line 10) and the "both-or-neither" + "end > start" refines (v1 lines 65-82). Add `override_type: z.enum(["add", "subtract"])` and conditional `slot_minutes` (required + `>0` when `type === "add"`, per RESEARCH V5 line 562).

**PT-BR messages inline** — every message stays Portuguese (v1 style throughout; `zodErrorToUserMessage` maps at the action boundary).

---

### `modules/availability/types.ts` (model) — IN-PLACE EDIT

**Analog:** itself (v1, lines 22-29). Keep `AvailabilityRuleRow`. Extend `AvailabilityExceptionRow` (add `override_type: "add" | "subtract"` and `slot_minutes: number | null`); optionally alias `AvailabilityOverrideRow`. Keep the owner-scope doc header (lines 1-8).

---

### `modules/availability/list-availability-overrides.ts` (service, CRUD read)

**Analog:** `modules/availability/list-availability-exceptions.ts` (verbatim shape). One fn/file, `SupabaseClient` injected first, `.eq("profile_id", profileId)` ownership backstop (IDOR defense, D-13), `[AVAILABILITY]` error tag.
```typescript
export async function listAvailabilityExceptions(supabase: SupabaseClient, profileId: string): Promise<AvailabilityExceptionRow[]> {
  const { data, error } = await supabase
    .from("availability_exceptions")
    .select("id, profile_id, exception_date, start_minute, end_minute, created_at")  // ADD: override_type, slot_minutes
    .eq("profile_id", profileId)
    .order("exception_date", { ascending: true })
  if (error) throw new Error(`[AVAILABILITY] Failed to list availability exceptions: ${error.message}`)
  return (data ?? []) as AvailabilityExceptionRow[]
}
```
**Change:** add `override_type, slot_minutes` to the `.select(...)` string.

---

### `modules/availability/create-availability-override.ts` (service, CRUD create)

**Analog:** `modules/availability/create-availability-exception.ts` (lines 20-42). Keep the **profile_id stamped server-side** rule (never trust client — IDOR, D-13, line 27), `.select(...).single()`, `[AVAILABILITY]` tag. Add `override_type` and `slot_minutes` to the insert payload and the input type.

---

### `modules/availability/delete-availability-override.ts` (service, CRUD delete)

**Analog:** `modules/availability/delete-availability-exception.ts` (lines 13-28). Copy verbatim — the **double-scoped delete** (`.eq("profile_id", profileId).eq("id", id)`) is the exact IDOR backstop (never delete by id alone), and it is idempotent (no-op on missing). Only the table stays `availability_exceptions`.

---

### `modules/availability/upsert-availability-rules.ts` (service, CRUD) — REUSE AS-IS

**Analog:** itself. The **delete-then-insert whole-grid** strategy (lines 24-57) is exactly what the batch save needs for the recurring template. No change unless the batch action needs it wrapped. Empty array clears the grid (line 39).

---

### `actions/availability/save-availability.ts` (server action, batch save)

**Analog:** `actions/availability/save-availability-rules.ts` (whole file) merged with `create-availability-exception.ts`. The action gate + validate + result-union skeleton is identical and MUST be copied:
```typescript
"use server"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
// ...
export async function saveAvailabilityAction(input): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }
  const parsed = <schema>.safeParse(input)
  if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }
  try {
    // reconcile the diff (RESEARCH lines 489-495):
    //   upsertAvailabilityRules(supabase, profile.id, parsed.data.rules)   // delete-then-insert
    //   create each of parsed.data.overridesAdd
    //   delete each of parsed.data.overridesRemove (scoped profile_id + id)
    revalidatePath("/dashboard/agenda")
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Não foi possível salvar a disponibilidade. Tente novamente."
    return { ok: false, error: message }
  }
}
```
**Barrel:** export from `actions/availability/index.ts` (v1 lines 1-13 pattern). Reuse the paid-gate error strings verbatim (v1 lines 33-38).

---

### `components/dashboard/agenda/calendar-editor.tsx` (+ subcomponents) (component, event-driven → request-response)

**Analog (replaced):** `components/dashboard/agenda/agenda-view.tsx` (client shell) + `availability-grid.tsx` (painting/derivation). The interaction is new (single editable surface, paint+batch), but reuse:

**Client-component + zone-helper header (agenda-view.tsx lines 1-64):** `"use client"`, `import { tz, TZDate } from "@date-fns/tz"`, `Tabs/TabsList/TabsTrigger` (Dia/Semana/Mês, D-14), `ptBR` locale, and the two helpers `localDateOf` (line 55-58, `format(date, "yyyy-MM-dd", { in: tz(timeZone) })`) and `localMinuteOf` (line 61-64, `new TZDate(new Date(iso), timeZone).getHours()*60 + getMinutes()`). `STEP = 30` (D-03).

**Client-side re-expansion (D-14 discretion → cliente):** the RSC passes raw `rules[]` + `overrides[]`; the client calls `expandAvailability` on navigation. `agenda-view.tsx` lines 4-13 already import `addDays, addMonths, startOfMonth, endOfMonth, startOfWeek, format` under the tz context — reuse for window computation per view.

**Grid derivation to REUSE (availability-grid.tsx lines 50-70):** `cellKey(weekday, minute)` painted-set model and `bandsForDay(...)` (converts painted cells → contiguous `{start,end}` bands). This is precisely the paint→bands logic the batch diff needs. Toast on save via `sonner` (availability-grid.tsx line 5, `toast`).

**NEW logic (RESEARCH Patterns 3 & 4, lines 254-298) — no analog, use RESEARCH:**
- Local `draft` state + `isDirty` (`!deepEqual(draft, initial)`), Salvar shows unsaved state (D-17).
- `beforeunload` guard when dirty; `AlertDialog` ("mudanças não salvas — descartar?") on tab switch / exit (Pitfall 6). Use `components/ui/alert-dialog.tsx`.
- Pointer-events paint (`setPointerCapture`, `pointerdown/move/up`), `touch-action: none`; **click-toggle is the mandatory baseline**, drag is enhancement (D-16, A4).
- Toggle Disponibilidade|Folga (D-15): verde = disponível; folga = neutral (`bg-muted`/hatch + "Folga" badge), NOT destructive-red.
- Month tab = indicator only (dot + count from `byDay`), no painting (D-18) — reuse agenda-view month grid.

---

### `app/dashboard/agenda/page.tsx` (RSC) — IN-PLACE EDIT

**Analog:** itself (v1). Keep the whole shell; change the exceptions→overrides mapping and the child component.

**Gate + scoped load to KEEP (v1 lines 29-40):** auth redirect + **paid gate redirect** (line 35, mirrors the action gate — the RLS `to authenticated` does NOT enforce subscription), `Promise.all` scoped loads.
```typescript
if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")
const [ruleRows, overrideRows] = await Promise.all([
  listAvailabilityRules(supabase, profile.id),
  listAvailabilityOverrides(supabase, profile.id),   // was listAvailabilityExceptions
])
```

**Default-week window to KEEP (v1 lines 44-46):** `startOfWeek(new Date(), { ...context, weekStartsOn: 1 })` (Monday, D-11), `addDays(weekStart, 7, context)` (half-open).

**Mapping to CHANGE (v1 lines 55-59):** map override rows to include `type: r.override_type` and `slotMinutes: r.slot_minutes` (RESEARCH lines 467-473), and call `expandAvailability({ rules, overrides, window, timeZone })`. Keep serialize-slots-to-ISO (lines 69-73) and pass raw `rules`+`overrides` to the client for client-side re-expansion. Swap `<AgendaView>` for `<CalendarEditor>`.

---

## Shared Patterns

### Auth + Paid Gate (every action + RSC)
**Source:** `actions/availability/save-availability-rules.ts` lines 31-38; RSC form `app/dashboard/agenda/page.tsx` lines 31-35.
**Apply to:** `save-availability.ts`, `page.tsx`.
```typescript
const { profile } = await getAuthenticatedUser(supabase)
if (!profile) return { ok: false, error: "Sessão não encontrada." }
if (profile.status !== "paid")
  return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }
// RSC variant: if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")
```

### Ownership scoping / IDOR defense (every module)
**Source:** `modules/availability/list-availability-exceptions.ts` line 19; `create-availability-exception.ts` line 27 (stamp server-side); `delete-availability-exception.ts` lines 20-23 (double-scoped delete).
**Apply to:** all `modules/availability/*` override files.
```typescript
.eq("profile_id", profileId)                 // read/write backstop, never omit
.insert({ profile_id: profileId, ... })       // stamp server-side, never trust client
.delete().eq("profile_id", profileId).eq("id", id)  // delete scoped by BOTH, idempotent
```

### Module conventions (one fn/file, injected client, error tag)
**Source:** every file in `modules/availability/`.
**Apply to:** all new override modules.
- `SupabaseClient` is the first param (injected, never constructed).
- Never import `next/cache` / `next/headers` in a module.
- Throw `new Error("[AVAILABILITY] ...")` on failure; the action catches and converts to a result union.

### Action result union + revalidate
**Source:** `actions/availability/save-availability-rules.ts` lines 14-16, 40-55.
**Apply to:** `save-availability.ts`.
```typescript
type Result = { ok: true } | { ok: false; error: string }
const parsed = schema.safeParse(input)
if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }
try { /* modules */ revalidatePath("/dashboard/agenda"); return { ok: true } }
catch (e) { return { ok: false, error: e instanceof Error ? e.message : "..." } }
```

### DST-safe zone arithmetic (fn + client, `@date-fns/tz`)
**Source (correct usage to KEEP):** `page.tsx` lines 44-46 (`{ in: tz(CLINIC_TIME_ZONE) }`, `weekStartsOn: 1`); `agenda-view.tsx` lines 55-64 (`tz`/`TZDate` helpers); `CLINIC_TIME_ZONE` from `lib/clinic-timezone.ts`.
**Anti-pattern to REMOVE:** `addMinutes(startOfDay(...), minute)` (`expand-availability.ts` v1 lines 120-131) — WR-01. Use wall-clock `setHours/setMinutes` in the zone context (RESEARCH Pattern 1).
**Apply to:** `expand-availability.ts`, `calendar-editor.tsx`.

### Strict ISO date validation (WR-02 fix)
**Source:** `lib/compute-pediatric-age.ts` lines 84 (`ISO_DATE_ONLY` regex) + 91-104 (`localMidnightFromIso`: regex + rebuild-and-compare to reject `2026-02-30`).
**Apply to:** `lib/schemas/availability.ts` override date field.

### Owner-scoped migration (RLS + policies same file)
**Source:** `supabase/migrations/20260720000500_patient_vaccine_doses.sql` lines 37-74 (enable RLS + 4 policies), lines 17-25 (owner FK + CHECK grain); `availability_rules.sql` lines 26-31 (named CHECK style).
**Apply to:** the hybrid migration — **but only as a reference**: the ALTER preserves the existing table's RLS; do NOT re-emit policies unless recreating (forbidden, D-22).

### Pure-fn + spec mold
**Source:** `lib/compute-pediatric-age.ts` (no `new Date()` internal for the core, deterministic, banded types + JSDoc) + `lib/compute-pediatric-age.spec.ts`.
**Apply to:** `expand-availability.ts` rewrite + `.spec.ts`.

## No Analog Found

None. Every v2 file has a live v1 counterpart or a canonical repo mold. The only genuinely new *behaviors* (no code analog) are the client draft/dirty/discard guard (RESEARCH Pattern 3) and pointer-events painting (RESEARCH Pattern 4) inside `calendar-editor.tsx` — the surrounding client-component shell, zone helpers, and paint→bands derivation are all reused from `agenda-view.tsx` / `availability-grid.tsx`.

## Metadata

**Analog search scope:** `lib/`, `lib/schemas/`, `modules/availability/`, `actions/availability/`, `components/dashboard/agenda/`, `app/dashboard/agenda/`, `supabase/migrations/`.
**Files scanned (read in full or targeted):** 15 live source files.
**Pattern extraction date:** 2026-07-21
