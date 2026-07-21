# Phase 6: Disponibilidade & Calendário do Médico - Pattern Map

**Mapped:** 2026-07-21
**Files analyzed:** 18 (2 migrations, 2 pure-lib + specs, 1 lib const, ~6 modules, ~5 actions/schema, 2 pages, 2+ components, 1 sidebar edit)
**Analogs found:** 15 / 18 (3 são greenfield: expand-availability, clinic-timezone, agenda CSS-grid)

Todos os excertos abaixo são caminhos absolutos e números de linha do repo atual. O planner deve referenciar o **analog + linhas** diretamente nas ações de cada plano.

## File Classification

| Arquivo novo/modificado | Papel | Fluxo de dados | Analog mais próximo | Qualidade |
|-------------------------|-------|----------------|---------------------|-----------|
| `supabase/migrations/<ts>_availability_rules.sql` | migration | persistência (owner-scoped) | `supabase/migrations/20260720000500_patient_vaccine_doses.sql` | exact |
| `supabase/migrations/<ts>_availability_exceptions.sql` | migration | persistência (owner-scoped) | `supabase/migrations/20260720000500_patient_vaccine_doses.sql` | exact |
| `lib/clinic-timezone.ts` | config/constant | — | `lib/compute-pediatric-age.ts` (constantes exportadas L59-83) | partial (só padrão de const) |
| `lib/expand-availability.ts` | utility (função pura) | transform (regras→slots) | `lib/compute-pediatric-age.ts` | role-match (greenfield na lógica de fuso) |
| `lib/expand-availability.spec.ts` | test | transform | `lib/compute-pediatric-age.spec.ts` | exact |
| `modules/availability/list-availability-rules.ts` | module (query) | CRUD read | `modules/patient-vaccine-doses/get-taken-dose-ids-by-patient.ts` | exact |
| `modules/availability/upsert-availability-rules.ts` | module (query) | CRUD write | `modules/patient-vaccine-doses/mark-dose-taken.ts` | role-match (upsert em lote) |
| `modules/availability/list-availability-exceptions.ts` | module (query) | CRUD read | `modules/patient-vaccine-doses/get-taken-dose-ids-by-patient.ts` | exact |
| `modules/availability/create-availability-exception.ts` | module (query) | CRUD write | `modules/patient-vaccine-doses/mark-dose-taken.ts` | role-match |
| `modules/availability/delete-availability-exception.ts` | module (query) | CRUD write | `modules/patient-vaccine-doses/unmark-dose-taken.ts` | role-match |
| `modules/availability/types.ts` | module (types) | — | `modules/patient-vaccine-doses/types.ts` | exact |
| `lib/schemas/availability.ts` | config (zod) | validation | `lib/schemas/patient-vaccine-dose.ts` | exact |
| `actions/availability/*.ts` + `index.ts` | action | request-response | `actions/patient-vaccine-doses/toggle-patient-vaccine-dose.ts` + `index.ts` | exact |
| `app/dashboard/agenda/page.tsx` | route (RSC) | request-response (read) | `app/dashboard/vaccines/page.tsx` | exact |
| `components/dashboard/agenda/agenda-view.tsx` (day/week/month) | component (client) | event-driven (interação) | `components/dashboard/vaccines/vaccine-calendar-view.tsx` | role-match (CSS grid é greenfield) |
| `components/dashboard/agenda/availability-grid.tsx` (editor D-01) | component (client) | event-driven | `components/dashboard/vaccines/vaccine-calendar-view.tsx` | role-match (grade clicável é greenfield) |
| seletor de data de exceção | component (client) | event-driven | `components/ui/calendar.tsx` (react-day-picker, reuso direto) | exact (reuso) |
| `components/app-sidebar.tsx` (adicionar item "Agenda") | component (edit) | — | `components/app-sidebar.tsx` L37-80 | exact (self) |

## Pattern Assignments

### `supabase/migrations/<ts>_availability_rules.sql` + `<ts>_availability_exceptions.sql` (migration, owner-scoped)

**Analog:** `supabase/migrations/20260720000500_patient_vaccine_doses.sql` (template owner-scoped completo: tabela + comentário PT-BR + índice + RLS + 4 policies na MESMA migration).

