# Phase 6: Disponibilidade & Calendário do Médico - Research

**Researched:** 2026-07-20
**Domain:** Recurring availability modelling, timezone-correct slot expansion (pure function), custom CSS-grid agenda UI, owner-scoped Postgres schema (Supabase + RLS)
**Confidence:** HIGH

## Summary

Esta fase é majoritariamente **greenfield em lógica de fuso horário** sobre um stack já maduro (Next.js 16 / React 19 / Supabase / date-fns v4). Três decisões técnicas dominam o risco: (1) como computar viradas de dia/semana/mês corretamente em `America/Sao_Paulo` sem que o fuso da máquina/servidor vaze para o cálculo; (2) a assinatura e o formato interno da função pura de expansão de slots; (3) a grade de agenda em CSS grid custom (sem lib de calendário). O modelo de dados (duas tabelas owner-scoped com RLS na mesma migration) segue moldes já provados no repo.

A recomendação central de fuso é usar **`@date-fns/tz` (TZDate + helper `tz()`)** — o companion oficial do date-fns v4 já instalado (1.4.1 phantom em `node_modules`, latest 1.5.0). Ele delega DST/offsets históricos ao `Intl.DateTimeFormat` nativo, integra-se ao date-fns v4 via `{ in: tz("America/Sao_Paulo") }`, e resolve limpo os limites meio-abertos de dia/semana/mês. Como SP aboliu DST em 2019 e hoje é offset fixo UTC-03:00 o ano todo, o risco de DST é **teórico para datas correntes/futuras** — mas o named zone ainda encodifica transições históricas (1985–2019), então NÃO usar offset fixo `-03:00` cabeado; usar sempre o named zone via `Intl`/`@date-fns/tz` para ser correto também sobre datas passadas.

**Primary recommendation:** Adicionar `@date-fns/tz` ao `package.json` (já presente phantom); escrever a expansão como uma função pura em `lib/` que recebe regras + exceções + janela de datas + fuso, opera em wall-clock via `TZDate`, emite instantes `Date` UTC (ou ISO) por slot, com `.spec.ts` cobrindo D-02/D-04/D-09/D-10/D-11; construir a grade dia/semana em CSS grid Tailwind custom (`grid-template-columns: [gutter] repeat(N, 1fr)` × linhas de 30 min), reservando `components/ui/calendar.tsx` só ao seletor de data de exceção.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Edição da disponibilidade recorrente**
- **D-01:** A entrada é uma **grade semanal clicável** (Seg–Dom × horas); o médico pinta/seleciona os blocos disponíveis. NÃO é um formulário de linhas. Construção nova.
- **D-02:** **Múltiplas faixas por dia** são suportadas (ex: manhã 08–12 + tarde 14–18); o expandir-slots trata cada faixa contígua independentemente.
- **D-03:** Granularidade da grade = **passo de 30 min**. Faixas sempre começam/terminam em múltiplos de 30 min.

**Modelo de exceções (folga/feriado)**
- **D-04:** Exceção é por **data**, podendo ser **dia inteiro** OU **parcial** (bloquear só uma faixa daquela data). Schema guarda data + faixa opcional (null = dia todo).
- **D-05:** Exceções são **apenas subtrativas** nesta fase (removem horário). Aditivo (abrir extra pontual) está **adiado**.

**Views do calendário**
- **D-06:** Três views dia/semana/mês; **view padrão = SEMANA**.
- **D-07:** View de **MÊS** = **indicador leve por dia** (atende vs folga + total de slots livres), NÃO os slots reais na célula.
- **D-08:** Grade de agenda **dia/semana** = **CSS grid custom** (Tailwind), **sem lib de calendário**. `components/ui/calendar.tsx` (react-day-picker) só serve ao date-picker das exceções.

**Geração de slots**
- **D-09:** **Duração do slot é POR FAIXA** — cada faixa carrega sua própria duração; campo da linha de faixa, não config global. Divergência consciente de AGENDA-02.
- **D-10:** **Descartar a sobra** quando a faixa não divide certo pela duração (14:00–18:00 @ 45min → 14:00, 14:45, 15:30, 16:15, 17:00). Nunca slot parcial. Teste explícito no `.spec`.

**Travado pelo roadmap/requisitos**
- **D-11:** Fuso **fixo America/Sao_Paulo**; **semana começa na segunda**; intervalos **meio-abertos** `[início, fim)`; sem slot duplicado/sumido nas viradas.
- **D-12:** Regras/exceções **armazenadas**; slots **expandidos na leitura** por **função pura testável** (`.spec.ts`, molde `lib/vaccine-*`, `lib/compute-pediatric-age`). Nenhuma row-por-slot persistida.
- **D-13:** Tabelas **owner-scoped por `profile_id`** com **RLS habilitada + policies na mesma migration**. Três camadas `app/ → actions/ → modules/`, uma fn exportada por arquivo, `SupabaseClient` injetado, gate `profile.status === "paid"` nos actions.

### Claude's Discretion
- Range de horas visível na grade (ex: 06:00–22:00), rótulos, densidade visual, interação (arrastar vs clicar-célula) — respeitando passo de 30 min (D-03).
- Nomes de tabelas/colunas e forma exata da assinatura da função pura de expansão — respeitando D-04/D-09 (exceção com faixa opcional, duração por faixa).

