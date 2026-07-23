# Phase 7: Consultas & Ciclo de Status - Research

**Researched:** 2026-07-22
**Domain:** Postgres exclusion constraints (não-double-booking), pg enum status cycle, Supabase/Next.js Server Actions, timezone-anchored appointment intervals
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** A consulta ocupa **exatamente 1 slot** da grade — a duração vem do `slot_minutes` da faixa expandida (Fase 6, D-09). NÃO há duração livre nesta fase.
- **D-02:** A consulta **só pode ser criada num slot livre** expandido (dentro da disponibilidade recorrente/aditiva, e não bloqueado por folga). Sem "forçar" horário fora da disponibilidade.
- **D-03:** Criação a partir do **calendário da Fase 6**: clicar num **slot livre** abre um **dialog** para buscar/escolher um paciente já cadastrado e criar a consulta. Caminho primário (não um form separado).
- **D-04:** A escolha do paciente **reusa o domínio `patients` existente** (busca escopada por `profile_id`; `find-patient-by-profile-id-name-responsible`, `get-patients-by-profile-id`). Não criar cadastro de paciente aqui — só selecionar existente.
- **D-05:** Ao **o médico** criar, a consulta nasce **Confirmada** direto. O fluxo pendente é a entrada da assistente (Fase 9), mas o médico **já consegue confirmar/recusar** pedidos pendentes existentes nesta fase (APPT-03) — a UI de lista/ação de pedidos existe.
- **D-06:** Ciclo: `solicitada (pending) → confirmada → realizada | falta | cancelada`. **Recusar** um pedido = **Cancelada** (libera o horário). `realizada`, `falta`, `cancelada` são **estados finais** (não reabrem nesta fase). `falta` é **distinta** de `cancelada`.
- **D-07:** Apenas **pendente + confirmada "seguram" o horário** (entram na exclusion constraint). `realizada`/`falta`/`cancelada` NÃO seguram — o horário fica livre para re-marcar, mas a consulta histórica continua visível na agenda.
- **D-08:** Exclusion constraint **no banco**, escopada por `profile_id`, sobre o intervalo de tempo da consulta, ativa apenas quando `status in ('pending','confirmed')`. A violação (23P01) é capturada no action e vira **result union amigável**, nunca erro cru. Forma exata a critério do research/planner (greenfield no repo).
- **D-09:** Owner-scoped por `profile_id` + RLS habilitada + policies na mesma migration (molde `patient_vaccine_doses`/`availability_*`). Três camadas `app/ → actions/ → modules/`, uma fn por arquivo, `SupabaseClient` injetado, error tag `[APPOINTMENTS]`, gate `profile.status === "paid"` em actions e no RSC.
- **D-10:** Fuso fixo **America/Sao_Paulo**, intervalos meio-abertos, semana na segunda — herdado da Fase 6; a consulta se ancora nos mesmos slots expandidos por `expandAvailability`.
- **D-11:** FK forward: a consulta referencia `patients(id)` (e `profile_id`). A Fase 8/9 escreverá POR CIMA (assistente cria pedidos); não adicionar colunas de assento/membership aqui.

### Claude's Discretion
- Nome exato da tabela/colunas de consulta (`appointments`?), forma do status (pg enum vs. text+CHECK — o repo usa ambos; enum é o padrão recente).
- Implementação exata da exclusion constraint (extensão `btree_gist`, tipo do range, predicado parcial por status) e como o timestamp/instante da consulta é derivado do slot (data + minuto no fuso da clínica).
- Como as consultas são renderizadas sobre os slots no calendário da Fase 6 (cor/legenda por status) e onde vive a "lista de pedidos a confirmar".
- Mapeamento do 23P01 → mensagem PT-BR no action.