**Tabela + FK + índice** (L17-31):
```sql
create table public.patient_vaccine_doses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  ...
  constraint patient_vaccine_doses_unique_mark unique (profile_id, patient_id, schedule_item_id)
);

comment on table public.patient_vaccine_doses is 'Doses vacinais aplicadas ...';

create index idx_patient_vaccine_doses_profile_patient
  on public.patient_vaccine_doses (profile_id, patient_id);
```
> Para availability: `availability_rules` sem unique em `(profile_id, weekday)` (múltiplas faixas/dia, D-02); índice `(profile_id, weekday)`. `availability_exceptions` índice `(profile_id, exception_date)`. Adicionar os CHECK constraints do RESEARCH Data Model (múltiplo de 30 D-03, `end > start`, `slot_minutes > 0`, `(start_minute is null) = (end_minute is null)` D-04).

**RLS + as 4 policies (mesma migration, D-13)** (L37-74):
```sql
alter table public.patient_vaccine_doses enable row level security;

create policy "Patient vaccine doses select own"
on public.patient_vaccine_doses for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);
-- insert: with check (...); update: using (...) with check (...); delete: using (...)
```
> Copiar as 4 policies (select/insert/update/delete) verbatim trocando o nome da tabela. Owner-scoped por `profile_id in (select id from public.profiles where auth_user_id = auth.uid())`.

**Regra crítica de RLS** — de `supabase/migrations/20260720000100_rls_vaccine_schedules.sql` L2-4:
```
-- Enabling RLS without a SELECT policy = silent total denial (zero rows, no error).
-- Apply order matters: table -> rls -> seed.
```
> Aplica-se a availability: RLS + TODAS as policies no mesmo arquivo. (Pitfall 5 do RESEARCH.) NÃO seguir o `using (true)` global daquele arquivo — availability é owner-scoped, não global-read.

---

### `lib/expand-availability.ts` (utility, função pura transform) — CORAÇÃO DA FASE

**Analog:** `lib/compute-pediatric-age.ts` (molde de função pura determinística: recebe o "tempo" por parâmetro, sem I/O, JSDoc rico, constantes nomeadas no topo).

**Imports date-fns + padrão de constantes exportadas** (`compute-pediatric-age.ts` L1-9, L59-83):
```typescript
import {
  addDays, differenceInDays, /* ... */ isValid,
} from "date-fns"
// constantes nomeadas exportadas no topo — sem magic numbers espalhados
export const FULL_TERM_GESTATIONAL_WEEKS = 40
```
> Para expand-availability, importar de date-fns `startOfWeek, startOfDay, addMinutes, addDays, eachDayOfInterval` e de `@date-fns/tz` `tz, TZDate`. A constante de fuso vive em `lib/clinic-timezone.ts` (`export const CLINIC_TIME_ZONE = "America/Sao_Paulo"`), importada aqui.

**Determinismo: tempo/janela por parâmetro** (`compute-pediatric-age.ts` L160-165):
```typescript
export function computePediatricAge(
  birthDateIso: string | null | undefined,
  now: Date = new Date(),   // ← nunca lê o relógio internamente sem permitir override
  ...
): PediatricAge {
```
> Espelhar: `expandAvailability({ rules, exceptions, window: {from, to}, timeZone })` — nunca lê `process.env.TZ` nem `new Date()` interno. Assinatura exata no RESEARCH §Pure Slot-Expansion (L326-357). Fuso via context `{ in: tz(CLINIC_TIME_ZONE) }` (RESEARCH Pattern 1, L189-207; código pronto L408-423).

**Anti-patterns a herdar** (`compute-pediatric-age.ts` L84-104): NÃO usar `new Date("YYYY-MM-DD")` (UTC midnight → off-by-one BRT); construir instantes via `TZDate`/`{ in }`. Comparar limites meio-aberto `[start, end)` com `< end`, nunca `<=` (D-11).

---

### `lib/expand-availability.spec.ts` (test)

**Analog:** `lib/compute-pediatric-age.spec.ts` (node:test + assert/strict, `now`/janela explícitos p/ TZ-independência).

**Estrutura de teste + independência de fuso** (L1-13):
```typescript
import test from "node:test"
import assert from "node:assert/strict"
import { computePediatricAge } from "@/lib/compute-pediatric-age"

// All tests pass an explicit `now` (local-constructed) so they are deterministic
// and independent of the machine timezone.
test("missing birth date (null) → status ...", () => {
  assert.deepEqual(computePediatricAge(null, new Date(2026, 5, 28)), { ... })
})
```
> Cobrir os casos travados (RESEARCH L368-381): D-02 múltiplas faixas, D-09 duração por faixa, D-10 sobra descartada + divisão exata, D-04 exceção dia-todo / parcial / não-sobreposta, D-11 virada de semana/dia meio-aberta, e a **asserção-chave de fuso**: mesmos inputs com `timeZone="America/Sao_Paulo"` produzem os mesmos slots rodando com `TZ=UTC` e `TZ=America/New_York`. Coletado por `find modules lib -name '*.spec.ts' | xargs tsx --test`.