### Deferred Ideas (OUT OF SCOPE)
- **Disponibilidade extra pontual (exceção aditiva)** — só subtrativo nesta fase.
- **Duração de slot global única** — fallback futuro possível.
- **Slots reais na célula do mês / view de mês mais rica** — só depois das consultas (Phase 7+).
- Consultas / ciclo de status / exclusion constraint de não-double-booking → **Phase 7**.
- Assento da assistente → **Phase 8/9**. Ganhos → **Phase 10**. Notificações → fora do milestone.
- **Zero nova superfície externa de ataque** — tudo do próprio médico dono, escopado por `profile_id`.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AGENDA-01 | Disponibilidade recorrente por dia da semana + faixa de horário, repete semana após semana | Tabela `availability_rules` (weekday + start/end + slot_minutes), sem row-por-slot — ver Data Model. Expansão relativa à janela via `@date-fns/tz`. |
| AGENDA-02 | Duração do slot; horários gerados dentro das faixas (regras armazenadas, slots expandidos na leitura) | Função pura `expandAvailability(...)` — ver Pure Slot-Expansion. Divergência D-09: duração por faixa em vez de global. |
| AGENDA-03 | Exceções pontuais por data (folga/feriado) que removem horários | Tabela `availability_exceptions` (date + faixa opcional null=dia todo, D-04); subtração dentro da fn pura. |
| AGENDA-04 | Views dia/semana/mês corretas nas viradas de fuso e nas transições | `@date-fns/tz` TZDate para limites meio-abertos `[start,end)` em `America/Sao_Paulo` (D-11); CSS grid custom para dia/semana; indicador leve no mês (D-07). |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Persistência de regras/exceções | Database (Postgres) | — | Duas tabelas owner-scoped; RLS + policies na mesma migration (D-13). |
| Autorização + escopo por dono | Database (RLS) + API (action gate) | — | Defense-in-depth: RLS `profile_id` + `.eq(profile_id)` no módulo + gate `paid` no action (padrão do repo). |
| Expansão de slots (regras → horários) | API/Server (função pura em `lib/`) | — | D-12: expandir na leitura, nunca persistir slot. Pura e testável em `tsx --test`. É lógica de negócio, não SQL nem UI. |
| Cálculo de fuso/limites de janela | API/Server (`@date-fns/tz`) | Client (mesma fn ao renderizar) | Named zone fixo `America/Sao_Paulo`; a mesma fn pura roda em ambos os lados sem depender do TZ da máquina. |
| Grade de agenda dia/semana | Frontend Server (RSC) → Client (interação) | — | Render dos slots computados server-side; seleção/pintura da grade de edição é client (`"use client"`). |
| Indicador de mês | Frontend Server (RSC) | — | D-07: contagem leve por dia; agregação barata na leitura. |
| Seletor de data de exceção | Client | — | `components/ui/calendar.tsx` (react-day-picker) reusado só aqui. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@date-fns/tz` | ^1.4.1 (latest 1.5.0) | TZDate + helper `tz()` para cálculo de dia/semana/mês em `America/Sao_Paulo` | Companion **oficial** do date-fns v4 (mesmo org/monorepo); delega DST/offsets históricos ao `Intl.DateTimeFormat`; integra via `{ in: tz(...) }` [VERIFIED: npm registry] |
| `date-fns` | ^4.1.0 (já instalado) | Aritmética de datas (`startOfWeek`, `startOfDay`, `addMinutes`, `eachDayOfInterval`, etc.) | Já em uso no repo (`lib/formatters.ts`, `lib/compute-pediatric-age.ts`); v4 aceita o context `{ in }` [VERIFIED: codebase grep] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-day-picker` (via `components/ui/calendar.tsx`) | ^9.4.4 (já instalado) | Date-picker do seletor de data de exceção (D-08) | SOMENTE para escolher a data da exceção — NÃO como grade de agenda [VERIFIED: codebase grep] |
| `zod` | ^4.3.6 (já instalado) | Validação de payloads de action (faixa, weekday, slot_minutes, data de exceção) | Nos boundaries (actions), `safeParse`, mapeado a PT-BR via `lib/zod-error-message.ts` [VERIFIED: codebase grep] |
| Tailwind CSS | ^4.2.1 (já instalado) | CSS grid custom da agenda dia/semana (D-08) | `grid-template-columns`/`grid-template-rows` para colunas de dia × linhas de 30 min [VERIFIED: codebase grep] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@date-fns/tz` | `date-fns-tz` (3.2.0) | Mais antigo (última publicação 2024-09-30), API baseada em `utcToZonedTime`/`zonedTimeToUtc` (v2/v3 style). **Rejeitado:** `@date-fns/tz` é o caminho oficial do date-fns **v4** (que já usamos) e a integração `{ in }` é first-class; misturar `date-fns-tz` v3 com date-fns v4 é a fonte errada. [CITED: blog.date-fns.org/v40-with-time-zone-support] |
| `@date-fns/tz` | `Intl.DateTimeFormat` puro | Correto mas verboso: você reimplementa `startOfWeek`/`addMinutes` sobre partes formatadas manualmente. `@date-fns/tz` **usa** `Intl` por baixo e devolve a ergonomia do date-fns. Manter só se o objetivo fosse zero-dependência. [ASSUMED] |
| `@date-fns/tz` | Temporal polyfill (`@js-temporal/polyfill`) | Modelo mais correto a longo prazo (ZonedDateTime nativo), mas pesado, ainda polyfill, e reescreveria a aritmética já baseada em date-fns. Overkill para um único named zone fixo. [ASSUMED] |
| Lib de calendário (FullCalendar/react-big-calendar) | — | **Proibido por D-08.** Adiciona superfície, CSS pesado e um modelo de eventos que não casa com "slots expandidos na leitura". |

**Installation:**
```bash
yarn add @date-fns/tz
```
> Nota: `@date-fns/tz@1.4.1` já está presente em `node_modules` (phantom/transitivo) mas **NÃO declarado** em `package.json`. O plano DEVE declará-lo explicitamente (não depender do phantom). O repo é **yarn-only** (commit `556f6b8`) — usar `yarn add`, nunca `npm install`.

**Version verification:**
- `@date-fns/tz`: latest `1.5.0` (publicado 2024-08-14 o 1.x; 32.9M downloads/semana). node_modules tem `1.4.1`. [VERIFIED: npm registry]
- `date-fns`: `4.1.0` instalado e em `package.json`. [VERIFIED: npm registry]
- `date-fns-tz`: `3.2.0`, modificado 2024-09-30 (para referência da alternativa). [VERIFIED: npm registry]

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@date-fns/tz` | npm | ~2 anos (1.x pub. 2024-08-14) | 32.9M/semana | github.com/date-fns/date-fns (monorepo oficial) | OK | Aprovado — declarar em package.json |
| `date-fns` | npm | anos | 93.2M/semana | github.com/date-fns/date-fns | OK | Já instalado |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