### Deferred Ideas (OUT OF SCOPE)
- Duração livre / consulta multi-slot (D-01: 1 slot).
- Marcar consulta fora da disponibilidade (encaixe) — não nesta fase (D-02).
- Reabrir consulta cancelada/falta — estados finais (D-06).
- Notificações de confirmação/lembrete — fora do milestone.
- Assento delegado / login da assistente / UI de agendamento da assistente → Phase 8/9.
- Livro-caixa de ganhos ligado à consulta → Phase 10.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| APPT-01 | O médico cria e edita uma consulta em um horário livre, ligada a um paciente cadastrado | Tabela `appointments` (profile_id + patient_id FK), criação via dialog no calendário (D-03), derivação do instante do slot a partir de `expandAvailability` (§Ancoragem no slot); reuso do domínio `patients` (§Standard Stack) |
| APPT-02 | Ciclo de status — solicitada → confirmada → realizada/falta/cancelada — com falta distinta de cancelada | pg enum `appointment_status` (§Pattern 1), máquina de transições legais (§Pattern 2), estados finais; a UI-SPEC já fixa a distinção visual falta≠cancelada |
| APPT-03 | O médico confirma ou recusa um "pedido a confirmar" a partir da agenda/lista | Transições `pending→confirmed` (confirmar) e `pending→canceled` (recusar) via action que faz UPDATE de status; painel "Pedidos a confirmar" (§UI integração) |
| APPT-04 | Horário com consulta pendente ou confirmada não recebe outra (sem double-booking), garantido no banco (exclusion constraint), escopado por profile_id | **Exclusion constraint parcial** `EXCLUDE USING gist (profile_id WITH =, slot_range WITH &&) WHERE (status in ('pending','confirmed'))` + `btree_gist` (§Pattern 3, §Don't Hand-Roll), captura do SQLSTATE 23P01 no action (§Pattern 4) |
</phase_requirements>

## Summary

Esta fase adiciona uma tabela `appointments` owner-scoped por cima do domínio de disponibilidade da Fase 6, seguindo verbatim os moldes já validados no repo (`patient_vaccine_doses` para RLS+policies, `patient_sex`/`medical_certificate_type` para pg enum, `save_availability` para action-com-gate + result-union + RPC transacional). O core técnico novo — e o único ponto greenfield — é a garantia de não-double-booking no banco via **exclusion constraint parcial GiST**, que exige habilitar a extensão `btree_gist` e modelar o intervalo da consulta como um `tstzrange` sobre `timestamptz`. Isso encaixa perfeitamente com a Fase 6: `expandAvailability` já resolve cada `FreeSlot` para instantes UTC (`start`/`end` como `Date`), então a consulta grava exatamente esses dois `timestamptz` e a constraint compara intervalos em UTC sem nenhuma re-derivação de fuso no banco.

O ciclo de status é um pg enum `appointment_status` (`pending`, `confirmed`, `done`, `no_show`, `canceled`) — o padrão recente do repo — com as transições legais validadas na camada de action (Postgres não impõe máquina de estado; o enum só restringe os valores). A defesa contra double-booking é em camadas: a validação server-side confirma que o instante pedido é de fato um slot livre expandido (defesa contra TOCTOU parcial + UX), mas a **exclusion constraint é a defesa final e autoritativa** — a corrida entre duas inserções concorrentes só é resolvida corretamente pelo banco. A violação (`SQLSTATE 23P01` / `exclusion_violation`) chega ao supabase-js via `error.code`, e o action mapeia para o result union amigável "Este horário já foi ocupado por outra consulta." (copy já fixada na UI-SPEC).

A integração de UI reusa o calendário bespoke da Fase 6 sem reconstruí-lo: a RSC carrega as consultas escopadas junto com rules+overrides, o `CalendarEditor` (client) sobrepõe o tratamento de status por célula, e o painel "Pedidos a confirmar" vive adjacente ao calendário. O padrão de escrita é o mesmo dos actions da Fase 6: gate `paid`, Zod `safeParse`, delegação a `modules/`, `revalidatePath("/dashboard/agenda")`.

**Primary recommendation:** Crie `public.appointments` (uuid pk, profile_id + patient_id FK, `starts_at`/`ends_at` timestamptz, enum `appointment_status`) com `EXCLUDE USING gist (profile_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE (status in ('pending','confirmed'))` habilitando `btree_gist`; grave `starts_at`/`ends_at` diretamente dos instantes UTC que `expandAvailability` já produz; capture `error.code === '23P01'` no action para o result union PT-BR. Enum + RLS+policies + constraint tudo na mesma migration, espelhando `patient_vaccine_doses`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Não-double-booking (APPT-04) | Database (exclusion constraint) | API/Action (23P01 → result union) | Só o banco resolve corridas concorrentes de forma autoritativa; o action traduz a violação para o usuário [VERIFIED: PostgreSQL docs] |
| Validação "slot é livre?" (D-02) | API/Action (server-side, reusa `expandAvailability`) | Database (constraint como backstop) | Regra de negócio + UX antes do INSERT; a constraint é o backstop final contra TOCTOU |
| Ciclo de status / transições legais (APPT-02) | API/Action (state machine) | Database (enum restringe valores) | Postgres enum só valida o domínio de valores; a legalidade das transições é regra de app [CITED: postgresql.org enum] |
| Ownership scoping (D-09) | Database (RLS policies) | API/Action (paid gate) + RSC (paid gate) | RLS impõe posse por `profile_id`; o gate `paid` é regra de app fora da RLS (mesmo racional da Fase 6) |
| Criação/edição de consulta (APPT-01) | API/Action → modules | UI (dialog no calendário) | Three-layer padrão; módulo recebe `SupabaseClient` injetado |
| Confirmar/recusar pedido (APPT-03) | API/Action (UPDATE status) | UI (painel de pedidos) | Transição pending→confirmed / pending→canceled |
| Busca de paciente (D-04) | modules/patients (existente) | UI (Command/Combobox no dialog) | Reuso do domínio já escopado por `profile_id` |
| Derivação do instante do slot (D-10) | Server (RSC/Action, reusa `expandAvailability` + `CLINIC_TIME_ZONE`) | — | `expandAvailability` já emite instantes UTC; a consulta grava esses instantes |
| Renderização das consultas na agenda | Frontend Client (`CalendarEditor`) | Server (RSC carrega as rows) | Reusa o calendário bespoke da Fase 6; sobrepõe status por célula |

## Standard Stack

### Core

Nenhuma dependência **nova** de pacote. A fase é 100% código + SQL sobre a stack já instalada.

| Library | Version (verified) | Purpose | Why Standard |
|---------|--------------------|---------|--------------|
| `@supabase/supabase-js` | instalado (repo) | Client Postgres/Auth; `.insert`/`.update`/`.rpc` e `error.code` (SQLSTATE) | Padrão do repo; `error.code` é estável entre versões para branching [CITED: supabase.com handling-errors] |
| `@supabase/ssr` | instalado (repo) | Client por-request (server/client/proxy) | Padrão do repo (Fluid-compute) |
| `zod` ^4.3.6 | instalado (repo) | `safeParse` no boundary do action (patient_id uuid, starts_at/ends_at, status) | Convenção do repo (`lib/schemas/`) |
| `date-fns` ^4.1.0 + `@date-fns/tz` | instalado (repo) | Aritmética de calendário no named zone (`{ in: tz(CLINIC_TIME_ZONE) }`) | Já usado por `expand-availability.ts` |
| `btree_gist` (Postgres extension) | disponível no Supabase | Habilita operador `=` sobre `profile_id` (uuid) num índice GiST junto com `&&` sobre o range | Requisito para EXCLUDE que combina igualdade escalar + overlap de range [VERIFIED: Supabase extensions list] |

### Supporting

| Library | Purpose | When to Use |
|---------|---------|-------------|
| `react-hook-form` + `@hookform/resolvers` | Estado do dialog de criação (seleção do paciente) | Se o dialog precisar de validação de form; opcional — a seleção é um único campo |
| shadcn `dialog`, `command`/`combobox`, `alert-dialog`, `dropdown-menu`, `badge`, `sonner` | Superfícies de UI (já vendored em `components/ui/`) | Toda a UI da fase (a UI-SPEC lista o inventário exato) |
| `lib/zod-error-message.ts` | `zodErrorToUserMessage` para PT-BR | No `safeParse` do action (padrão do repo) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `tstzrange(starts_at, ends_at)` (duas colunas timestamptz + range no constraint) | Coluna `tstzrange` materializada | Coluna materializada evita reconstruir o range no índice, mas duplica a fonte da verdade e complica leitura/edição; **preferir duas colunas timestamptz** — o range é derivado só no constraint. Colunas separadas também facilitam ORDER BY / filtros de janela na leitura da agenda |
| pg enum `appointment_status` | `text` + `CHECK (status in (...))` | text+CHECK é mais fácil de evoluir (adicionar valor sem `ALTER TYPE ... ADD VALUE`), mas o repo adotou **pg enum** como padrão recente (`patient_sex`, `medical_certificate_type`); usar enum por consistência. Estados finais nesta fase são fixos, então a rigidez do enum não incomoda |
| Range de minutos + `date` separada | `tstzrange` sobre `timestamptz` | Minutos+date exigiria reconstruir o instante no fuso dentro do banco (o `expandAvailability` já faz isso no app e emite UTC); `tstzrange` sobre os instantes UTC já resolvidos é **muito mais simples e DST-safe** (o fuso já foi resolvido no app). Preferir timestamptz |
| Validar transições via trigger no banco | Validar transições no action (state machine em TS) | Trigger centraliza a regra mas adiciona complexidade plpgsql; o repo valida regra de negócio no action (o enum já restringe valores). Preferir action; a exclusion constraint (não a máquina de estado) é a única invariante que PRECISA estar no banco |

**Installation:** Nenhum pacote npm novo. A única "instalação" é a extensão Postgres, dentro da própria migration:

```sql
-- No topo da migration da tabela appointments (ou migration própria anterior):
create extension if not exists btree_gist with schema extensions;
```

**Version verification:** Executado — nenhum pacote npm novo é introduzido nesta fase, portanto não há resolução de versão de registry a validar. Todas as libs (`@supabase/supabase-js`, `@supabase/ssr`, `zod`, `date-fns`, `@date-fns/tz`) já constam do `package.json` e são usadas pela Fase 6. A única dependência externa é a extensão Postgres `btree_gist`, confirmada disponível no Supabase.

## Package Legitimacy Audit

> Nenhum pacote npm/PyPI/crates **novo** é instalado nesta fase. A fase reusa exclusivamente dependências já presentes no `package.json` (validadas em fases anteriores) e uma extensão Postgres de contrib (`btree_gist`) bundled com o Supabase.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (nenhum novo) | — | — | — | — | — | N/A — sem instalação nova |
| `btree_gist` | Postgres contrib (Supabase) | core PG | n/a | postgres/postgres (contrib) | OK | Habilitar via `create extension` (contrib oficial, não é pacote de terceiros) [VERIFIED: Supabase extensions list] |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                     ┌───────────────────────────────────────────────┐
   Médico clica      │  CalendarEditor (client, Fase 6 — reusado)     │
   slot livre  ─────▶│  - célula livre (bg-primary/25) → Dialog       │
                     │  - células booked → tratamento por status      │
                     │  - painel "Pedidos a confirmar" (pending)      │
                     └───────────────┬───────────────────────────────┘
                                     │ (data+horário do slot = instantes UTC já expandidos)
                                     ▼
              ┌──────────────────────────────────────────────────────┐
              │  Server Actions ("use server")                        │
              │  createAppointmentAction / updateAppointmentStatusAction│
              │  1. gate auth + profile.status === "paid"             │
              │  2. Zod safeParse (patient_id, starts_at, ends_at, …) │
              │  3. valida "slot é livre?" (reusa expandAvailability) │ ── defesa UX / TOCTOU parcial
              │  4. delega a modules/appointments/*                   │
              │  5. captura error.code === '23P01' → result union     │ ── mapeia double-booking
              │  6. revalidatePath("/dashboard/agenda")               │
              └───────────────┬───────────────────────────────────────┘
                              │ SupabaseClient injetado
                              ▼
              ┌──────────────────────────────────────────────────────┐
              │  modules/appointments/* (uma fn por arquivo)          │
              │  create-appointment / update-appointment-status /     │
              │  list-appointments-by-profile-id                      │
              │  throw new Error("[APPOINTMENTS] …")                   │
              └───────────────┬───────────────────────────────────────┘
                              │ INSERT / UPDATE / SELECT
                              ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │  Postgres (public.appointments)                                        │
   │  - RLS owner-scoped por profile_id (4 policies)                        │
   │  - status = enum appointment_status                                    │
   │  - EXCLUDE USING gist (profile_id WITH =,                              │
   │        tstzrange(starts_at, ends_at, '[)') WITH &&)                    │
   │      WHERE (status in ('pending','confirmed'))    ◀── DEFESA FINAL     │
   │  - btree_gist habilitado                                               │
   │  - viola? → SQLSTATE 23P01 (exclusion_violation)                       │
   └────────────────────────────────────────────────────────────────────────┘
```

O instante da consulta **não é re-derivado no banco**: `expandAvailability` (Fase 6) já emite `FreeSlot.start`/`FreeSlot.end` como `Date` UTC; o action grava esses dois valores como `timestamptz` e a constraint compara em UTC.

### Recommended Project Structure

```
supabase/migrations/
└── YYYYMMDDHHMMSS_appointments.sql   # enum + tabela + RLS+policies + btree_gist + exclusion constraint (tudo junto, molde patient_vaccine_doses)

modules/appointments/                  # uma fn por arquivo, SupabaseClient injetado, tag [APPOINTMENTS]
├── types.ts                           # Appointment, AppointmentStatus
├── create-appointment.ts              # INSERT (status inicial 'confirmed' quando médico cria)
├── update-appointment-status.ts       # UPDATE status (confirmar/recusar/realizada/falta/cancelar)
├── list-appointments-by-profile-id.ts # SELECT janela [from,to) escopado por profile_id
└── appointment-transitions.ts         # (opcional) máquina de transições legais, pura, testável

actions/appointments/                  # "use server", gate paid, Zod, result union, revalidatePath
├── index.ts                           # barrel
├── create-appointment.ts              # createAppointmentAction → captura 23P01
└── update-appointment-status.ts       # updateAppointmentStatusAction

lib/schemas/
└── appointment.ts                     # Zod: createAppointmentSchema, updateStatusSchema

components/dashboard/agenda/           # ESTENDER o existente, NÃO reconstruir
├── appointment-create-dialog.tsx      # Dialog + busca de paciente (Command/Combobox)
├── pending-requests-panel.tsx         # Card "Pedidos a confirmar"
└── (extensões em calendar-editor.tsx / calendar-day-week-grid.tsx para render de status)

actions/appointments/index.ts          # + re-export no actions/index.ts raiz (padrão do repo)
```

### Pattern 1: pg enum para o status (molde do repo)

**What:** Enum Postgres nomeado com os 5 valores do ciclo. Espelha `patient_sex` e `medical_certificate_type`.
**When to use:** Status com domínio fechado e conhecido (D-06). Estados finais fixos nesta fase.
**Example:**
```sql
-- Source: molde supabase/migrations/20260327120000_patients_sex_enum.sql
--         + 20260314000000_medical_certificates.sql (create type ... as enum)
create type public.appointment_status as enum (
  'pending',    -- solicitada (pedido a confirmar) — segura o horário
  'confirmed',  -- confirmada — segura o horário
  'done',       -- realizada — final, NÃO segura
  'no_show',    -- falta — final, NÃO segura, distinta de cancelada
  'canceled'    -- cancelada / recusada — final, NÃO segura, libera o horário
);

comment on type public.appointment_status is
  'Ciclo da consulta (APPT-02): pending (solicitada) → confirmed → done|no_show|canceled. pending+confirmed seguram o horário (exclusion); done/no_show/canceled são finais e não seguram. no_show (falta) é distinta de canceled.';
```

> **Nota de evolução (state of the art):** valores em inglês (`pending`/`confirmed`/…) casam com a UI-SPEC (coluna "DB value"). Rótulos PT-BR são responsabilidade da UI (badge). Isso segue a convenção `patient_sex` (keys `masculino`/`feminino`, labels na UI).

### Pattern 2: Máquina de transições legais no action (não no banco)

**What:** Validar que a transição pedida é legal antes do UPDATE. O enum só garante que o VALOR existe; a legalidade (`confirmed → done` sim, `canceled → confirmed` não) é regra de app.
**When to use:** APPT-02 / APPT-03. Estados finais (`done`/`no_show`/`canceled`) não têm transição de saída nesta fase.
**Example:**
```typescript
// modules/appointments/appointment-transitions.ts — puro e testável
export const APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending:   ["confirmed", "canceled"],           // confirmar | recusar(=cancelar)
  confirmed: ["done", "no_show", "canceled"],     // realizada | falta | cancelar
  done:      [],                                   // final
  no_show:   [],                                   // final
  canceled:  [],                                   // final
}

export function isLegalTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return APPOINTMENT_TRANSITIONS[from]?.includes(to) ?? false
}
```
No action: carrega o status atual (SELECT escopado por profile_id), rejeita transição ilegal com result union, senão UPDATE.

> **Concorrência na transição:** faça o UPDATE com guarda de status na cláusula — `.update({ status: next }).eq("id", id).eq("profile_id", pid).eq("status", from)` — para não sobrescrever uma transição concorrente (compare-and-set). Se 0 linhas afetadas, o estado mudou; retorne result union "Não foi possível atualizar a consulta."

### Pattern 3: Exclusion constraint parcial (o core novo — APPT-04 / D-08)

**What:** Impede que duas consultas que "seguram" o horário (`pending`/`confirmed`) do MESMO médico (`profile_id`) tenham intervalos sobrepostos. Predicado parcial (`WHERE status in (...)`) implementa D-07: estados finais não entram no índice, então o horário fica livre para re-marcar.
**When to use:** É a **única** invariante que precisa estar no banco (defesa autoritativa contra corridas concorrentes).
**Example:**
```sql
-- Source: [VERIFIED: postgresql.org/docs/current/rangetypes.html + sql-createtable.html]
-- btree_gist é necessário para o operador '=' sobre profile_id (uuid) num índice GiST
-- junto do '&&' de overlap de range.
create extension if not exists btree_gist with schema extensions;

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict, -- ver Pitfall 5
  status public.appointment_status not null default 'pending',
  starts_at timestamptz not null,
  ends_at   timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_ends_after_starts check (ends_at > starts_at),

  -- NÃO-DOUBLE-BOOKING (APPT-04 / D-08):
  -- range meio-aberto '[)' casa com a semântica de slot da Fase 6 (D-11: [start,end)),
  -- então dois slots adjacentes (end==start) NÃO conflitam.
  constraint appointments_no_double_booking
    exclude using gist (
      profile_id with =,
      tstzrange(starts_at, ends_at, '[)') with &&
    )
    where (status in ('pending', 'confirmed'))
);
```

**Por que `[)` (meio-aberto):** a Fase 6 modela slots meio-abertos `[start, end)` (`expand-availability.ts`, D-11). Um slot 14:00–14:30 e outro 14:30–15:00 encostam em 14:30 mas **não** sobrepõem. `tstzrange(..., '[)')` + `&&` reproduz exatamente essa semântica — sem falso conflito na virada. [VERIFIED: PostgreSQL rangetypes canonical form '[)']

**Por que `on delete restrict` no patient_id:** ver Pitfall 5.

### Pattern 4: Captura do SQLSTATE 23P01 → result union PT-BR (D-08)

**What:** O supabase-js retorna `PostgrestError` com `.code` = SQLSTATE estável. `23P01` = `exclusion_violation`. Mapear para a copy fixada na UI-SPEC.
**When to use:** No `createAppointmentAction` (e em qualquer UPDATE que reative um horário, ex. `canceled → confirmed` — não existe nesta fase, mas o confirmar de um pending pode colidir se o slot foi tomado no meio).
**Example:**
```typescript
// Source: molde actions/availability/save-availability.ts (gate+result union)
//         + [CITED: supabase.com/docs/guides/api/handling-errors-in-supabase-js] error.code
"use server"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { createAppointmentSchema } from "@/lib/schemas/appointment"
import { zodErrorToUserMessage } from "@/lib/zod-error-message"
import { createAppointment } from "@/modules/appointments/create-appointment"

export type CreateAppointmentResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

/** SQLSTATE 23P01 = exclusion_violation (Postgres). */
const EXCLUSION_VIOLATION = "23P01"

export async function createAppointmentAction(
  input: unknown,
): Promise<CreateAppointmentResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  const parsed = createAppointmentSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }

  try {
    // (defesa UX/TOCTOU) validar server-side que starts_at é um slot livre expandido — ver Pattern 5
    const id = await createAppointment(supabase, {
      profileId: profile.id,
      ...parsed.data, // patientId, startsAt, endsAt
      status: "confirmed", // D-05: médico cria já confirmada
    })
    revalidatePath("/dashboard/agenda")
    return { ok: true, id }
  } catch (error: unknown) {
    // supabase-js: o PostgrestError vem com .code = SQLSTATE. O módulo deve propagar
    // o code (ou o próprio PostgrestError) para o action poder ramificar de forma estável.
    if (isExclusionViolation(error)) {
      return { ok: false, error: "Este horário já foi ocupado por outra consulta. Escolha outro horário livre." }
    }
    return { ok: false, error: "Não foi possível agendar a consulta. Verifique sua conexão e tente novamente." }
  }
}