---

### `modules/availability/list-*.ts` (module, CRUD read)

**Analog:** `modules/patient-vaccine-doses/get-taken-dose-ids-by-patient.ts` (uma fn exportada, `SupabaseClient` injetado 1º arg, `.eq(profile_id)` como defesa IDOR além da RLS, `throw new Error("[DOMAIN] ...")`).

**Padrão completo** (L16-34):
```typescript
export async function getTakenDoseIdsByPatient(
  supabase: SupabaseClient,
  profileId: string,
  patientId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("patient_vaccine_doses")
    .select("schedule_item_id")
    .eq("profile_id", profileId)   // defense-in-depth além da RLS
    .eq("patient_id", patientId)
  if (error)
    throw new Error(`[VACCINE_DOSES] Failed to fetch taken doses: ${error.message}`)
  ...
}
```
> Para availability: `[AVAILABILITY]` como domain tag. Select explícito (não `*`) — skill supabase-falaped. `list-availability-rules(supabase, profileId)` e `list-availability-exceptions(supabase, profileId)`. Ver também o excerto pronto no RESEARCH L428-441.

---

### `modules/availability/upsert-availability-rules.ts` / `create-*` / `delete-*` (module, CRUD write)

**Analog:** `modules/patient-vaccine-doses/mark-dose-taken.ts` (upsert idempotente, stamp de `profile_id` server-side).

**Padrão de write scoped** (L18-40):
```typescript
export async function markDoseTaken(
  supabase: SupabaseClient,
  profileId: string,
  patientId: string,
  scheduleItemId: string,
): Promise<void> {
  const { error } = await supabase
    .from("patient_vaccine_doses")
    .upsert({ profile_id: profileId, patient_id: patientId, schedule_item_id: scheduleItemId },
      { onConflict: "...", ignoreDuplicates: true })
  if (error)
    throw new Error(`[VACCINE_DOSES] Failed to mark dose taken: ${error.message}`)
}
```
> `upsert-availability-rules` grava a grade inteira editada (delete-then-insert por `profile_id`, ou upsert em lote). SEMPRE stampar `profile_id` server-side (nunca confiar no cliente). Domain tag `[AVAILABILITY]`. `delete-availability-exception` espelha `unmark-dose-taken.ts` (delete scoped por profile_id + id).

---

### `modules/availability/types.ts` (module types)

**Analog:** `modules/patient-vaccine-doses/types.ts` (row em snake_case espelhando a coluna do DB, JSDoc explicando escopo).

**Padrão** (L10-18):
```typescript
/** Row mirroring `public.patient_vaccine_doses` (snake_case). */
export type PatientVaccineDose = {
  id: string
  profile_id: string
  patient_id: string
  ...
}
```
> `AvailabilityRule` e `AvailabilityException` em snake_case. Tipos camelCase da função pura (`AvailabilityBand`, `FreeSlot`, `ExpandResult`) ficam em `lib/expand-availability.ts` (RESEARCH L328-357) — mapear snake→camel na leitura.

---

### `lib/schemas/availability.ts` (config, zod validation)

**Analog:** `lib/schemas/patient-vaccine-dose.ts` (schema + `z.infer` type export, mensagens PT-BR inline).

**Padrão** (L8-16):
```typescript
export const togglePatientVaccineDoseSchema = z.object({
  patientId: z.string().uuid("Paciente inválido."),
  ...
  taken: z.boolean(),
})
export type TogglePatientVaccineDoseInput = z.infer<typeof togglePatientVaccineDoseSchema>
```
> Para availability: validar `weekday` no range, `start_minute < end_minute`, múltiplos de 30 (D-03), `slot_minutes > 0`, data de exceção válida, faixa opcional coerente (D-04). Mensagens PT-BR. Erros mapeados via `lib/zod-error-message.ts` no action.

---

### `actions/availability/*.ts` + `index.ts` (action, request-response)

**Analog:** `actions/patient-vaccine-doses/toggle-patient-vaccine-dose.ts` (gate auth+paid, zod safeParse, ownership verify, result union, revalidatePath) + `actions/patient-vaccine-doses/index.ts` (barrel).