`@date-fns/tz` é publicado pelo mesmo org que `date-fns` (org oficial verificada), sem postinstall script, downloads massivos — legítimo.

## Architecture Patterns

### System Architecture Diagram

```
                         ┌─────────────────────────────────────────────┐
   Médico (browser)      │  app/dashboard/agenda/  (RSC + client parts) │
        │                │                                              │
        │ 1. edita grade  │  ┌──────────────────┐   ┌─────────────────┐ │
        │ semanal         │  │ AvailabilityGrid  │   │ AgendaView       │ │
        │ (client)        │  │ (client, D-01)    │   │ day/week/month   │ │
        ▼                │  └────────┬──────────┘   │ (D-06/07/08)     │ │
   Server Action ────────┼──────────┘               └────────▲────────┘ │
   (gate paid, zod)      │           writes                   │ reads    │
        │                └──────────────────┬─────────────────┼──────────┘
        ▼                                   │                 │
   modules/availability/*.ts  (SupabaseClient injetado)       │
        │ CRUD escopado por profile_id                        │
        ▼                                                      │
   ┌──────────────────────┐   ┌─────────────────────────┐     │
   │ availability_rules    │   │ availability_exceptions │     │
   │ (weekday,start,end,   │   │ (date, start?, end?)    │     │
   │  slot_minutes) RLS    │   │ null band = dia todo    │     │
   └──────────┬───────────┘   └────────────┬────────────┘     │
              │  regras + exceções (rows)   │                  │
              └──────────────┬──────────────┘                  │
                             ▼                                  │
              lib/expand-availability.ts  (FUNÇÃO PURA, D-12)   │
              in: rules[], exceptions[], window {from,to},      │
                  timeZone="America/Sao_Paulo"                  │
              via @date-fns/tz (TZDate / { in: tz(...) })       │
              out: FreeSlot[] (instantes [start,end) por slot) ─┘
                   + resumo por dia (para o mês, D-07)
```

O diagrama mostra o fluxo do dado: edição (client → action → módulo → tabelas) e leitura (tabelas → função pura de expansão → views). Nenhum slot é persistido; a fn pura é o único lugar onde regras viram horários.

### Recommended Project Structure
```
app/dashboard/agenda/
├── page.tsx                 # RSC: carrega regras+exceções, chama expand, renderiza view padrão=semana
├── availability/page.tsx    # (ou modal) editor da grade semanal (D-01)
lib/
├── expand-availability.ts       # FUNÇÃO PURA (D-12) — o coração desta fase
├── expand-availability.spec.ts  # tsx --test: D-02, D-04, D-09, D-10, D-11
├── clinic-timezone.ts           # export const CLINIC_TIME_ZONE = "America/Sao_Paulo" (single source)
modules/availability/            # (nome à discrição do planner)
├── list-availability-rules.ts       # SELECT escopado por profile_id
├── upsert-availability-rules.ts     # grava a grade editada
├── list-availability-exceptions.ts
├── create-availability-exception.ts
├── delete-availability-exception.ts
├── types.ts
actions/availability/
├── *.ts + index.ts          # gate paid + zod, delega a modules/, result unions
supabase/migrations/
├── <ts>_availability_rules.sql        # table + RLS + policies (mesma migration, D-13)
├── <ts>_availability_exceptions.sql   # table + RLS + policies (mesma migration, D-13)
```