function isExclusionViolation(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null &&
    "code" in error && (error as { code?: string }).code === EXCLUSION_VIOLATION
  )
}
```

> **Contrato módulo↔action:** hoje o repo captura o erro no action e usa `error.message`. Para ramificar por `23P01`, o **módulo precisa expor o `error.code`** (não só `throw new Error(message)`). Opções: (a) o módulo relança um Error carregando o code (`Object.assign(new Error("[APPOINTMENTS] …"), { code: error.code })`), ou (b) o módulo retorna `{ data, error }` cru e o action ramifica. Recomendação: (a) — mantém o padrão "módulo throw, action catch" e ainda expõe o code. O planner deve fixar isso explicitamente numa task.

### Pattern 5: Validar "slot é livre?" server-side reusando expandAvailability (D-02)

**What:** Antes do INSERT, confirmar que `starts_at` é de fato o início de um slot livre expandido (dentro da disponibilidade recorrente/aditiva, não bloqueado por folga). Isto é defesa de **regra de negócio + UX**, não a garantia de unicidade (essa é a exclusion constraint).
**When to use:** No `createAppointmentAction`, antes de delegar ao INSERT.
**Example (esboço):**
```typescript
// Carrega rules + overrides do profile (mesmos módulos da Fase 6), expande a janela
// do dia da consulta e confirma que existe um FreeSlot com start === startsAt e
// end === endsAt. Se não, result union: "Este horário não está mais disponível…".
const { slots } = expandAvailability({
  rules, overrides,
  window: { from: dayStart, to: dayEnd },   // janela do dia local da consulta
  timeZone: CLINIC_TIME_ZONE,
})
const match = slots.find(
  (s) => s.start.getTime() === startsAt.getTime() && s.end.getTime() === endsAt.getTime(),
)
if (!match) return { ok: false, error: "Este horário não está mais disponível. Atualize a agenda e escolha outro." }
```
**TOCTOU:** entre esta checagem e o INSERT, o slot pode ser tomado por outra requisição. Isso é aceitável **porque a exclusion constraint é a defesa final** — a corrida perde no banco (23P01) e vira a copy "horário já ocupado". Não tentar resolver a corrida na aplicação.

### Anti-Patterns to Avoid

- **Confiar na aplicação para garantir não-double-booking:** um `SELECT ... WHERE overlaps` seguido de `INSERT` tem janela de corrida (TOCTOU). **Só a exclusion constraint no banco é correta sob concorrência.** [VERIFIED: PostgreSQL docs — exclusion constraints existem exatamente para isto]
- **Materializar slots no banco / adicionar FK de slot:** a Fase 6 decidiu explicitamente que slots são derivados (D-12), não persistidos. A consulta grava os **instantes** (`starts_at`/`ends_at`), não uma referência a um slot.
- **Range fechado `[]` no tstzrange:** faria slots adjacentes (14:30 fim / 14:30 início) conflitarem falsamente. Usar `[)` (meio-aberto), casando com a Fase 6 (D-11).
- **`ALTER TYPE ... ADD VALUE` dentro de uma transação de migration com uso imediato:** Postgres não permite usar um novo valor de enum na mesma transação em que ele foi adicionado. Não é problema nesta fase (o enum nasce completo), mas o planner deve saber ao evoluir.
- **Re-derivar o fuso no banco:** `expandAvailability` já resolve os slots para UTC. Gravar minutos+date e reconstruir o instante em SQL reintroduziria bugs de DST que a Fase 6 já eliminou. Gravar `timestamptz` direto.
- **Reemitir `enable row level security` / policies num ALTER de tabela existente:** não se aplica aqui (tabela nova), mas o molde da Fase 6 alerta: RLS+policies só na criação.
- **UPDATE de status sem guarda `.eq("status", from)`:** permite sobrescrever uma transição concorrente. Usar compare-and-set (Pattern 2).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Não-double-booking sob concorrência | `SELECT overlaps` + `INSERT` na aplicação | **Exclusion constraint GiST parcial** no Postgres | TOCTOU: duas requisições concorrentes passam ambas pelo SELECT e inserem. O banco é o único árbitro correto de corridas [VERIFIED: PostgreSQL] |
| Overlap de intervalos de tempo | Comparar `start1 < end2 && start2 < end1` em SQL/TS ad-hoc | `tstzrange` + operador `&&` | Range types + `&&` são a primitiva correta, DST-safe e indexável por GiST [VERIFIED: PostgreSQL rangetypes] |
| Igualdade escalar + overlap no mesmo índice | Índice/trigger custom | `btree_gist` (operador `=` em GiST) | Extensão oficial existe exatamente para combinar `=` de escalar com `&&` de range num EXCLUDE [VERIFIED: Supabase extensions] |
| Derivar o instante do slot no fuso da clínica | Nova função de fuso/DST | `expandAvailability` + `CLINIC_TIME_ZONE` (Fase 6) | A função pura DST-safe já existe e emite instantes UTC; reusar |
| Busca de paciente escopada | Nova query | `getPatientsByProfileId` / `findPatientByProfileIdNameAndResponsible` | Já escopadas por `profile_id`, já testadas (D-04) |
| Validação de input no boundary | Checagens manuais | Zod `safeParse` + `zodErrorToUserMessage` | Padrão do repo (`lib/schemas/`) |
| Domínio fechado de status | `text` livre | pg enum `appointment_status` | Padrão recente do repo; restringe valores no banco |

**Key insight:** O único componente que **obrigatoriamente** vive no banco é a exclusion constraint — é a única invariante que a aplicação não consegue garantir sob concorrência. Todo o resto (transições, gate paid, validação de slot livre) é regra de app na camada de action, reusando primitivas já validadas na Fase 6.

## Runtime State Inventory

> Greenfield para a tabela `appointments` (não existe hoje). É um phase aditivo (nova tabela), não um rename/refactor. Ainda assim, verifiquei estado de runtime que a fase toca:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Nenhum registro de consulta existe (tabela nova). `public.patients` e `public.profiles` já existem e são referenciados por FK. | Criar tabela; nenhuma migração de dados |
| Live service config | Nenhuma. Sem workflows externos, sem serviços que embutam nomes de consulta. | Nenhuma |
| OS-registered state | Nenhuma (app web serverless na Vercel; sem tarefas agendadas). | Nenhuma |
| Secrets/env vars | Nenhum secret novo. `NEXT_PUBLIC_SUPABASE_*` já presentes; `CLINIC_TIME_ZONE` é constante de código (não env). | Nenhuma |
| Build artifacts | Nenhum. Sem pacote a recompilar; migration SQL + código TS. | Aplicar a migration (`btree_gist` deve estar habilitado antes do CREATE do constraint) |

**Ordem de aplicação (crítica):** `create extension btree_gist` **antes** do `create table ... exclude using gist`, no mesmo arquivo de migration ou em migration anterior. Se `btree_gist` não estiver habilitado, o `EXCLUDE ... WITH =` sobre `profile_id` (uuid) falha na criação.

## Common Pitfalls

### Pitfall 1: EXCLUDE com `=` sobre profile_id falha sem btree_gist
**What goes wrong:** `CREATE TABLE ... EXCLUDE USING gist (profile_id WITH =, ...)` dá erro "data type uuid has no default operator class for access method gist" (ou similar) se `btree_gist` não estiver habilitado.
**Why it happens:** GiST nativamente indexa ranges/geometrias com `&&`, mas não igualdade de escalares (`=`). `btree_gist` adiciona as operator classes de igualdade para tipos escalares no GiST.
**How to avoid:** `create extension if not exists btree_gist with schema extensions;` antes do CREATE TABLE. [VERIFIED: PostgreSQL rangetypes docs]
**Warning signs:** Migration falha no CREATE TABLE com mensagem sobre "operator class" / "gist".

### Pitfall 2: Range fechado faz slots adjacentes colidirem
**What goes wrong:** Com `tstzrange(starts_at, ends_at)` (default `[)` na verdade — mas se alguém escrever `'[]'`), uma consulta 14:00–14:30 e outra 14:30–15:00 são reportadas como overlap falso.
**Why it happens:** `[]` inclui ambos os extremos; 14:30 pertence às duas.
**How to avoid:** Usar explicitamente `tstzrange(starts_at, ends_at, '[)')` (meio-aberto), casando com a semântica da Fase 6. O default do `tstzrange(a,b)` já é `'[)'`, mas ser explícito documenta a intenção. [VERIFIED: PostgreSQL rangetypes — forma canônica `[)`]
**Warning signs:** "horário já ocupado" ao marcar dois slots adjacentes que deveriam ser válidos.

### Pitfall 3: 23P01 chega ao action mas o módulo esconde o code
**What goes wrong:** O módulo faz `throw new Error("[APPOINTMENTS] " + error.message)` e o action só vê a mensagem — não consegue ramificar de forma estável por `23P01`, então mapear por substring de mensagem (frágil, muda entre versões).
**Why it happens:** O padrão atual do repo (`save-availability`) usa `error.message`. Para double-booking o action PRECISA do `error.code`.
**How to avoid:** O módulo relança preservando o code: `const e = new Error(\`[APPOINTMENTS] \${error.message}\`); (e as any).code = error.code; throw e;` (ou retorna o PostgrestError cru). O action ramifica por `error.code === '23P01'`. [CITED: supabase.com handling-errors — error.code é estável para branching]
**Warning signs:** Toast genérico "não foi possível agendar" em vez da copy específica de horário ocupado.

### Pitfall 4: Confirmar um pending pode colidir (23P01 no UPDATE, não só no INSERT)
**What goes wrong:** Dois pedidos `pending` no mesmo horário coexistem? Não — ambos entram no índice parcial (`pending` está no WHERE), então o SEGUNDO pending já falha no INSERT. Mas se um horário fica livre (cancel) e há um pending histórico… nesta fase pending vem só da assistente (Fase 9); mesmo assim, confirmar um pending que colida com um confirmed vizinho dispara 23P01 no UPDATE.
**Why it happens:** O predicado parcial reavalia o índice em qualquer mudança de status que entre/saia de `('pending','confirmed')`.
**How to avoid:** Capturar `23P01` também no `updateAppointmentStatusAction` (não só no create). A copy "horário já ocupado" serve para o confirmar; para as demais transições use "Não foi possível atualizar o pedido/consulta."
**Warning signs:** UPDATE de status falha com 23P01 sem tratamento → erro cru vaza.

### Pitfall 5: `ON DELETE CASCADE` no patient_id apagaria o histórico de consultas
**What goes wrong:** Se `patient_id` usa `on delete cascade` (como `patient_vaccine_doses`), apagar um paciente apaga suas consultas — inclusive as realizadas (histórico clínico/financeiro que a Fase 10 referenciará).
**Why it happens:** Copiar o molde `patient_vaccine_doses` literalmente (que usa cascade) sem pensar na semântica.
**How to avoid:** Usar `on delete restrict` (ou `no action`) no `patient_id` — não deixa apagar paciente com consultas, preservando histórico. O `profile_id` pode manter `on delete cascade` (apagar o médico apaga tudo dele). O planner deve decidir explicitamente; recomendação: `restrict` no patient_id. (Fora do escopo estrito da fase, mas é uma decisão de schema que a Fase 10/ganhos herda.)
**Warning signs:** Consultas somem ao deletar paciente; FK da Fase 10 (ganhos→consulta) fica órfã.

### Pitfall 6: search_path vazio numa RPC quebra a resolução do operador do range
**What goes wrong:** Se a criação usar uma RPC com `set search_path = ''` (molde `save_availability`) e o corpo referenciar `tstzrange`/`&&` sem qualificar, pode falhar. (No CREATE TABLE isso não ocorre — a DDL roda sob o search_path da migration.)
**Why it happens:** `set search_path = ''` exige nomes totalmente qualificados; operadores de range e da extensão vivem em `pg_catalog`/`extensions`.
**How to avoid:** Para a criação de consulta um `.insert()` direto do supabase-js basta (não precisa de RPC transacional — é um único INSERT atômico). Só use RPC se precisar de multi-statement atômico (não é o caso aqui). Se usar RPC, qualifique tudo. Recomendação: **INSERT direto**, sem RPC (o double-booking já é garantido pela constraint, não precisa de transação multi-statement).
**Warning signs:** Erro de "function/operator does not exist" na RPC.

## Code Examples

### Migração completa (molde consolidado)
```sql
-- Source: consolidação dos moldes patient_vaccine_doses (RLS+policies),
--         patient_sex/medical_certificates (enum), + [VERIFIED: PostgreSQL exclusion constraints]
create extension if not exists btree_gist with schema extensions;

create type public.appointment_status as enum
  ('pending', 'confirmed', 'done', 'no_show', 'canceled');

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  status public.appointment_status not null default 'pending',
  starts_at timestamptz not null,
  ends_at   timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_ends_after_starts check (ends_at > starts_at),
  constraint appointments_no_double_booking
    exclude using gist (
      profile_id with =,
      tstzrange(starts_at, ends_at, '[)') with &&
    )
    where (status in ('pending', 'confirmed'))
);

create index idx_appointments_profile_starts on public.appointments (profile_id, starts_at);

alter table public.appointments enable row level security;

create policy "Appointments select own" on public.appointments
  for select to authenticated
  using (profile_id in (select id from public.profiles where auth_user_id = auth.uid()));
create policy "Appointments insert own" on public.appointments
  for insert to authenticated
  with check (profile_id in (select id from public.profiles where auth_user_id = auth.uid()));
create policy "Appointments update own" on public.appointments
  for update to authenticated
  using (profile_id in (select id from public.profiles where auth_user_id = auth.uid()))
  with check (profile_id in (select id from public.profiles where auth_user_id = auth.uid()));
create policy "Appointments delete own" on public.appointments
  for delete to authenticated
  using (profile_id in (select id from public.profiles where auth_user_id = auth.uid()));
```

### Leitura das consultas na RSC (integra com o calendário)
```typescript
// modules/appointments/list-appointments-by-profile-id.ts
// SELECT escopado por profile_id + janela [from, to) (mesma janela que expandAvailability).
// A RSC (app/dashboard/agenda/page.tsx) carrega isto EM PARALELO com rules+overrides
// e passa ao CalendarEditor, que sobrepõe o tratamento de status por célula.
export async function listAppointmentsByProfileId(
  supabase: SupabaseClient, profileId: string, from: Date, to: Date,
): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("id, patient_id, status, starts_at, ends_at")
    .eq("profile_id", profileId)
    .gte("starts_at", from.toISOString())
    .lt("starts_at", to.toISOString())
    .order("starts_at", { ascending: true })
  if (error) throw new Error(`[APPOINTMENTS] Failed to list: ${error.message}`)
  return (data ?? []) as Appointment[]
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `SELECT overlaps + INSERT` na app para evitar double-booking | Exclusion constraint GiST no banco | Postgres 9.0+ (maduro) | Correto sob concorrência; a app só traduz o 23P01 |
| `text` + CHECK para status | pg enum nomeado | Padrão recente do repo (`patient_sex`, `medical_certificate_type`) | Consistência; valores restritos no banco |
| Materializar slots / minutos+date reconstruídos em SQL | `timestamptz` gravado dos instantes que `expandAvailability` já emite | Fase 6 (D-12, DST-safe) | Sem re-derivação de fuso no banco; range comparado em UTC |

**Deprecated/outdated:**
- Mapear erro de double-booking por substring de `error.message`: frágil. Usar `error.code === '23P01'` (SQLSTATE estável). [CITED: supabase.com handling-errors]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Nome da tabela `appointments` e das colunas (`starts_at`/`ends_at`/`status`) | Standard Stack / Pattern 3 | Baixo — é discrição do planner (D-45 discretion); nomes cosméticos, não afetam a arquitetura |
| A2 | Valores do enum em inglês (`pending`/`confirmed`/`done`/`no_show`/`canceled`) casando com a coluna "DB value" da UI-SPEC | Pattern 1 | Baixo — a UI-SPEC já fixou esses valores; divergir quebraria o contrato de UI |
| A3 | `patient_id` deve usar `on delete restrict` (não cascade) para preservar histórico | Pitfall 5 | Médio — se cascade, apagar paciente apaga consultas; a Fase 10 (ganhos→consulta FK) herda essa decisão. **Recomendar confirmação do planner/usuário** |
| A4 | Criação usa `.insert()` direto (sem RPC transacional) | Pitfall 6 | Baixo — um único INSERT é atômico; RPC só seria necessária para multi-statement |
| A5 | Status inicial `confirmed` quando o médico cria (D-05); default da coluna `pending` para a entrada da assistente (Fase 9) | Pattern 4 / migração | Baixo — D-05 é explícito; o default `pending` é forward-compat com a assistente |

**Nota:** A5, A2 derivam diretamente de decisões travadas (D-05, UI-SPEC). A1/A4 são discrição do planner. **A3 é a única que merece confirmação explícita** por afetar a Fase 10.

## Open Questions

1. **`on delete` do patient_id (cascade vs restrict) — ver A3.**
   - What we know: `patient_vaccine_doses` usa cascade; consultas realizadas são histórico clínico/financeiro que a Fase 10 referenciará.
   - What's unclear: a política de exclusão de paciente com consultas.
   - Recommendation: `on delete restrict` no patient_id (preserva histórico); o planner confirma. `profile_id` mantém cascade.

2. **Edição de consulta (APPT-01 diz "cria e edita") — o que é editável nesta fase?**
   - What we know: D-01 fixa 1 slot (sem editar duração); D-05 nasce confirmada. A UI-SPEC descreve transições de status, não "mover" a consulta.
   - What's unclear: "editar" = só mudar status (o ciclo), ou também trocar o paciente / remarcar horário?
   - Recommendation: nesta fase "editar" = transições de status (APPT-02/03). Remarcar (mover para outro slot) = cancelar + criar novo, ou fica deferido. O planner deve fixar o escopo de "editar" numa task; recomendação: transições de status apenas, remarcação via cancelar+recriar.

3. **Stacking visual quando um slot cancelado/falta é re-marcado (D-07).**
   - What we know: histórico permanece visível; a consulta ativa (pending/confirmed) tem precedência visual (UI-SPEC §2).
   - What's unclear: mecânica exata de empilhamento numa célula de 24px.
   - Recommendation: célula mostra a consulta ATIVA; o histórico é alcançável pelo detalhe da célula (a UI-SPEC delega ao planner).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `btree_gist` (Postgres extension) | Exclusion constraint (APPT-04) | ✓ | contrib PG (Supabase) | Nenhum necessário — bundled no Supabase [VERIFIED: Supabase extensions list] |
| `@supabase/supabase-js` + `@supabase/ssr` | Toda a camada de dados | ✓ | instalado (package.json) | — |
| `zod`, `date-fns`, `@date-fns/tz` | Validação + fuso | ✓ | instalados | — |
| shadcn primitives (`dialog`, `command`, `alert-dialog`, `badge`, `dropdown-menu`, `sonner`, …) | UI da fase | ✓ | vendored em `components/ui/` | — |

**Missing dependencies with no fallback:** nenhum.
**Missing dependencies with fallback:** nenhum.

> **Verificação de `btree_gist` na aplicação da migration:** a migration deve rodar `create extension if not exists btree_gist with schema extensions;` antes do CREATE TABLE. Confirmar que o role de migration tem permissão (o Supabase permite `create extension` para as extensões do allowlist, incluindo btree_gist).

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1` no config. Incluído.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (indireto) | `getAuthenticatedUser(supabase)` + gate `profile.status === "paid"` em cada action e no RSC (padrão do repo; a RLS `to authenticated` NÃO impõe a assinatura) |
| V3 Session Management | no (herdado do middleware/proxy Supabase Auth) | — |
| V4 Access Control | **yes** | RLS owner-scoped por `profile_id` (4 policies) + FK escopadas; ownership stampado server-side (`profile.id`, nunca do cliente); IDOR evitado — UPDATE/SELECT sempre `.eq("profile_id", profile.id)` |
| V5 Input Validation | **yes** | Zod `safeParse` no boundary do action (patient_id uuid, starts_at/ends_at ISO, status ∈ enum); `zodErrorToUserMessage` para PT-BR |
| V6 Cryptography | no | Sem dados criptográficos novos |
| V7 Error Handling | **yes** | Nunca vazar `PostgrestError` cru; 23P01 → result union PT-BR; catch narrow (`error: unknown`) |

### Known Threat Patterns for Next.js Server Actions + Supabase/Postgres

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR (marcar consulta / mudar status de outro médico) | Elevation of Privilege | RLS por `profile_id` + `.eq("profile_id", profile.id)` em toda query; ownership nunca vem do cliente |
| SQL injection | Tampering | supabase-js parametriza; sem SQL string-concat. Zod valida tipos antes |
| Double-booking (corrida / TOCTOU) | Tampering | **Exclusion constraint no banco** (única defesa correta sob concorrência); a validação de slot livre na app é UX, não segurança |
| Bypass do gate de assinatura via PostgREST direto | Elevation of Privilege | Gate `paid` no action E no RSC; a RLS só garante `authenticated`, não `paid` (limitação conhecida da Fase 6 — o gate de app é obrigatório) |
| Vazamento de erro cru do Postgres na UI | Information Disclosure | Mapear SQLSTATE para copy PT-BR; nunca retornar `error.message`/`details`/`hint` crus ao cliente |
| Transição de status ilegal (ex.: reabrir cancelada) | Tampering | State machine no action (compare-and-set `.eq("status", from)`); enum restringe valores |

> **Nota de escopo de segurança (forward):** a assistente (Fase 8/9) escreverá `pending` por cima desta tabela sob um membership. Esta fase NÃO adiciona superfície não-autenticada nem colunas de assento (D-11); a RLS owner-scoped desta fase é o contrato que a Fase 8 estende (SEAT-05 testará cross-tenant/cross-scope). Não enfraquecer a RLS aqui para "facilitar" a assistente depois.

## Sources

### Primary (HIGH confidence)
- [VERIFIED] `postgresql.org/docs/current/rangetypes.html` — EXCLUDE USING gist, btree_gist para `=` escalar + `&&`, tstzrange, forma canônica `[)`
- [VERIFIED] `postgresql.org/docs/current/sql-createtable.html` — gramática do EXCLUDE com `WHERE (predicate)` (índice parcial); "parênteses obrigatórios no predicado"
- [VERIFIED] Codebase — `lib/expand-availability.ts` (emite instantes UTC), `lib/clinic-timezone.ts`, `supabase/migrations/*` (moldes de enum, RLS+policies, RPC), `actions/availability/save-availability.ts` (gate+result union), `modules/patients/*` (busca escopada), `app/dashboard/agenda/page.tsx` + `components/dashboard/agenda/*` (calendário)

### Secondary (MEDIUM confidence)
- [CITED] `supabase.com/docs/guides/api/handling-errors-in-supabase-js` — PostgrestError { code, message, details, hint }; `error.code` estável para branching
- [CITED] `supabase.com/docs/guides/database/extensions` — habilitar extensão via `create extension ... with schema extensions`
- [CITED] `supabase.com/features/postgres-extensions` — btree_gist listada como extensão suportada
- [CITED] `supabase.com/docs/guides/api/rest/postgrest-error-codes` — SQLSTATE mapeados (23P01 = exclusion_violation)

### Tertiary (LOW confidence)
- Nenhuma afirmação carregada apenas de WebSearch sem confirmação em fonte oficial.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — sem pacotes novos; tudo já no repo, verificado no package.json/código
- Architecture (exclusion constraint + enum + three-layer): HIGH — sintaxe verificada na doc oficial do Postgres; moldes verificados no repo
- Pitfalls: HIGH — derivados da doc oficial (btree_gist, `[)`, WHERE parcial, ADD VALUE) e do contrato módulo↔action observado no repo
- Timezone anchoring: HIGH — `expandAvailability` já emite UTC; gravar timestamptz é direto
- Security: HIGH (ASVS L1) — mesmo modelo owner-scoped + gate paid da Fase 6

**Research date:** 2026-07-22
**Valid until:** 2026-08-21 (30 dias — Postgres exclusion constraints e o padrão do repo são estáveis; a única variável é o allowlist de extensões do Supabase, também estável)