**Cabeçalho + gate auth/paid** (L1-42):
```typescript
"use server"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { togglePatientVaccineDoseSchema, type TogglePatientVaccineDoseInput } from "@/lib/schemas/..."
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type TogglePatientVaccineDoseResult =
  | { ok: true; taken: boolean }
  | { ok: false; error: string }

export async function togglePatientVaccineDoseAction(input): Promise<...> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }
  const parsed = schema.safeParse(input)
  if (!parsed.success) { ... return { ok: false, error: msg } }
```

**Try/delegate/revalidate/catch** (L51-70):
```typescript
  try {
    await markDoseTaken(supabase, profile.id, patientId, scheduleItemId)
    revalidatePath(`/dashboard/patients/${patientId}`)
    return { ok: true, taken }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao ... Tente novamente."
    return { ok: false, error: message }
  }
}
```

**Barrel** (`index.ts` L1-4):
```typescript
export { togglePatientVaccineDoseAction, type TogglePatientVaccineDoseResult } from "./toggle-..."
```
> Actions de availability: `saveAvailabilityRulesAction`, `createAvailabilityExceptionAction`, `deleteAvailabilityExceptionAction` (sufixo `Action`). `revalidatePath("/dashboard/agenda")`. **Registrar cada action no barrel do domínio E no `actions/index.ts` raiz** (ver `actions/index.ts`).

---

### `app/dashboard/agenda/page.tsx` (route, RSC read)

**Analog:** `app/dashboard/vaccines/page.tsx` (RSC: createClient → getAuthenticatedUser → redirect se sem perfil → gate paid → reads em `Promise.all` → passa dados a componente client).

**Shell RSC + gate** (L12-39):
```typescript
export default async function VaccinesPage({ searchParams }: {...}) {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")
  // Paid gate (D-10): RLS `to authenticated` NÃO impõe a assinatura — check separado
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const [sus, sbim, gestante] = await Promise.all([ ... ])
  return ( <div className="flex flex-col gap-6"> <header .../> ...<ClientView .../> </div> )
}
```
> Para agenda: ler `list-availability-rules` + `list-availability-exceptions` em `Promise.all`, computar janela da view (default = SEMANA, D-06) via `startOfWeek({ in: tz(CLINIC_TIME_ZONE), weekStartsOn: 1 })`, chamar `expandAvailability(...)` server-side, passar `slots` + `byDay` ao componente client. Header PT-BR com ícone lucide + `<Separator />` (mesmo layout).

---

### `components/dashboard/agenda/agenda-view.tsx` e `availability-grid.tsx` (component client, event-driven)

**Analog:** `components/dashboard/vaccines/vaccine-calendar-view.tsx` (`"use client"`, props tipadas inline, Tabs para trocar de view, `cn()` para classes, reuso de função pura de `lib/`).

**`"use client"` + reuso da fn pura + Tabs/estado de view** (L1-11, L32-79):
```typescript
"use client"
import { cn } from "@/lib/utils"
import { computePediatricAge } from "@/lib/compute-pediatric-age"   // reusa lib pura
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function VaccineCalendarView({ sus, sbim, ... className }: {
  sus: VaccineScheduleWithItems | null
  ...
}) {
  return (
    <Tabs defaultValue="crianca" className={cn("flex flex-col gap-6", className)}>
      <TabsList>...<TabsTrigger value="crianca">...</TabsTrigger></TabsList>
      <TabsContent value="crianca"><div className="grid grid-cols-1 gap-4 md:grid-cols-2">...</div></TabsContent>
    </Tabs>
  )
}
```
> Para agenda-view: `Tabs` para dia/semana/mês (default="semana", D-06). Grade dia/semana = **CSS grid custom Tailwind** (RESEARCH Pattern 3, L213-231 — `gridTemplateColumns`/`gridTemplateRows`, `sticky` no gutter/header) — NÃO existe analog de grade de agenda no repo (greenfield, D-08). Mês = indicador leve por dia usando `byDay` (D-07). `availability-grid.tsx` = grade clicável de edição (greenfield, D-01) que chama `saveAvailabilityRulesAction`. Strings PT-BR.

**Seletor de data de exceção:** reusar `components/ui/calendar.tsx` (react-day-picker, `locale = ptBR`) diretamente — NÃO como grade de agenda (D-08).

---

### `components/app-sidebar.tsx` (modificação — registrar rota Agenda)

**Analog:** o próprio arquivo, L37-80 (array `navMain`, grupos com `title`/`icon`/`items[{title,url}]`).