### Pattern 1: Timezone-correct boundaries com `@date-fns/tz`
**What:** Toda aritmética de dia/semana/mês roda no named zone via context `{ in: tz(...) }` — o TZ da máquina/servidor nunca vaza.
**When to use:** Sempre que computar a janela da view e ao gerar/comparar limites de slot (D-11).
**Example:**
```typescript
// Source: github.com/date-fns/tz + blog.date-fns.org/v40-with-time-zone-support
import { tz, TZDate } from "@date-fns/tz"
import { startOfWeek, startOfDay, endOfDay, addMinutes, addDays } from "date-fns"

const CLINIC_TIME_ZONE = "America/Sao_Paulo" // lib/clinic-timezone.ts

// Semana começa na SEGUNDA (D-11), meio-aberta [start, end)
const weekStart = startOfWeek(anchorInstant, {
  in: tz(CLINIC_TIME_ZONE),
  weekStartsOn: 1, // 1 = segunda
})
const weekEnd = addDays(weekStart, 7) // exclusivo → [weekStart, weekEnd)

// Um slot dentro de uma faixa, em wall-clock de SP:
const dayStart = startOfDay(dayInstant, { in: tz(CLINIC_TIME_ZONE) })
// band 14:00 → dayStart + 14h; slotEnd = slotStart + slot_minutes (meio-aberto)
```
> Regra: comparar sempre com `>= start && < end` (nunca `<=`) para não duplicar/sumir slot nas viradas (D-11).

### Pattern 2: Função pura recebe janela + fuso, devolve instantes
**What:** A expansão não conhece "agora" nem o TZ do host; recebe `window {from,to}` (instantes) e `timeZone` explícitos — determinística e testável (molde `computePediatricAge(birth, now)`).
**When to use:** A fn é chamada pelo RSC/action com a janela da view atual.

### Pattern 3: CSS grid agenda (dia/semana) — sem lib
**What:** Colunas = gutter de horário + N dias; linhas = passos de 30 min (D-03).
**Example:**
```tsx
// Source: css-tricks.com/building-a-conference-schedule-with-css-grid (padrão adaptado)
// Semana (7 dias) das 06:00 às 22:00 em passos de 30 min = 32 linhas.
<div
  className="grid"
  style={{
    gridTemplateColumns: `4rem repeat(7, minmax(0, 1fr))`, // gutter + 7 dias
    gridTemplateRows: `2.5rem repeat(32, 1.5rem)`,          // header + 32 slots de 30min
  }}
>
  {/* coluna de horário sticky */}
  <div className="sticky left-0 ...">08:00</div>
  {/* célula de slot: grid-column = dia+2, grid-row = índice+2 */}
</div>
```
> `sticky left-0` no gutter de horário e `sticky top-0` no header de dias. Cada slot livre é uma célula posicionada por `grid-column`/`grid-row` calculados a partir do índice de 30 min (não usar lib de calendário — D-08).

### Anti-Patterns to Avoid
- **Offset fixo `-03:00` cabeado:** correto para hoje (SP sem DST desde 2019) mas ERRADO para datas históricas (1985–2019 tinham DST). Usar sempre o **named zone** via `@date-fns/tz`/`Intl`. [VERIFIED: web + IANA]
- **`new Date("YYYY-MM-DD")`:** parseia como UTC midnight → off-by-one em BRT. O repo já evita isso (`lib/compute-pediatric-age.ts` usa construtor local explícito). Para a agenda, construir instantes via `TZDate`/context `{ in }`, não string.
- **Comparar limites com `<=`:** duplica o slot da virada. Intervalos meio-abertos `[start, end)` sempre (D-11).
- **Persistir uma row por slot:** proibido por D-12. Só regras + exceções são gravadas.
- **Reaproveitar `components/ui/calendar.tsx` como grade de agenda:** é date-picker (react-day-picker), não agenda (D-08).
- **`npm install`:** repo é yarn-only. Usar `yarn add`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Conversão wall-clock ↔ instante no named zone | Parsing manual de offset / tabela de DST | `@date-fns/tz` (TZDate + `{ in: tz(...) }`) | DST/offsets históricos são um campo minado; delega ao `Intl.DateTimeFormat` nativo/tzdata do runtime [CITED: github.com/date-fns/tz] |
| Início de semana/dia/mês | Aritmética manual de datas | `startOfWeek({weekStartsOn:1})`, `startOfDay`, `startOfMonth`, `eachDayOfInterval` do date-fns v4 | Já instalado; casa com o context `{ in }` de fuso |
| Date-picker de exceção | Calendário custom | `components/ui/calendar.tsx` existente | Já no repo; a11y e navegação prontas |
| Validação de payload | Checagem manual | Zod `safeParse` + `lib/zod-error-message.ts` | Padrão do repo nos actions |
| Não-double-booking | (não implementar aqui) | Phase 7 — `btree_gist` exclusion constraint | Fora de escopo da Fase 6; manter o modelo limpo para a Phase 7 escrever por cima |

**Key insight:** O único código "de negócio" a escrever à mão é a **expansão pura** (regras+exceções → slots). Todo o resto (fuso, aritmética de calendário, picker, validação, CRUD escopado) tem molde/lib no repo. A dificuldade real está concentrada nos limites de fuso — que a lib resolve — e nos casos de borda da expansão — que os testes cobrem.

## Common Pitfalls

### Pitfall 1: Fuso do servidor vaza para o cálculo
**What goes wrong:** `startOfWeek(new Date())` usa o TZ do host (Vercel = UTC), gerando limites errados para o médico em SP.
**Why it happens:** date-fns sem o context `{ in }` opera no TZ local do runtime.
**How to avoid:** SEMPRE passar `{ in: tz(CLINIC_TIME_ZONE) }`; a fn pura recebe `timeZone` como parâmetro (nunca lê `process.env.TZ`).
**Warning signs:** Slots aparecem deslocados 3h; a virada de dia acontece à meia-noite UTC (21:00 BRT).

### Pitfall 2: Duplicação/sumiço de slot na virada
**What goes wrong:** Um slot às 00:00 aparece em dois dias, ou o último slot da faixa some.
**Why it happens:** Comparação `<=` no fim do intervalo, ou fim de janela inclusivo.
**How to avoid:** Meio-aberto `[start, end)` em toda comparação e na janela da view (`weekEnd = weekStart + 7 dias`, exclusivo). Teste explícito de transição (D-11).

### Pitfall 3: Sobra da faixa vira slot quebrado
**What goes wrong:** Faixa 14:00–18:00 @ 45min gera um 6º slot 17:45–18:30 que estoura a faixa.
**Why it happens:** Loop que não checa `slotEnd <= bandEnd` antes de emitir.
**How to avoid:** Só emitir slot se `slotStart + duration <= bandEnd`; descartar a sobra (D-10). Teste explícito no `.spec`.

### Pitfall 4: Exceção parcial subtrai a faixa errada
**What goes wrong:** Exceção "saio 16h nessa quarta" remove o dia todo, ou não remove nada.
**Why it happens:** Faixa opcional (null=dia todo, D-04) mal interpretada; comparação de sobreposição frouxa.
**How to avoid:** Regra clara: exceção sem faixa → remove todos os slots da data; exceção com faixa `[exStart, exEnd)` → remove slots que **sobrepõem** (`slot.start < exEnd && slot.end > exStart`). Testar ambos.

### Pitfall 5: RLS habilitada sem policy = negação silenciosa
**What goes wrong:** Tabela retorna zero rows sem erro.
**Why it happens:** `enable row level security` sem SELECT policy (documentado no repo em `20260720000100_rls_vaccine_schedules.sql`).
**How to avoid:** Enable RLS + todas as policies (select/insert/update/delete) na MESMA migration (D-13), escopadas por `profile_id in (select id from public.profiles where auth_user_id = auth.uid())`.

## Data Model for availability rules + exceptions

> Nomes à discrição do planner (D-Discretion). Formas recomendadas abaixo, seguindo o template `20260720000500_patient_vaccine_doses.sql`.

**Tabela 1 — `availability_rules` (grade recorrente semanal, AGENDA-01/02, D-02/D-09):**
```
id            uuid pk default gen_random_uuid()
profile_id    uuid not null references public.profiles(id) on delete cascade
weekday       smallint not null  -- 0=domingo..6=sábado (ou ISO 1=seg..7=dom; DECIDIR e documentar)
start_minute  smallint not null  -- minutos desde 00:00, múltiplo de 30 (D-03), ex 480 = 08:00
end_minute    smallint not null  -- meio-aberto: faixa é [start, end); múltiplo de 30
slot_minutes  smallint not null  -- duração POR FAIXA (D-09), ex 30 ou 20
created_at    timestamptz not null default now()
check (end_minute > start_minute)
check (start_minute % 30 = 0 and end_minute % 30 = 0)   -- D-03
check (slot_minutes > 0)
```
- **Múltiplas faixas/dia (D-02):** múltiplas rows com mesmo `weekday` (manhã + tarde). Não há unique em `(profile_id, weekday)`.
- **Armazenar minutos-desde-meia-noite** (não `time`/`timestamptz`) mantém a regra como **wall-clock puro**, independente de fuso e de data — a fn de expansão ancora esses minutos num dia concreto no named zone. Alternativa `time without time zone` também serve; minutos evitam qualquer coerção de tz do driver.

**Tabela 2 — `availability_exceptions` (subtrativa, AGENDA-03, D-04/D-05):**
```
id            uuid pk default gen_random_uuid()
profile_id    uuid not null references public.profiles(id) on delete cascade
exception_date date not null                 -- data da clínica (wall-clock SP)
start_minute  smallint                        -- NULL = dia inteiro (D-04); múltiplo de 30
end_minute    smallint                        -- NULL = dia inteiro; meio-aberto se preenchido
created_at    timestamptz not null default now()
check ((start_minute is null) = (end_minute is null))   -- ambos ou nenhum
check (start_minute is null or (end_minute > start_minute
       and start_minute % 30 = 0 and end_minute % 30 = 0))
```
- `date` (não `timestamptz`): a exceção é um dia do calendário da clínica; comparar com o dia local SP na expansão.
- **Só subtrativa** nesta fase (D-05) — nenhuma coluna "additive/type".

**RLS (ambas as tabelas, D-13):** `enable row level security` + policies select/insert/update/delete com `profile_id in (select id from public.profiles where auth_user_id = auth.uid())`, exatamente como `patient_vaccine_doses`. Índice `(profile_id, weekday)` em rules e `(profile_id, exception_date)` em exceptions.

**Forward constraint (Phase 7):** manter as tabelas de disponibilidade **sem** referência a consultas. A Phase 7 criará `appointments` com `btree_gist` exclusion constraint por conta própria — a disponibilidade só precisa expor slots livres deterministicamente. NÃO adicionar FK/colunas de consulta agora.

**Month view (D-07 — confirmado):** o mês é **indicador leve por dia** (atende vs folga + total de slots livres), NÃO slots reais. A fn de expansão pode devolver, além de `FreeSlot[]`, um resumo `{ [isoDate]: { freeSlotCount, hasAvailability } }` derivado da mesma passagem, para pintar as células do mês sem renderizar horários. Racional: sem consultas na Fase 6, slots reais no mês seriam densos/ilegíveis.