**Padrão de item de nav** (L66-78):
```typescript
{
  title: "Serviços",
  icon: FileCheckIcon,
  items: [
    { title: "Vacinas", url: "/dashboard/vaccines" },
    ...
  ],
},
```
> Adicionar `{ title: "Agenda", url: "/dashboard/agenda" }` — provavelmente em novo grupo "Agenda" ou dentro de "Atendimentos" (L46-55). Importar um ícone lucide (ex. `CalendarIcon`) no bloco de imports L7-13.

## Shared Patterns

### Gate de autorização (auth + paid) — defense-in-depth
**Source (action):** `actions/patient-vaccine-doses/toggle-patient-vaccine-dose.ts` L34-41.
**Source (RSC):** `app/dashboard/vaccines/page.tsx` L19-24.
**Apply to:** TODO action novo de availability + `app/dashboard/agenda/page.tsx`.
```typescript
const { profile } = await getAuthenticatedUser(supabase)
if (!profile) return { ok: false, error: "Sessão não encontrada." }  // action
if (profile.status !== "paid") return { ok: false, error: "Perfil não ativo. ..." }
// RSC: redirect em vez de return
```

### Escopo por profile_id (IDOR) — módulo + RLS
**Source:** `modules/patient-vaccine-doses/get-taken-dose-ids-by-patient.ts` L21-26 (`.eq("profile_id", profileId)`) + migration RLS L39-45.
**Apply to:** TODA query de availability (`.eq("profile_id", profileId)`) + as 4 policies RLS em ambas as tabelas.

### Erro em módulo vs result union em action
**Source (módulo):** `modules/patient-vaccine-doses/mark-dose-taken.ts` L38-39 (`throw new Error("[VACCINE_DOSES] ...")`).
**Source (action):** `actions/patient-vaccine-doses/toggle-patient-vaccine-dose.ts` L64-70 (catch → `{ ok: false, error }`).
**Apply to:** módulos de availability lançam `[AVAILABILITY] ...`; actions capturam e retornam union.

### Validação Zod no boundary
**Source:** `lib/schemas/patient-vaccine-dose.ts` L8-16 + `actions/.../toggle-*.ts` L43-49 (`safeParse` + mensagem PT-BR).
**Apply to:** todo action de availability valida input antes de delegar ao módulo.

### Função pura testável em lib/ (molde central desta fase)
**Source:** `lib/compute-pediatric-age.ts` (assinatura determinística, JSDoc, constantes) + `lib/compute-pediatric-age.spec.ts` (node:test, `now` explícito, TZ-independente).
**Apply to:** `lib/expand-availability.ts` + `.spec.ts` — o único código de negócio genuinamente novo (D-12).

## No Analog Found

Arquivos sem match próximo no repo (planner deve usar os padrões do RESEARCH.md):

| Arquivo | Papel | Fluxo | Motivo |
|---------|-------|-------|--------|
| `lib/expand-availability.ts` (lógica de fuso) | utility | transform | Não há tratamento de fuso no repo hoje (sem `@date-fns/tz`, sem `America/Sao_Paulo`). A ESTRUTURA copia `compute-pediatric-age.ts`; a lógica `{ in: tz(...) }` é greenfield → RESEARCH Patterns 1-2 + Code Examples (L185-231, L396-423). Declarar `@date-fns/tz` via `yarn add`. |
| `lib/clinic-timezone.ts` | config | — | Constante nova; só o PADRÃO de const exportada vem de `compute-pediatric-age.ts` L59. Conteúdo (`America/Sao_Paulo`) é greenfield. |
| `components/dashboard/agenda/agenda-view.tsx` (grade CSS) | component | event-driven | `components/ui/calendar.tsx` é date-picker, NÃO agenda (D-08). Grade dia/semana em CSS grid é greenfield → RESEARCH Pattern 3 (L213-231). Só o esqueleto de componente client vem do analog de vaccines. |

## Metadata

**Analog search scope:** `supabase/migrations/`, `lib/`, `modules/patient-vaccine-doses/`, `actions/`, `app/dashboard/`, `components/dashboard/`, `components/ui/`, `components/app-sidebar.tsx`, `.cursor/skills/`.
**Files scanned:** ~30 (14 lidos na íntegra).
**Pattern extraction date:** 2026-07-21
**Skills consultados:** supabase-falaped (query por arquivo, client injetado, select explícito), dashboard-falaped (estrutura app/modules/lib, page = shell fino + Content/Loading).