## Pure Slot-Expansion Function Design

**Recommended signature** (molde: `computePediatricAge(birthIso, now, ...)` — determinística, recebe o "tempo" por parâmetro):

```typescript
// lib/expand-availability.ts
export type AvailabilityBand = {
  weekday: number          // 0..6 (ou ISO 1..7 — bater com a coluna do DB)
  startMinute: number      // minutos desde 00:00, múltiplo de 30
  endMinute: number        // meio-aberto [start, end)
  slotMinutes: number      // duração POR FAIXA (D-09)
}

export type AvailabilityException = {
  date: string             // "YYYY-MM-DD" (dia local da clínica)
  startMinute: number | null  // null = dia inteiro (D-04)
  endMinute: number | null
}

export type FreeSlot = {
  start: Date              // instante (UTC) do início do slot
  end: Date                // instante (UTC) do fim (meio-aberto)
  localDate: string        // "YYYY-MM-DD" no fuso da clínica (para agrupar por dia)
}

export type ExpandResult = {
  slots: FreeSlot[]
  byDay: Record<string, { freeSlotCount: number; hasAvailability: boolean }> // para o mês (D-07)
}

export function expandAvailability(input: {
  rules: AvailabilityBand[]
  exceptions: AvailabilityException[]
  window: { from: Date; to: Date }     // meio-aberto [from, to) — janela da view
  timeZone: string                     // "America/Sao_Paulo" (nunca lido do host)
}): ExpandResult
```

**Internal shape / algoritmo:**
1. Iterar cada dia local `d` em `[window.from, window.to)` via `eachDayOfInterval` com `{ in: tz(timeZone) }`.
2. Para o `weekday` de `d`, pegar todas as bands (D-02: várias por dia).
3. Para cada band, gerar slots `slotStart = startOfDay(d, {in:tz}) + startMinute`, avançando `slotMinutes`, emitindo **enquanto `slotStart + slotMinutes <= bandEnd`** (D-10: descarta a sobra).
4. Aplicar exceções da data `d`: se alguma exceção tem `startMinute===null` → dia inteiro removido (pula o dia); senão remover slots que sobrepõem `[exStart, exEnd)` (`slot.start < exEnd && slot.end > exStart`).
5. Recortar ao `window` meio-aberto (`slot.start >= from && slot.start < to`).
6. Acumular `byDay` para o mês.

**Exact `.spec.ts` cases the plan MUST cover** (molde `compute-pediatric-age.spec.ts`, `now`/janela explícitos, TZ-independente):
- **D-02 múltiplas faixas/dia:** manhã 08:00–12:00 + tarde 14:00–18:00 no mesmo weekday → dois blocos, gap do almoço vazio.
- **D-09 duração por faixa:** manhã @30min e tarde @20min no mesmo dia → contagens diferentes por faixa.
- **D-10 sobra descartada:** 14:00–18:00 @45min → exatamente 14:00, 14:45, 15:30, 16:15, 17:00 (5 slots; ignora 15 min finais).
- **D-10 divisão exata:** 08:00–12:00 @30min → 8 slots, sem sobra.
- **D-04 exceção dia inteiro:** data cai num weekday com faixas → 0 slots naquele dia, dias vizinhos intactos.
- **D-04 exceção parcial:** "saio 16:00" numa quarta 14:00–18:00 → só 14:00, 14:30, 15:00, 15:30 (remove ≥16:00).
- **D-04 exceção parcial que não sobrepõe:** exceção fora das faixas do dia → nenhum slot removido.
- **D-11 virada de semana (semana começa na segunda):** janela seg 00:00 → próx. seg 00:00; slot de domingo 23:30–00:00 pertence à semana corrente, não à seguinte; sem duplicação.
- **D-11 virada de dia meio-aberta:** slot que termina exatamente em 00:00 pertence ao dia que termina, não ao seguinte.
- **D-11 fuso fixo:** mesmos inputs com `timeZone="America/Sao_Paulo"` produzem os mesmos slots independentemente do TZ do processo de teste (rodar com `TZ=UTC` e `TZ=America/New_York` deve dar igual) — asserção-chave de fuso.
- **Janela vazia / weekday sem faixa:** 0 slots, sem throw.
- **Mês (D-07):** `byDay` conta slots livres por dia e marca `hasAvailability`.

> Documentar no header JSDoc a convenção de `weekday` (0-based vs ISO) — deve casar com a coluna do DB e com `date-fns` `getDay()` (0=domingo) ou `getISODay()`.

## Runtime State Inventory

> Não aplicável a esta fase. Phase 6 é **greenfield**: cria tabelas, módulo, rota e uma função pura novos. Não há rename/refactor/migração de dados existentes.
>
> - **Stored data:** None — nenhuma tabela existente é renomeada ou migrada; duas tabelas novas.
> - **Live service config:** None — sem serviço externo novo (zero nova superfície de ataque, CONTEXT §domain).
> - **OS-registered state:** None — sem tasks/cron/registros de SO.
> - **Secrets/env vars:** None — sem novo segredo; `America/Sao_Paulo` é constante de código (`lib/clinic-timezone.ts`), não env.
> - **Build artifacts:** None — apenas adicionar `@date-fns/tz` ao `package.json` (rodar `yarn install` após).

## Code Examples

### Gerar limites da view semana (segunda, meio-aberto)
```typescript
// Source: github.com/date-fns/tz + date-fns v4 { in } context
import { tz } from "@date-fns/tz"
import { startOfWeek, addDays } from "date-fns"
import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"

const weekStart = startOfWeek(anchor, { in: tz(CLINIC_TIME_ZONE), weekStartsOn: 1 })
const weekEnd = addDays(weekStart, 7)   // [weekStart, weekEnd)
```

### Gerar slots de uma faixa descartando a sobra (D-10)
```typescript
import { tz } from "@date-fns/tz"
import { startOfDay, addMinutes } from "date-fns"

function bandSlots(day: Date, band: AvailabilityBand, timeZone: string) {
  const base = startOfDay(day, { in: tz(timeZone) })
  const bandStart = addMinutes(base, band.startMinute)
  const bandEnd = addMinutes(base, band.endMinute)   // exclusivo
  const out: { start: Date; end: Date }[] = []
  let s = bandStart
  while (addMinutes(s, band.slotMinutes) <= bandEnd) {  // D-10: só slot inteiro
    out.push({ start: s, end: addMinutes(s, band.slotMinutes) })
    s = addMinutes(s, band.slotMinutes)
  }
  return out
}
```

### Módulo CRUD escopado (molde do repo)
```typescript
// modules/availability/list-availability-rules.ts
import type { SupabaseClient } from "@supabase/supabase-js"

export async function listAvailabilityRules(
  supabase: SupabaseClient,
  profileId: string,
) {
  const { data, error } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("profile_id", profileId)   // defense-in-depth além da RLS
  if (error) throw new Error(`[AVAILABILITY] Failed to list rules: ${error.message}`)
  return data
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `date-fns-tz` (`utcToZonedTime`/`zonedTimeToUtc`) sobre date-fns v2/v3 | `@date-fns/tz` `TZDate` + context `{ in: tz(...) }` first-class no date-fns v4 | date-fns v4.0 (set/2024) | Como já usamos date-fns v4, o caminho correto é `@date-fns/tz`, não `date-fns-tz` [CITED: blog.date-fns.org/v40-with-time-zone-support] |
| SP com DST (verão) | SP sem DST desde 2019 (UTC-03 fixo o ano todo) | 2019 (decreto) | DST é risco só para datas históricas 1985–2019; usar named zone garante correção retroativa também [VERIFIED: web + IANA] |

**Deprecated/outdated:**
- Misturar `date-fns-tz` v3 com date-fns v4: caminho legado; não adotar.
- Offset fixo `-03:00` hardcoded: frágil para histórico; usar named zone.

## Project Constraints (from CLAUDE.md)

- **Stack fixo:** Next.js 16 (App Router, Server Actions), React 19, TS, Tailwind 4, shadcn/ui — três camadas `app/ → actions/ → modules/`.
- **Toda query escopada por `profile_id`**; manter gate de assinatura (`profile.status === "paid"`) nos novos actions.
- **Yarn 1.x only** (`packageManager` pinado; commit `556f6b8` yarn-only) — `yarn add`, nunca `npm install`.
- **Modules:** uma fn exportada por arquivo; recebem `SupabaseClient` por injeção; **nunca** constroem client nem importam `next/cache`/`next/headers`; `throw new Error("[DOMAIN] ...")`.
- **Actions:** `getAuthenticatedUser(supabase)` + gate `paid` + Zod `safeParse`; retornam result unions `{ ok: true } | { ok: false; error }`.
- **Migrations** `YYYYMMDDHHMMSS_*.sql`, ordem `table → rls → seed`, RLS + policies sempre no mesmo arquivo (D-13).
- **Naming:** arquivos kebab-case; funções/vars camelCase; tipos/componentes PascalCase; actions sufixo `Action`; booleanos `is`/`has`/`should`.
- **Formatação:** 2 espaços, aspas duplas; strings de UI em PT-BR.
- **Testes:** `yarn test` = `find modules lib -name '*.spec.ts' | xargs tsx --test`. A fn pura DEVE viver em `lib/` (ou `modules/`) para ser coletada.
- **Privacidade:** dado do médico dono; nada de nova superfície externa nesta fase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Intl.DateTimeFormat` puro seria viável mas verboso vs `@date-fns/tz` | Alternatives | Baixo — a recomendação (usar `@date-fns/tz`) é robusta independentemente. |
| A2 | Temporal polyfill é overkill para um único named zone fixo | Alternatives | Baixo — decisão de simplicidade; não bloqueia. |
| A3 | Armazenar faixa como `start_minute`/`end_minute` (int) preferível a `time` | Data Model | Baixo/Médio — `time without time zone` também funcionaria; planner pode escolher. Ambos evitam coerção de tz se tratados como wall-clock. |
| A4 | Convenção de `weekday` (0-based domingo vs ISO segunda) fica a critério, desde que casada DB↔fn | Pure Function | Médio — inconsistência causaria slots no dia errado; mitigado por teste D-11 e JSDoc. |

## Open Questions

1. **Convenção de weekday (0=domingo vs ISO 1=segunda)?**
   - What we know: `date-fns` `getDay()` = 0(dom)..6(sáb); `startOfWeek({weekStartsOn:1})` já cobre "semana começa na segunda" na view.
   - What's unclear: qual índice gravar na coluna `weekday`.
   - Recommendation: escolher UMA convenção, documentar no JSDoc da fn e no comentário da migration, e cobrir com o teste de virada de semana (D-11). Discrição do planner (D-Discretion).

2. **Range de horas visível na grade (ex: 06:00–22:00)?**
   - What we know: passo de 30 min fixo (D-03); range é Discrição do planner/UI-spec.
   - Recommendation: definir no UI-SPEC (esta fase tem `UI hint: yes`); 06:00–22:00 é um default razoável para pediatria, ajustável.

3. **Editor da grade: pintar/arrastar vs clicar-célula (D-01)?**
   - What we know: Discrição do planner respeitando 30 min.
   - Recommendation: começar com clicar-célula (toggle) por simplicidade; arrastar é enhancement — decidir no UI-SPEC.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@date-fns/tz` | Cálculo de fuso (AGENDA-04) | ✓ (phantom em node_modules; declarar) | 1.4.1 (latest 1.5.0) | — |
| `date-fns` | Aritmética de datas | ✓ | 4.1.0 | — |
| `Intl.DateTimeFormat` + tzdata (Node runtime) | Base do `@date-fns/tz` | ✓ | Node full-ICU (padrão Node ≥13) | — |
| Supabase (Postgres) | Tabelas + RLS | ✓ | projeto configurado | — |
| `tsx --test` | Testes da fn pura | ✓ | tsx ^4.21.0 | — |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** none

> Ação obrigatória: declarar `@date-fns/tz` em `package.json` via `yarn add @date-fns/tz` (hoje é phantom/transitivo — não confiar nisso).

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1`. Esta fase é **owner-only, zero nova superfície externa** (CONTEXT §domain): tudo do médico dono, escopado por `profile_id`. Sem assento/delegação (Phase 8/9), sem endpoint público, sem token.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | sim (reuso) | `getAuthenticatedUser(supabase)` já existente; sem novo fluxo de auth |
| V3 Session Management | não | Sessão Supabase existente reusada; nada novo |
| V4 Access Control | **sim** | RLS `profile_id` nas 2 tabelas novas + `.eq(profile_id)` no módulo + gate `profile.status === "paid"` no action (defense-in-depth) |
| V5 Input Validation | **sim** | Zod `safeParse` nos actions: weekday ∈ range, start<end, múltiplos de 30, slot_minutes>0, data de exceção válida; erros → PT-BR |
| V6 Cryptography | não | Sem dado criptográfico novo |

### Known Threat Patterns for este stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR / acesso a disponibilidade de outro médico | Elevation of Privilege | RLS por `profile_id` + filtro `.eq(profile_id)` no módulo; teste de ownership (Pitfall 17 do repo) |
| RLS habilitada sem policy → negação silenciosa (bug funcional) OU policy frouxa (vazamento) | Information Disclosure | Enable RLS + TODAS as policies na mesma migration (D-13); revisar `using`/`with check` idênticos ao template `patient_vaccine_doses` |
| Injeção via input de faixa/data | Tampering | Supabase client parametriza queries; Zod valida forma/range antes do módulo |
| Bypass do gate de assinatura em action novo | Elevation of Privilege | Gate `profile.status === "paid"` em todo action novo (convenção do repo) |

> Nota de escopo de segurança: NÃO abrir leitura cross-profile nem antecipar o assento da assistente (isso é Phase 8, marcada como fundação de segurança). Manter estritamente owner-scoped.

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view`, api.npmjs.org) — versões, datas, downloads de `@date-fns/tz`, `date-fns`, `date-fns-tz` [VERIFIED]
- Codebase: `lib/compute-pediatric-age.ts(.spec)`, `supabase/migrations/20260720000500_*`, `20260720000100_*`, `modules/patient-vaccine-doses/*`, `package.json`, `.planning/config.json` [VERIFIED]
- github.com/date-fns/tz — usage patterns TZDate/`tz()`, TZDate vs TZDateMini, DST via Intl [CITED]

### Secondary (MEDIUM confidence)
- blog.date-fns.org/v40-with-time-zone-support — v4 timezone support first-class [CITED]
- css-tricks.com/building-a-conference-schedule-with-css-grid — padrão CSS grid de agenda [CITED]
- en.wikipedia.org/wiki/Daylight_saving_time_in_Brazil + timeanddate.com — SP aboliu DST 2019, UTC-03 fixo, histórico 1985–2019 [VERIFIED via múltiplas fontes]

### Tertiary (LOW confidence)
- Comparação qualitativa Intl puro / Temporal polyfill (training knowledge) [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `@date-fns/tz` verificado no registry + já no repo; caminho oficial do date-fns v4.
- Timezone strategy: HIGH — docs oficiais + fato histórico de DST verificado; recomendação alinhada ao stack existente.
- Data model: HIGH — segue template comprovado do repo (`patient_vaccine_doses` + RLS).
- Pure function / testes: HIGH — molde direto de `compute-pediatric-age`; casos derivados das decisões travadas.
- CSS grid agenda: MEDIUM — padrão bem estabelecido, mas layout exato fica ao UI-SPEC.

**Research date:** 2026-07-20
**Valid until:** 2026-08-19 (30 dias — stack estável; `@date-fns/tz` pode ganhar patch, sem impacto de API)
