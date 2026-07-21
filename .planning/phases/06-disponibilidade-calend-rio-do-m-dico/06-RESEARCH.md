# Phase 6: Disponibilidade & Calendário do Médico — Research (v2 REDESIGN)

**Researched:** 2026-07-21
**Domain:** Modelo de disponibilidade HÍBRIDO (template recorrente + overrides por data aditivos/subtrativos), expansão de slots pura/DST-safe em `America/Sao_Paulo`, migração owner-scoped preservando dados v1, calendário único editável (pintura por clique/arraste + salvar em lote) em CSS grid custom, Next.js 16 RSC + client component.
**Confidence:** HIGH (modelo de dados, migração, expansão pura, segurança — grounded no código v1 e no template do repo) · MEDIUM (mecânica de arraste e guarda de navegação — padrões estáveis, mas WebSearch indisponível nesta sessão para confirmar a API exata do Next 16)

## Summary

Esta é a **reescrita v2** de uma fatia já entregue e no banco. Não é greenfield: as tabelas `availability_rules` e `availability_exceptions` existem com dados de teste, a função pura `expandAvailability` existe e é testada (13 casos), e há uma UI read-only completa. O UAT redefiniu a tela: o médico quer **um calendário único editável** onde pinta disponibilidade (verde) e folgas por clique/arraste/dia-inteiro, com um toggle Disponibilidade|Folga, e **salva em lote** com guarda de descarte. O modelo de disponibilidade passa de "recorrente + exceções só-subtrativas" para **HÍBRIDO**: template recorrente + **overrides por data ADITIVOS e SUBTRATIVOS** (AGENDA-05 nova).

O risco técnico concentra-se em quatro pontos, todos já mapeados: (1) **evoluir o schema preservando dados** (ALTER + backfill das folgas v1 como override subtrativo, não recomeçar limpo — D-22); (2) **reescrever `expandAvailability` para o modelo híbrido com precedência correta** (template → aditivos da data → subtrativos da data; folga vence) **e corrigir WR-01** — a aritmética atual usa `addMinutes` absoluto sobre `startOfDay`, que deriva 1h em dias de transição DST em zonas com DST (mascarado hoje porque SP não tem DST desde 2019, mas o contrato da função e o `.spec` afirmam correção em `America/New_York`); (3) **decidir onde a expansão roda ao navegar de mês** (cliente vs. round-trip); (4) **corrigir a validação frouxa (WR-02), o teto ausente de minutos (WR-03) e a inalcançabilidade de 24:00 na UI (WR-04)**.

**Primary recommendation:** Estender `availability_exceptions` com uma coluna `override_type` (`'subtract'` default | `'add'`) via **ALTER + backfill** (existentes → `'subtract'`) na MESMA migration owner-scoped, renomeando conceitualmente para "overrides" mas preservando a tabela e todas as rows — evita drop/recreate e mantém RLS/policies/índices. Reescrever `expandAvailability` para receber `overrides` (com `type`) em vez de `exceptions`, aplicando **aditivos primeiro (união de slots) e subtrativos por último (folga vence)**, e substituir `addMinutes(startOfDay(...))` por construção wall-clock DST-safe (`TZDate` com hora/minuto explícitos, ou `setHours`/`setMinutes` no context `{ in: tz }`). Rodar a expansão **no cliente** ao navegar dia/semana/mês (a função já é pura e serializável; o payload de rules+overrides do médico é pequeno — dezenas de rows), com o RSC fornecendo o dataset inicial. Grade editável = CSS grid custom (D-08, sem lib de calendário) com clique-para-alternar como baseline obrigatório e arraste como enhancement opcional (pointer events). Salvar em lote via um único action que recebe o diff (grade recorrente completa + lista de overrides adicionados/removidos). Nenhum pacote novo — `@date-fns/tz@^1.5.0` e `date-fns@^4.1.0` já declarados.

<user_constraints>
## User Constraints (from CONTEXT.md v2)

### Locked Decisions

**Superfície: calendário único editável**
- **D-14 (v2):** A tela é **um calendário só** com **abas Dia / Semana / Mês à esquerda** e um **painel de ações à direita**. Navegação anterior/hoje/próximo, incluindo **entre meses**. Substitui a grade-editora-separada + views read-only da v1.
- **D-15 (v2):** Um **toggle único no painel direito: Disponibilidade | Folga**. O modo ativo define o que a pintura aplica. **Verde = disponível**; folga = tratamento neutro (bg-muted/hachura, badge "Folga"), NÃO destructive-red.
- **D-16 (v2):** **Pintura** — **clicar** um slot alterna aquele horário; **clicar-e-arrastar** marca um **período contíguo** no dia; controle **"dia inteiro"** marca/desmarca o dia todo. Passo de 30 min preservado (D-03).
- **D-17 (v2):** **Salvar em lote** — pinta várias mudanças e clica **Salvar** uma vez. Estado **"não salvo" visível**. Navegar/trocar aba/sair com mudanças não salvas → **confirmar antes de descartar**. Não salvar automático, não perder em silêncio.
- **D-18 (v2):** A aba **Mês é só indicador** (ponto + contagem de livres por dia, como D-07); a **edição/pintura acontece em Dia/Semana**. Clicar um dia no Mês pode navegar para aquele Dia, mas não pinta faixa no Mês.

**Modelo de disponibilidade: HÍBRIDO (recorrente + overrides por data)**
- **D-19 (v2):** **Template recorrente** por dia da semana + faixa + duração-por-faixa continua sendo a **base** (evolui a v1 `availability_rules`; D-02/D-09 mantidos).
- **D-20 (v2):** **Overrides por data** sobrescrevem a semana para uma data específica: **ADITIVOS** (abrir horário extra pontual — AGENDA-05) **OU SUBTRATIVOS** (folga: dia inteiro ou faixa parcial — a antiga exceção v1). Substitui D-05.
- **D-21 (v2):** **Precedência da expansão** (default sensato — refinar em research/planner): **template recorrente → overrides aditivos da data → folgas subtrativas da data**. Folga vence disponibilidade no mesmo horário. Forma exata do schema fica a critério do planner, respeitando D-22.

**Migração dos dados da v1**
- **D-22 (v2):** **Preservar e migrar** (não recomeçar limpo). Evoluir o schema via **ALTER + tabela/coluna nova de overrides**, preservando `availability_rules` e `availability_exceptions` já cadastradas. Nova migration owner-scoped, RLS + policies na mesma migration (D-13). As folgas subtrativas existentes mapeiam para o novo override subtrativo sem perda.

**Requisito novo**
- **D-23 (v2):** Registrar **AGENDA-05** em REQUIREMENTS.md (já feito): override aditivo. AGENDA-01..04 permanecem (rastreabilidade reabre — UI muda, expansão muda).

**Continuam válidas da v1 (não re-discutidas)**
- **D-03:** Passo de **30 min**. **D-02:** múltiplas faixas por dia. **D-09:** duração **por faixa**. **D-10:** descartar a sobra que não divide certo.
- **D-11:** fuso **fixo America/Sao_Paulo**, **semana começa na segunda**, intervalos **meio-abertos** `[início, fim)`, sem slot duplicado/sumido nas viradas.
- **D-12:** regras/overrides **armazenados**; slots **expandidos na leitura** por **função pura testável** (`.spec.ts`). Nenhuma row-por-slot.
- **D-13:** tabelas **owner-scoped por `profile_id`**, RLS + policies na mesma migration; três camadas `app/ → actions/ → modules/`, gate `profile.status === "paid"` em actions e no RSC.

### Claude's / planner's discretion
- **Expansão na navegação:** mover a expansão para o **cliente** (fn pura roda no browser sobre rules+overrides carregados uma vez) OU round-trip ao servidor por janela. Preferência de partida: **cliente**.
- **Mecânica de arraste** (pointer events, seleção numa coluna-dia, feedback visual), range de horas visível, densidade e rótulos — a critério do UI-spec, respeitando D-16 e o passo de 30 min.
- **Forma do schema de overrides** (tabela nova vs. coluna de tipo em `availability_exceptions`), nomes de tabelas/colunas, assinatura exata da `expandAvailability` v2.

### Deferred Ideas (OUT OF SCOPE)
- **Arraste entre múltiplos dias no Mês** (pintar range de dias de folga de uma vez) — Mês fica indicador (D-18).
- **Desfazer/refazer (undo/redo)** da pintura antes de salvar — o "confirmar descarte" (D-17) cobre a proteção mínima.
- **No-double-booking / consultas** — Phase 7 (APPT-*).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AGENDA-01 | Disponibilidade recorrente por dia da semana + faixa; repete semana após semana | Template recorrente = `availability_rules` (preservada; D-19). Pintura no calendário editável deriva as faixas; salvar em lote reescreve a grade (delete-then-insert já existente). Ver §Migração & §Salvar em Lote. |
| AGENDA-02 | Duração do slot; horários gerados nas faixas (regras armazenadas, expandidos na leitura) | `slot_minutes` por faixa (D-09) preservado. `expandAvailability` v2 mantém a expansão pura na leitura (D-12). Ver §Expansão Híbrida. |
| AGENDA-03 | Exceções pontuais por data (folga) que removem horários | Override **subtrativo** — a antiga exceção v1 (dia inteiro ou faixa parcial). Backfill das folgas existentes como `override_type='subtract'`. Ver §Migração & §Expansão Híbrida (precedência: folga vence). |
| AGENDA-04 | Views dia/semana/mês corretas nas viradas de fuso/transições | Expansão DST-safe em `America/Sao_Paulo` via `@date-fns/tz` (D-11), meio-aberto `[from,to)`. Correção WR-01 na reescrita. Navegação entre meses (D-14). Ver §Expansão Híbrida & §Pitfalls. |
| AGENDA-05 | Override **aditivo**: abrir horário extra pontual por data, fora do template daquele dia | Override `override_type='add'`. Aplicado ANTES dos subtrativos na expansão (D-21). Novo módulo/action de criação. Ver §Modelo de Dados & §Expansão Híbrida. |
</phase_requirements>

## Summary Executivo do que muda da v1 → v2

| Área | v1 (no banco / no repo hoje) | v2 (esta fase) |
|------|------------------------------|----------------|
| Tela | Grade-editora separada + 3 views read-only | Calendário único editável, dia/semana/mês, painel de ações à direita (D-14) |
| Interação | Clicar-célula no editor separado | Pintar (clicar/arrastar/dia-inteiro) direto no calendário; toggle Disponibilidade\|Folga (D-15/D-16) |
| Salvar | Salvar grade (upsert) + criar/excluir exceção pontual | Salvar em lote com diff + guarda de descarte (D-17) |
| Modelo | Recorrente + exceções só-subtrativas | Híbrido: recorrente + overrides aditivos E subtrativos (D-19/D-20) |
| Expansão | `expandAvailability({rules, exceptions, window, timeZone})` | `expandAvailability({rules, overrides, window, timeZone})` com precedência (D-21) + DST-safe (WR-01) |
| Schema | 2 tabelas | Mesmas 2 tabelas, `availability_exceptions` ganha `override_type` via ALTER+backfill (D-22) |
| Bugs abertos | WR-01..04 (do 06-REVIEW.md) | Corrigir todos os 4 nesta reescrita |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Persistência de regras + overrides | Database (Postgres) | — | `availability_rules` (template) + `availability_exceptions` estendida com `override_type` (D-20/D-22). RLS+policies na mesma migration (D-13). |
| Autorização + escopo por dono | Database (RLS) + API (action gate) + RSC gate | — | Defense-in-depth: RLS `profile_id` + `.eq(profile_id)` no módulo + gate `paid` no action E no RSC. Zero nova superfície externa (owner-only). |
| Expansão híbrida (template + overrides → slots) | API/Server (fn pura em `lib/`) para carga inicial | **Client** (mesma fn pura ao navegar dia/semana/mês) | D-12: expandir na leitura, nunca persistir slot. Pura/determinística/serializável → roda em ambos os lados. Recomendação: cliente para navegação (payload pequeno). |
| Cálculo de fuso/limites DST-safe | API/Server + Client (`@date-fns/tz`) | — | Named zone fixo `America/Sao_Paulo`; wall-clock via context `{ in: tz(...) }`, nunca `addMinutes` absoluto (WR-01). |
| Pintura da disponibilidade/folga | Client (`"use client"`, pointer events) | — | Clique-toggle (baseline obrigatório) + arraste (enhancement). Estado de edição local; diff. |
| Salvar em lote + guarda de descarte | Client (estado dirty + confirm) → API (action com diff) | — | D-17: estado "não salvo" visível; confirmar antes de navegar/sair; action recebe grade + overrides add/remove. |
| Indicador de mês | Client (deriva de `byDay`) | — | D-18: ponto + contagem por dia; sem slots reais na célula; sem pintura no mês. |
| Seletor de data (override aditivo pontual, se via dialog) | Client | — | `components/ui/calendar.tsx` (react-day-picker) — só como date-picker, nunca como grade (D-08). |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@date-fns/tz` | ^1.5.0 (já declarado) | `TZDate` + `tz()` para wall-clock DST-safe em `America/Sao_Paulo` | Companion oficial do date-fns v4 (mesmo monorepo); delega DST/offsets ao `Intl.DateTimeFormat`; integra via `{ in: tz(...) }` [VERIFIED: npm registry — OK, 32.5M downloads/sem, repo date-fns/date-fns, sem postinstall] |
| `date-fns` | ^4.1.0 (já instalado) | Aritmética de datas (`startOfWeek`, `startOfDay`, `eachDayOfInterval`, `setHours`/`setMinutes`, `addDays`) | Já em uso; v4 aceita o context `{ in }` [VERIFIED: npm registry — OK, 92.5M downloads/sem; codebase grep] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | ^4.3.6 (já instalado) | Validação no boundary da action (grade + overrides + data) | `safeParse`, mensagens PT-BR via `lib/zod-error-message.ts`. Aqui corrige WR-02/WR-03. [VERIFIED: codebase grep] |
| Tailwind CSS | ^4.2.1 (já instalado) | CSS grid custom do calendário editável (D-08/D-14) | `grid-template-columns`/`grid-template-rows`; sem lib de calendário [VERIFIED: codebase grep] |
| `react-day-picker` (via `components/ui/calendar.tsx`) | ^9.4.4 (já instalado) | Date-picker (se override aditivo pontual usar dialog com data) | SOMENTE date-picker — NUNCA como grade de agenda (D-08) [VERIFIED: codebase grep] |
| `sonner` | ^2.0.7 (já instalado) | Toasts de sucesso/erro do salvar | Padrão do repo [VERIFIED: codebase grep] |
| Pointer Events API (nativo, sem lib) | — | Arraste-para-pintar (`pointerdown`/`pointermove`/`pointerup` + `setPointerCapture`) | Enhancement opcional D-16; nativo do DOM, funciona mouse+touch [ASSUMED] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Coluna `override_type` em `availability_exceptions` (recomendado) | Tabela nova `availability_overrides` (drop `availability_exceptions`) | Tabela nova é mais "limpa" de nome, mas D-22 exige **preservar** as rows existentes → exigiria migração de dados entre tabelas + recriar RLS/policies/índices. ALTER+backfill é mais simples, atômico e sem perda. Preferir ALTER; renomear a tabela (`alter table rename to availability_overrides`) é opcional e cosmético — pesar contra referências em código/módulos. |
| Expansão no cliente (recomendado) | Round-trip ao servidor por janela de view | Servidor evita enviar todas as rows ao browser, mas: (a) a fn já é pura/serializável; (b) o dataset do médico é pequeno (≤7 dias × poucas faixas + overrides pontuais); (c) navegar mês-a-mês com round-trip adiciona latência a cada clique. Cliente dá navegação instantânea. Manter o RSC fazendo a carga inicial da view default. |
| Pointer Events nativos | `@dnd-kit` (já no repo) | `@dnd-kit` é para arrastar-e-soltar itens, não para "pintar" uma seleção retangular de células. Overkill e semanticamente errado aqui. Pointer events crus são o caminho para pintura. [ASSUMED] |
| Lib de calendário (FullCalendar/react-big-calendar) | — | **Proibido por D-08.** Adiciona superfície, CSS pesado e um modelo de eventos que não casa com "slots expandidos na leitura". |

**Installation:** Nenhum pacote novo. `@date-fns/tz@^1.5.0` e `date-fns@^4.1.0` já em `package.json` (o phantom da v1 foi corrigido — `@date-fns/tz` está declarado em `package.json:15`). Repo **yarn-only** — se algo precisar, `yarn add`, nunca `npm install`.

**Version verification (2026-07-21):**
- `@date-fns/tz`: instalado `1.5.0`; registry OK, publicado 2026-05-21, 32.5M downloads/sem [VERIFIED: npm registry + node_modules]
- `date-fns`: `4.1.0` em `package.json`; registry OK, 92.5M downloads/sem [VERIFIED: npm registry]
- Node runtime: `v20.19.2`, `require("@date-fns/tz")` carrega `TZDate` OK [VERIFIED: node -e]

## Package Legitimacy Audit

> Nenhum pacote NOVO é instalado nesta fase. As duas libs de data já estão declaradas e em uso desde a v1. Auditadas por completude.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@date-fns/tz` | npm | pub. 2026-05-21 (linha 1.x desde 2024) | 32.5M/sem | github.com/date-fns/date-fns (monorepo oficial) | OK | Aprovado — já em package.json, reuso |
| `date-fns` | npm | anos | 92.5M/sem | github.com/date-fns/date-fns | OK | Já instalado, reuso |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

Ambos publicados pelo org oficial `date-fns`, sem postinstall script, downloads massivos, não-deprecados. `gsd-tools query package-legitimacy check` retornou `OK` para ambos [VERIFIED: seam].

## Architecture Patterns

### System Architecture Diagram

```
   Médico (browser)                   app/dashboard/agenda/page.tsx (RSC)
        │                                   │ gate auth + paid (redirect)
        │                                   │ list rules + overrides (Promise.all, scoped)
        │                                   │ expandAvailability(view default = SEMANA) [server, carga inicial]
        │                                   ▼
        │                      ┌───────────────────────────────────┐
        │  navega dia/         │  CalendarEditor  (client)          │
        │  semana/mês  ───────▶│  ── recebe rules[] + overrides[]   │
        │                      │  ── expandAvailability roda AQUI    │◀── @date-fns/tz (wall-clock, DST-safe)
        │  pinta (clique/      │     ao trocar de janela (D-14)      │
        │  arraste/dia-inteiro)│  ── toggle Disponibilidade|Folga    │
        │  ───────────────────▶│     (D-15) aplica à seleção          │
        │                      │  ── estado de EDIÇÃO local + DIFF   │
        │                      │  ── "não salvo" visível (D-17)      │
        │                      └───────────┬───────────────────────┘
        │  clica Salvar (1×)               │ diff = { rules: full grid,
        ▼                                  │          overridesAdd[], overridesRemove[] }
   saveAvailabilityAction  ◀───────────────┘
   (gate paid, zod safeParse — corrige WR-02/03)
        │ reconcilia: delete-then-insert rules ; insert adds ; delete removes
        ▼
   modules/availability/*  (SupabaseClient injetado, .eq(profile_id))
        │
        ▼
   ┌─────────────────────┐   ┌─────────────────────────────────────┐
   │ availability_rules   │   │ availability_exceptions             │
   │ (template recorrente)│   │  + override_type 'add' | 'subtract' │  ← ALTER + backfill (D-22)
   │  RLS owner-scoped     │   │  RLS owner-scoped                    │
   └──────────┬──────────┘   └────────────┬────────────────────────┘
              │ rules + overrides (rows)   │
              └──────────────┬─────────────┘
                             ▼
              lib/expand-availability.ts  (FUNÇÃO PURA v2, D-12/D-21)
              in: rules[], overrides[]{type}, window{from,to}, timeZone
              precedência: template → aditivos da data → subtrativos (folga vence)
              wall-clock DST-safe (NÃO addMinutes absoluto — WR-01)
              out: FreeSlot[] + byDay{freeSlotCount,hasAvailability}
```

O único código de negócio genuinamente reescrito é a **expansão pura** (agora híbrida) e o **estado de edição/diff** do calendário editável. Todo o resto (fuso, CRUD escopado, gate, validação, RSC shell) já tem molde no repo v1 e no template `patient_vaccine_doses`.

### Recommended Project Structure (evolui a v1)
```
app/dashboard/agenda/
├── page.tsx                       # RSC: carga inicial (rules + overrides), expand da SEMANA, passa ao client
lib/
├── expand-availability.ts         # FUNÇÃO PURA v2 (híbrida + DST-safe) — reescrita
├── expand-availability.spec.ts    # +casos híbridos e DST (America/New_York)
├── clinic-timezone.ts             # CLINIC_TIME_ZONE (inalterado)
modules/availability/
├── list-availability-rules.ts         # (inalterado)
├── upsert-availability-rules.ts        # (inalterado — delete-then-insert da grade)
├── list-availability-overrides.ts      # evolui list-availability-exceptions (SELECT inclui override_type)
├── create-availability-override.ts     # evolui create-availability-exception (aceita type)
├── delete-availability-override.ts      # evolui delete-availability-exception
├── types.ts                            # AvailabilityOverrideRow ganha override_type
lib/schemas/
├── availability.ts                # +override_type; corrige WR-02 (regex ISO), WR-03 (max 1440)
actions/availability/
├── save-availability.ts           # action de salvar-em-lote (grade + overrides add/remove) — ou manter granular
├── ...                            # gate paid + zod + result union + revalidatePath
components/dashboard/agenda/
├── calendar-editor.tsx            # NOVO: calendário único editável (substitui agenda-view + availability-grid v1)
├── ...                            # subcomponentes (day/week grid, month indicator, action panel)
supabase/migrations/
├── <ts>_availability_overrides_hybrid.sql  # ALTER availability_exceptions ADD override_type + backfill + (opcional rename)
```

### Pattern 1: Wall-clock DST-safe (corrige WR-01)
**What:** Construir cada limite de slot como um instante wall-clock NO named zone, em vez de somar minutos absolutos a `startOfDay`. `addMinutes` soma minutos de relógio-de-parede-absoluto; num dia de spring-forward em zona com DST, `addMinutes(startOfDay(d), 480)` cai em 09:00 local, não 08:00 (verificado empiricamente no 06-REVIEW WR-01).
**When to use:** SEMPRE ao ancorar `startMinute`/`endMinute` de uma faixa/override num dia concreto.
**Example:**
```typescript
// Source: 06-REVIEW.md WR-01 + @date-fns/tz TZDate semantics
import { tz, TZDate } from "@date-fns/tz"
import { setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns"

// Recomendado: derivar hora/minuto do minute-of-day e SET no context do zone,
// deixando o Intl re-resolver o offset daquele wall-clock.
function wallClock(day: Date, minuteOfDay: number, timeZone: string): Date {
  const ctx = { in: tz(timeZone) }
  const h = Math.floor(minuteOfDay / 60)
  const m = minuteOfDay % 60
  // day já é zoned (vem de eachDayOfInterval com ctx). Set no zone:
  let d = setHours(day, h, ctx)
  d = setMinutes(d, m, ctx)
  d = setSeconds(d, 0, ctx)
  d = setMilliseconds(d, 0, ctx)
  return new Date(d.getTime())
}
// ALTERNATIVA: new TZDate(year, month, dayOfMonth, h, m, 0, 0, timeZone)
// construindo o wall-clock diretamente. Ambas re-resolvem o offset via Intl.
```
> Regra: comparar sempre `>= start && < end` (meio-aberto, D-11), nunca `<=`. A duração do slot em minutos ainda avança de `slotMinutes` — mas o AVANÇO também deve ser wall-clock (recomputar `wallClock(day, currentMinute + slotMinutes)`), não `addMinutes` sobre o instante, para não drenar 1h numa transição. O `.spec` DEVE incluir um dia de transição DST em `America/New_York` (ex. 2026-03-08) e afirmar que os minutos locais são preservados — a suite atual NÃO pega isso.

### Pattern 2: Expansão HÍBRIDA com precedência (D-21)
**What:** Para cada dia da janela: (a) coletar slots do **template recorrente** do weekday; (b) **somar** os slots dos **overrides aditivos** daquela data (união — abre horário extra, AGENDA-05); (c) **subtrair** os overrides subtrativos daquela data (folga vence — remove slots que sobrepõem, ou o dia todo se `startMinute===null`).
**When to use:** No corpo da `expandAvailability` v2.
**Precedência exata (folga vence):**
```
slotsDoDia = template(weekday) ∪ aditivos(data)     // união de faixas
slotsDoDia = slotsDoDia − subtrativos(data)          // folga remove por último
```
> Casos de borda a cobrir no `.spec`:
> - Aditivo abre faixa fora do template (dia sem template ganha slots só do aditivo).
> - Aditivo que SOBREPÕE o template não duplica slots (dedupe por `start` ou por (start,end)).
> - Aditivo + subtrativo no mesmo intervalo → subtrativo vence (0 slots ali).
> - Subtrativo dia-inteiro remove template E aditivos daquela data.
> - Aditivo com `slotMinutes` próprio (a coluna `slot_minutes` precisa existir/ser opcional nos overrides aditivos — decisão do schema: aditivo carrega sua própria duração ou herda? recomendar campo próprio para AGENDA-05 "duração por faixa").
> - Dedupe: definir chave canônica de slot (`start.getTime()`), pois união pode gerar o mesmo slot por dois caminhos.

### Pattern 3: Estado de edição local + diff + guarda de descarte (D-17)
**What:** O calendário editável mantém um estado local do que foi pintado desde o último salvar. Ao Salvar, computa o diff e envia. Enquanto houver mudanças (`isDirty`), o botão Salvar mostra estado "não salvo" e navegar/trocar aba/sair exige confirmação.
**When to use:** No componente client do calendário.
**Padrão:**
```typescript
"use client"
// estado inicial vindo do RSC (rules + overrides). Estado de edição = cópia mutável.
const [draft, setDraft] = React.useState(() => normalize(initial))
const isDirty = React.useMemo(() => !deepEqual(draft, initial), [draft, initial])

// Guarda de fechamento de aba/refresh (nativo):
React.useEffect(() => {
  if (!isDirty) return
  const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = "" }
  window.addEventListener("beforeunload", handler)
  return () => window.removeEventListener("beforeunload", handler)
}, [isDirty])

// Guarda de navegação interna (troca de aba dia/semana/mês, sair da página):
// interceptar a ação de navegação e, se isDirty, abrir AlertDialog
// ("Você tem mudanças não salvas — descartar?") antes de prosseguir.
```
> **Nota de stack (Next 16 App Router):** o App Router NÃO tem um `useBlocker`/`Prompt` first-class como o Pages Router antigo. Padrões usados na prática: (1) `beforeunload` cobre refresh/fechar aba; (2) para navegação interna via `<Link>`/`router.push`, interceptar no próprio componente — como a troca de aba dia/semana/mês é estado LOCAL do componente (não muda de rota), a guarda é trivial (checar `isDirty` antes de trocar a aba e abrir o AlertDialog); (3) sair da rota `/dashboard/agenda` para outra: envolver os pontos de saída ou confiar no `beforeunload` + um confirm no clique dos links de saída conhecidos. **Verificar a API exata do Next 16 no planner** — WebSearch esteve indisponível nesta sessão (ver Assumptions/Open Questions). [ASSUMED]

### Pattern 4: Arraste-para-pintar em CSS grid custom (D-16, enhancement)
**What:** Clique-toggle é o baseline OBRIGATÓRIO. Arraste é enhancement: `pointerdown` numa célula inicia; `pointermove` estende a seleção contígua na mesma coluna-dia (calculando o índice de 30 min sob o ponteiro); `pointerup` aplica o modo ativo (Disponibilidade|Folga) a todo o range. Usar `setPointerCapture` para não perder eventos ao sair da célula.
**When to use:** No grid de dia/semana editável.
**Padrão (nativo, sem lib):**
```tsx
// Source: Pointer Events API (W3C) — padrão de "brush select" [ASSUMED — WebSearch indisponível]
function onPointerDown(e: React.PointerEvent, col: number, rowIdx: number) {
  (e.target as HTMLElement).setPointerCapture(e.pointerId)
  setDragging({ col, from: rowIdx, to: rowIdx, mode: activeMode })
}
function onPointerMove(e: React.PointerEvent) {
  if (!dragging) return
  const rowIdx = rowIndexFromClientY(e.clientY) // mapeia Y → índice de 30 min
  setDragging((d) => d && { ...d, to: rowIdx })
}
function onPointerUp() {
  if (dragging) applyRange(dragging) // aplica Disponibilidade|Folga ao [from,to] contíguo
  setDragging(null)
}
```
> Acessibilidade: como clique-toggle é o baseline, a grade é operável sem arraste (teclado/tap). Mobile: pointer events cobrem touch nativamente; usar `touch-action: none` na área de pintura para não rolar a página durante o arraste. Alvo de toque ≥ 44px num eixo (UI-SPEC). Não bloquear a fase se o arraste não for implementado — D-16 permite clique como baseline; o UI-SPEC v1 dizia "drag opcional".

### Anti-Patterns to Avoid
- **`addMinutes(startOfDay(d), minute)` para limites de slot:** deriva em DST (WR-01). Usar wall-clock construído no zone.
- **Recomeçar o schema do zero (drop + recreate):** viola D-22. Usar ALTER + backfill preservando rows.
- **`Date.parse` para validar data de override:** aceita `07/21/2026` e `2026-7-1` (WR-02). Usar regex ISO estrito + checagem de data real.
- **Sem teto em `end_minute`:** rule de 50h passa hoje (WR-03). Adicionar `.max(1440)` no Zod + CHECK no DB.
- **24:00 inalcançável na UI (WR-04):** o bloqueio "até o fim do dia" precisa de 1440. Adicionar opção "24:00 (fim do dia)" ou garantir consistência UI↔schema↔DB.
- **Aditivo que duplica slots do template:** dedupe por `start.getTime()` na união.
- **Comparar limites com `<=`:** duplica slot da virada. Meio-aberto sempre (D-11).
- **Persistir row-por-slot:** proibido (D-12). Só rules + overrides.
- **Reusar `components/ui/calendar.tsx` como grade de agenda:** é date-picker (D-08).
- **`npm install`:** repo yarn-only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wall-clock ↔ instante no named zone | Tabela de DST / parsing de offset | `@date-fns/tz` (`TZDate` / `{ in: tz(...) }`) | DST/offsets históricos delegados ao `Intl` nativo [CITED: github.com/date-fns/tz] |
| Início de semana/dia/mês, iterar dias | Aritmética manual | `startOfWeek({weekStartsOn:1})`, `startOfDay`, `startOfMonth`, `eachDayOfInterval` (date-fns v4, context `{ in }`) | Já instalado; casa com o fuso |
| Validação de data ISO | `Date.parse` (frouxo — WR-02) | Zod regex `^\d{4}-\d{2}-\d{2}$` + verificar data real | Boundary público; corrige WR-02 |
| Arraste/captura de ponteiro | Handlers de mouse+touch separados | Pointer Events API nativa (`setPointerCapture`) | Unifica mouse/touch/caneta [ASSUMED] |
| Guarda de fechar aba | Flag custom | `beforeunload` nativo (só quando `isDirty`) | Cobre refresh/fechar-aba [ASSUMED] |
| CRUD escopado + gate | Reescrever | Módulos/actions v1 existentes (evoluir) | Já provados no 06-VERIFICATION |
| Migração preservando dados | DROP + INSERT manual | `ALTER TABLE ADD COLUMN ... DEFAULT` + `UPDATE` backfill (idempotente, atômico) | D-22; sem perda; RLS/policies/índices intactos |

**Key insight:** O único trabalho "de negócio" novo é a **expansão híbrida com precedência** e o **estado de edição/diff** do calendário. Fuso, aritmética, CRUD, gate, validação e o template de migração já existem. A dificuldade real está em (1) a precedência aditivo/subtrativo correta e o dedupe (testes cobrem), (2) a aritmética DST-safe (teste em zona com DST cobre), (3) a migração sem perda (ALTER+backfill idempotente).

## Modelo de Dados HÍBRIDO — Recomendação

> Forma exata à discrição do planner (D-22 discretion). Recomendação: **estender `availability_exceptions`**, não criar tabela nova.

**`availability_rules` (template recorrente — INALTERADA, D-19):**
Já correta: `weekday`, `start_minute`, `end_minute`, `slot_minutes`, RLS owner-scoped, índice `(profile_id, weekday)`. Múltiplas faixas/dia (sem unique). **Único ajuste recomendado:** adicionar teto de minutos (WR-03) — `CHECK (end_minute <= 1440 and start_minute <= 1440)` (decidir 1440 vs 1410; RESEARCH v1 recomenda 1440 = "24:00 fim do dia", coerente com WR-04). Aplicar via ALTER na mesma migration v2.

**`availability_exceptions` → overrides híbridos (ALTER + backfill, D-20/D-22):**
```sql
-- Adiciona o tipo de override; existentes (folgas v1) são SUBTRATIVAS.
alter table public.availability_exceptions
  add column override_type text not null default 'subtract'
  check (override_type in ('add', 'subtract'));

-- Backfill explícito (o DEFAULT já cobre as rows existentes; UPDATE torna a
-- intenção auditável e cobre qualquer NULL herdado):
update public.availability_exceptions
  set override_type = 'subtract'
  where override_type is null;

-- WR-03: teto de minutos, coerente com WR-04 (1440 = fim do dia alcançável).
alter table public.availability_exceptions
  add constraint availability_exceptions_minute_ceiling
  check (
    start_minute is null
    or (start_minute <= 1440 and end_minute <= 1440)
  );

-- Semântica ADITIVA precisa de duração por faixa (AGENDA-05, D-09 aplicado ao aditivo).
-- Aditivo com faixa aberta requer slot_minutes; subtrativo não usa slot_minutes.
alter table public.availability_exceptions
  add column slot_minutes smallint;  -- nullable: usado só quando override_type='add' com faixa

alter table public.availability_exceptions
  add constraint availability_exceptions_add_needs_range_and_slot
  check (
    override_type = 'subtract'
    or (start_minute is not null and end_minute is not null and slot_minutes is not null and slot_minutes > 0)
  );
-- (Aditivo dia-inteiro não faz sentido — aditivo é sempre uma faixa com duração.)

-- Índice já existe: (profile_id, exception_date). Reaproveitar.
```
- **Rename opcional (cosmético):** `alter table ... rename to availability_overrides` + renomear coluna `exception_date` → `override_date`. Pesar contra o custo de atualizar módulos/actions/tipos que referenciam `availability_exceptions`. **Recomendação: manter o nome da tabela** (`availability_exceptions`) para minimizar a superfície de refactor e o risco; renomear só os conceitos em código (tipos `AvailabilityOverride*`). A migração de dados é o objetivo — o nome é secundário.
- **RLS/policies:** já habilitadas e corretas na v1. ALTER não as derruba. **Confirmar** que a migration v2 não recria a tabela (senão perderia RLS). Se o planner optar por rename, RLS/policies acompanham a tabela (rename preserva). Reafirmar as 4 policies só se recriar a tabela — o que NÃO se recomenda.
- **Forward constraint (Phase 7):** NÃO adicionar FK/coluna de consulta. A Phase 7 escreve `appointments` por cima com `btree_gist`.

**Ponto de decisão para o planner:** confirmar com o usuário/discuss se um **aditivo pode reabrir horário numa folga** (subtrativo vence sempre — D-21) ou se aditivo e subtrativo no mesmo dia são mutuamente exclusivos por design de UI. A precedência D-21 (folga vence) já resolve o algoritmo; a questão é de UX (o médico consegue criar os dois no mesmo dia?). [ASSUMED — confirmar em discuss]

## Assinatura da `expandAvailability` v2 — Recomendação

```typescript
export type AvailabilityBand = {         // template recorrente (inalterado)
  weekday: number                        // 0=domingo..6=sábado (date-fns getDay())
  startMinute: number
  endMinute: number
  slotMinutes: number
}

export type AvailabilityOverride = {     // substitui AvailabilityException
  date: string                           // "YYYY-MM-DD" (dia local da clínica)
  type: "add" | "subtract"               // NOVO (D-20)
  startMinute: number | null             // null só válido para type="subtract" (dia inteiro)
  endMinute: number | null
  slotMinutes: number | null             // usado só quando type="add"
}

export type FreeSlot = { start: Date; end: Date; localDate: string }
export type ExpandResult = {
  slots: FreeSlot[]
  byDay: Record<string, { freeSlotCount: number; hasAvailability: boolean }>
}

export function expandAvailability(input: {
  rules: AvailabilityBand[]
  overrides: AvailabilityOverride[]      // era `exceptions`
  window: { from: Date; to: Date }       // meio-aberto [from, to)
  timeZone: string                       // "America/Sao_Paulo" (nunca do host)
}): ExpandResult
```
- Manter puro/determinístico (molde `computePediatricAge`): nunca `new Date()` interno, nunca `process.env.TZ`.
- Migrar o call-site em `app/dashboard/agenda/page.tsx` (hoje mapeia `exceptions`) para `overrides` com `type`.

## `.spec.ts` — casos que o plano DEVE cobrir (v2)

Herdar os 13 casos v1 (D-02, D-09, D-10 ×2, D-04 ×3, D-11 ×3, janela vazia, weekday vazio, D-07 mês) e ADICIONAR:
- **DST-safe (corrige WR-01):** faixa 08:00–12:00 em `America/New_York` num dia de spring-forward (ex. 2026-03-08) → os minutos LOCAIS dos slots preservados (08:00, 08:30, ...), rodando sob `TZ=UTC` e `TZ=America/New_York`. A suite atual NÃO cobre isso.
- **Aditivo básico (AGENDA-05):** dia sem template + override `type="add"` 19:00–20:00 @30 → 2 slots só do aditivo.
- **Aditivo sobre template (dedupe):** template 14:00–18:00 + aditivo 14:00–15:00 sobreposto → sem slots duplicados.
- **Aditivo + subtrativo mesma faixa (folga vence, D-21):** aditivo 19:00–20:00 + subtrativo 19:00–20:00 → 0 slots.
- **Subtrativo dia-inteiro remove aditivos:** subtrativo `startMinute=null` + aditivo no mesmo dia → 0 slots.
- **Aditivo com slotMinutes próprio:** aditivo @20min vs template @30min no mesmo dia → contagens distintas.
- **Precedência combinada:** template + aditivo + subtrativo parcial num só dia → conjunto final correto.

## Common Pitfalls

### Pitfall 1: Aritmética de slot deriva em DST (WR-01)
**What goes wrong:** Em zona com DST, slots após a transição shiftam 1h; `localDate`/linha da grade erram.
**Why it happens:** `addMinutes` soma minutos absolutos, não wall-clock.
**How to avoid:** Construir cada limite via wall-clock no zone (Pattern 1). Teste em `America/New_York` num dia de transição.
**Warning signs:** Slot "08:00" renderiza em 09:00; teste DST falha; SP hoje mascara (sem DST desde 2019).

### Pitfall 2: Migração perde dados ou derruba RLS
**What goes wrong:** DROP+recreate apaga folgas de teste e as policies RLS; ou backfill não roda e overrides ficam sem tipo.
**Why it happens:** Reescrever "limpo" em vez de ALTER; esquecer o `UPDATE` de backfill.
**How to avoid:** ALTER TABLE ADD COLUMN ... DEFAULT 'subtract' + UPDATE explícito; NUNCA recriar a tabela. Migration idempotente. Confirmar RLS intacta após ALTER (ALTER não a remove).
**Warning signs:** `select count(*)` de overrides cai; `select ... where override_type is null` retorna rows; RLS deixa de filtrar.

### Pitfall 3: Aditivo duplica slots ou não vence corretamente
**What goes wrong:** União gera slot duplicado; ou subtrativo não remove o aditivo.
**Why it happens:** Falta dedupe; ordem de precedência trocada.
**How to avoid:** União primeiro (dedupe por `start.getTime()`), subtração por último (D-21). Testes de sobreposição.
**Warning signs:** `freeSlotCount` inflado; folga não zera um horário com aditivo.

### Pitfall 4: Validação frouxa deixa data ambígua entrar (WR-02)
**What goes wrong:** `07/21/2026` entra no `date` do Postgres com dia/mês trocados.
**Why it happens:** `Date.parse` no Zod.
**How to avoid:** Regex ISO estrito + verificar data real (rejeitar `2026-02-30`).
**Warning signs:** Folga cai no dia errado; teste de data inválida passa quando deveria falhar.

### Pitfall 5: RLS habilitada sem policy = negação silenciosa
**What goes wrong:** Tabela retorna zero rows sem erro (documentado no repo).
**Why it happens:** RLS enabled sem policy — mas AQUI só se o planner recriar a tabela.
**How to avoid:** NÃO recriar a tabela (ALTER preserva RLS). Se recriar, todas as 4 policies na mesma migration (D-13).
**Warning signs:** Agenda vazia após deploy; `.eq(profile_id)` retorna nada.

### Pitfall 6: Guarda de navegação incompleta perde pintura em silêncio
**What goes wrong:** Médico troca de aba/sai e perde mudanças não salvas.
**Why it happens:** Só `beforeunload` (cobre refresh, não navegação interna); ou troca de aba não checa `isDirty`.
**How to avoid:** `beforeunload` para refresh/fechar + checagem de `isDirty` no handler de troca de aba/saída (AlertDialog "descartar?"). A troca dia/semana/mês é estado local → guarda trivial.
**Warning signs:** Trocar de Semana para Mês zera o rascunho sem avisar.

## Code Examples

### Carga inicial no RSC (evolui page.tsx v1 para overrides)
```typescript
// app/dashboard/agenda/page.tsx (RSC) — gate + carga + expand da SEMANA
const [ruleRows, overrideRows] = await Promise.all([
  listAvailabilityRules(supabase, profile.id),
  listAvailabilityOverrides(supabase, profile.id),   // inclui override_type
])
const overrides = overrideRows.map((r) => ({
  date: r.exception_date,
  type: r.override_type,                 // "add" | "subtract"
  startMinute: r.start_minute,
  endMinute: r.end_minute,
  slotMinutes: r.slot_minutes,
}))
const { slots, byDay } = expandAvailability({
  rules: bands, overrides,
  window: { from: weekStart, to: weekEnd },
  timeZone: CLINIC_TIME_ZONE,
})
// serializar slots (Date → ISO) e passar rules+overrides crus ao client p/ re-expandir ao navegar.
```

### Migration ALTER + backfill (owner-scoped preservado)
```sql
-- Ver §Modelo de Dados: ADD COLUMN override_type DEFAULT 'subtract' + UPDATE backfill
-- + CHECK de teto (WR-03) + slot_minutes p/ aditivos. NÃO recriar a tabela (RLS intacta).
```

### Ação de salvar em lote (recebe o diff)
```typescript
"use server"
// saveAvailabilityAction(input): gate paid → zod safeParse (grade + overrides) → try/catch
// reconcilia: upsertAvailabilityRules(profileId, input.rules)   // delete-then-insert
//             insert overrides de input.overridesAdd
//             delete overrides de input.overridesRemove (scoped por profile_id + id)
// revalidatePath("/dashboard/agenda"); return result union
```

## State of the Art

| Old Approach (v1) | Current Approach (v2) | When Changed | Impact |
|-------------------|-----------------------|--------------|--------|
| Exceções só subtrativas | Overrides aditivos E subtrativos (modelo híbrido) | v2 redesign (D-20) | AGENDA-05 nova; `expandAvailability` ganha precedência |
| Editor separado + views read-only | Calendário único editável (pintura + salvar em lote) | v2 redesign (D-14..17) | UI v1 substituída |
| `addMinutes` absoluto | Wall-clock DST-safe | v2 (corrige WR-01) | Correção latente |
| `Date.parse` na validação | Regex ISO estrito | v2 (corrige WR-02) | Boundary robusto |
| Sem teto de minutos | `max 1440` + CHECK | v2 (corrige WR-03/04) | 24:00 alcançável, sem overflow |

**Deprecated/outdated (não reintroduzir):** `addMinutes(startOfDay,...)`, `Date.parse` para datas, offset fixo `-03:00`, lib de calendário, `date-fns-tz` v3 (usar `@date-fns/tz` v4).

## Project Constraints (from CLAUDE.md)

- **Stack fixo:** Next.js 16 (App Router, Server Actions), React 19, TS, Tailwind 4, shadcn/ui — três camadas `app/ → actions/ → modules/`.
- **Toda query escopada por `profile_id`**; gate `profile.status === "paid"` em todo action novo E no RSC.
- **Yarn 1.x only** — `yarn add`, nunca `npm install`.
- **Modules:** uma fn exportada por arquivo; `SupabaseClient` injetado; nunca constroem client nem importam `next/cache`/`next/headers`; `throw new Error("[AVAILABILITY] ...")`.
- **Actions:** `getAuthenticatedUser(supabase)` + gate `paid` + Zod `safeParse`; result unions `{ ok: true } | { ok: false; error }`; `revalidatePath`.
- **Migrations** `YYYYMMDDHHMMSS_*.sql`, RLS + policies no mesmo arquivo (D-13); aqui = ALTER + backfill preservando o que existe (D-22).
- **Naming:** arquivos kebab-case; funções/vars camelCase; tipos/componentes PascalCase; actions sufixo `Action`; booleanos `is`/`has`/`should`.
- **Formatação:** 2 espaços, aspas duplas; strings de UI em PT-BR.
- **Testes:** `yarn test` = `find modules lib -name '*.spec.ts' | xargs tsx --test`. A fn pura DEVE viver em `lib/`.
- **Privacidade:** dado do médico dono; zero nova superfície externa nesta fase.

## Runtime State Inventory

> Fase de REFACTOR/MIGRAÇÃO — inventário obrigatório. As tabelas v1 estão no banco com dados de teste.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | `availability_rules` (regras de teste v1) + `availability_exceptions` (folgas de teste v1) no Postgres remoto. As folgas existentes precisam mapear para `override_type='subtract'`. | **Data migration:** ALTER + backfill (`DEFAULT 'subtract'` + `UPDATE`). NÃO recriar tabelas (D-22). Confirmar contagem de rows antes/depois. |
| **Live service config** | None — sem serviço externo novo; zero nova superfície de ataque (CONTEXT §domain). | Nenhuma. |
| **OS-registered state** | None — sem tasks/cron/registros de SO. | Nenhuma. |
| **Secrets/env vars** | None — `America/Sao_Paulo` é constante de código (`lib/clinic-timezone.ts`), não env. Sem segredo novo. | Nenhuma. |
| **Build artifacts** | None novo — `@date-fns/tz` já declarado (`package.json`), `node_modules` tem 1.5.0. | Nenhuma (sem `yarn add` novo). |

**Nota crítica de migração:** o objetivo de D-22 é **preservar** as rows. O planner DEVE (1) verificar via `list_tables`/`get_advisors` (MCP Supabase) o estado atual antes de aplicar; (2) usar ALTER, nunca DROP; (3) incluir uma verificação (contagem de overrides subtrativos = contagem de exceptions v1) no plano de verificação.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@date-fns/tz` | Cálculo de fuso DST-safe (AGENDA-04) | ✓ (declarado) | 1.5.0 | — |
| `date-fns` | Aritmética de datas | ✓ | 4.1.0 | — |
| `Intl.DateTimeFormat` + tzdata (Node) | Base do `@date-fns/tz` | ✓ | Node v20.19.2 full-ICU | — |
| Supabase (Postgres) | ALTER + backfill + RLS | ✓ | projeto configurado | — |
| `tsx --test` | Testes da fn pura | ✓ | tsx ^4.21.0 | — |
| Pointer Events API | Arraste (enhancement) | ✓ (nativo do browser) | — | Clique-toggle (baseline obrigatório) cobre a fase sem arraste |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** Arraste-para-pintar — fallback é o clique-toggle (baseline D-16), então a fase não está bloqueada se o arraste for adiado.

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1`. Fase **owner-only, zero nova superfície externa** (CONTEXT §domain). Sem assento/delegação (Phase 8/9), sem endpoint público, sem token. A adição de overrides aditivos NÃO abre nova rota externa — é o mesmo médico dono criando dado próprio.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | sim (reuso) | `getAuthenticatedUser(supabase)`; sem novo fluxo |
| V3 Session Management | não | Sessão Supabase existente reusada |
| V4 Access Control | **sim** | RLS `profile_id` (preservada no ALTER) + `.eq(profile_id)` no módulo + gate `paid` no action E no RSC. Confirmar RLS intacta pós-ALTER. |
| V5 Input Validation | **sim** | Zod `safeParse`: `override_type ∈ {add,subtract}`, weekday range, start<end, múltiplos de 30, **max 1440 (WR-03)**, **data ISO estrita (WR-02)**, `slot_minutes>0` (aditivo). Erros → PT-BR. |
| V6 Cryptography | não | Sem dado criptográfico novo |

### Known Threat Patterns para este stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR: ler/editar/excluir override de outro médico | Elevation of Privilege | RLS por `profile_id` + `.eq(profile_id)` no módulo (delete scoped por `profile_id`+`id`); teste de ownership (no-op ao mirar id alheio) |
| RLS derrubada por recriação de tabela na migration | Information Disclosure / Denial | NÃO recriar a tabela — ALTER preserva RLS. Se recriar, todas as 4 policies na mesma migration (D-13) |
| Injeção de data/faixa ambígua (WR-02) | Tampering | Zod regex ISO + verificação de data real antes do módulo; Supabase parametriza queries |
| Overflow de minutos (WR-03) → slots vazando p/ o dia seguinte | Tampering | `.max(1440)` no Zod + CHECK no DB |
| Bypass do gate paid num action novo | Elevation of Privilege | Gate `profile.status === "paid"` em todo action + no RSC |

> **Nota de escopo:** NÃO abrir leitura cross-profile nem antecipar o assento (Phase 8). Manter estritamente owner-scoped. A migração de dados roda com privilégio de migration (não via RLS) — normal; o ACESSO runtime continua owner-scoped.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Estender `availability_exceptions` com `override_type` (ALTER+backfill) é melhor que tabela nova | Modelo de Dados | Baixo — decisão de schema do planner; ALTER é a via segura para D-22. Tabela nova exigiria migrar dados entre tabelas. |
| A2 | Aditivo carrega `slot_minutes` próprio (duração por faixa aplicada ao aditivo, AGENDA-05) | Modelo de Dados | Médio — se o aditivo herda a duração do template, o schema simplifica (sem `slot_minutes` no override). **Confirmar em discuss/planner.** |
| A3 | Expansão no CLIENTE ao navegar é preferível ao round-trip | Arch Map / Alternatives | Baixo — CONTEXT já marca "preferência de partida: cliente"; payload pequeno. |
| A4 | Pointer Events nativos (`setPointerCapture`) são o caminho de arraste; arraste é enhancement opcional | Pattern 4 | Baixo — clique-toggle é o baseline obrigatório (D-16 + UI-SPEC); WebSearch indisponível p/ confirmar sutilezas, mas o padrão é estável. |
| A5 | Guarda de navegação: `beforeunload` + checagem local de `isDirty` na troca de aba/saída (App Router não tem `useBlocker` first-class) | Pattern 3 | Médio — a API exata de bloqueio de navegação interna no Next 16 não foi confirmada (WebSearch 529). Como as views são estado LOCAL do componente, a guarda de troca de aba é trivial; a guarda de SAIR da rota precisa validação no planner. |
| A6 | Aditivo NÃO reabre horário numa folga (subtrativo vence — D-21); questão de UX se ambos coexistem no mesmo dia | Modelo de Dados | Médio — algoritmo já resolvido por D-21; UX (permitir criar os dois no mesmo dia?) precisa confirmação em discuss. |
| A7 | Teto de minutos = 1440 (24:00 = fim do dia), coerente com WR-04 | Modelo de Dados / WR-03 | Baixo — RESEARCH v1 já recomendou 1440; planner decide/documenta 1440 vs 1410. |
| A8 | Rename da tabela para `availability_overrides` é cosmético e NÃO recomendado (custo de refactor > benefício) | Modelo de Dados | Baixo — reversível; decisão do planner. |

## Open Questions (RESOLVED no discuss/plan — 2026-07-21)

> **RESOLVED:** Q1 → o aditivo carrega `slot_minutes` próprio (nullable no schema, obrigatório quando `type='add'`) — Planos 01/02/03. Q2 → aditivo e subtrativo podem coexistir no mesmo dia; o algoritmo D-21 resolve (folga vence) — decisão do CONTEXT v2. Q3 → guarda de navegação via `beforeunload` (refresh/fechar) + checagem `isDirty` na troca de aba (estado local, não rota); o executor confirma a API exata de exit-guard do App Router na implementação (RESEARCH marca A5 como MEDIUM). Q4 → CONTEXT v2 (D-14..D-18) é a autoridade de UI; UI-SPEC v2 dedicada via /gsd-ui-phase é follow-up recomendado.

1. **Aditivo herda a duração do template ou tem `slot_minutes` próprio? (A2)**
   - What we know: D-09 (duração por faixa) vale para o template; AGENDA-05 abre "horário extra pontual".
   - What's unclear: se o aditivo precisa escolher a própria duração de slot.
   - Recommendation: dar ao aditivo `slot_minutes` próprio (nullable no schema, obrigatório quando `type='add'`) — mais expressivo e coerente com D-09. Confirmar em discuss.

2. **Aditivo e subtrativo podem coexistir no mesmo dia pela UI? (A6)**
   - What we know: D-21 resolve o algoritmo (folga vence). 
   - What's unclear: se a UI permite criar ambos no mesmo dia (e como o médico enxerga isso).
   - Recommendation: permitir ambos (o modelo já é robusto); o UI-spec v2 define a apresentação. Confirmar em discuss.

3. **Guarda de navegação interna no Next 16 App Router. (A5)**
   - What we know: `beforeunload` cobre refresh/fechar aba; a troca de aba dia/semana/mês é estado local (guarda trivial).
   - What's unclear: a melhor API para bloquear a SAÍDA da rota `/dashboard/agenda` com mudanças não salvas (App Router não tem `Prompt`/`useBlocker` first-class). WebSearch esteve 529 nesta sessão.
   - Recommendation: o planner deve pesquisar/decidir o padrão exato (interceptar cliques de `<Link>` conhecidos + `beforeunload`); tratar como MEDIUM confidence até confirmar.

4. **UI-SPEC precisa de revisão v2.** O `06-UI-SPEC.md` atual descreve a v1 (editor separado + clique-toggle, D-01..D-13). O CONTEXT v2 (D-14..D-23) exige calendário único editável, toggle Disponibilidade|Folga e salvar em lote.
   - Recommendation: **rodar `/gsd-ui-phase` para regenerar o UI-SPEC v2** antes/durante o planejamento, OU o planner tratar as seções v2 do CONTEXT como o contrato de UI. O `06-PATTERNS.md` também está desatualizado (rotula a v1 como greenfield) — os analogs de código continuam válidos, mas as classificações "novo" estão erradas (o código v1 EXISTE e é evoluído).

## Sources

### Primary (HIGH confidence)
- Codebase (lido nesta sessão): `lib/expand-availability.ts` + `.spec.ts`, `lib/schemas/availability.ts`, `modules/availability/*`, `actions/availability/*`, `app/dashboard/agenda/page.tsx`, migrations `20260721000100/000200`, `components/dashboard/agenda/*` [VERIFIED]
- `.planning/phases/06.../archive-v1/06-RESEARCH.md`, `06-REVIEW.md` (WR-01..05), `06-CONTEXT.md` (D-14..D-23), `06-UI-SPEC.md`, `06-PATTERNS.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/config.json` [VERIFIED]
- npm registry via `gsd-tools package-legitimacy check` — `@date-fns/tz` e `date-fns` OK [VERIFIED]
- Node runtime check (`v20.19.2`, `@date-fns/tz` carrega) [VERIFIED]
- github.com/date-fns/tz — TZDate/`tz()`, DST via Intl [CITED]

### Secondary (MEDIUM confidence)
- 06-REVIEW.md WR-01 — verificação empírica do drift de `addMinutes` em `America/New_York` (reproduzida pelo reviewer v1) [CITED, herdado]
- blog.date-fns.org/v40-with-time-zone-support — timezone first-class no v4 [CITED, herdado da pesquisa v1]

### Tertiary (LOW confidence)
- Pointer Events API drag-to-paint e guarda de navegação App Router — training knowledge; **WebSearch indisponível (HTTP 529) nesta sessão** — padrões estáveis mas não re-confirmados online [ASSUMED]

## Metadata

**Confidence breakdown:**
- Modelo de dados híbrido + migração: HIGH — código v1 + template `patient_vaccine_doses` + D-22 explícito; ALTER+backfill é padrão SQL bem entendido.
- Expansão híbrida + precedência + DST-safe: HIGH — a fn v1 existe e é testada; a correção (WR-01) e a precedência (D-21) são bem especificadas; testes cobrem.
- Segurança: HIGH — owner-scoped, RLS preservada, correções de validação (WR-02/03) claras.
- Mecânica de arraste (Pattern 4): MEDIUM — padrão nativo estável, mas WebSearch indisponível para confirmar sutilezas; clique-toggle (baseline) é HIGH.
- Guarda de navegação (Pattern 3): MEDIUM — `beforeunload` HIGH; bloqueio interno do App Router não re-confirmado (WebSearch 529).

**Research date:** 2026-07-21
**Valid until:** 2026-08-20 (30 dias — stack estável; nenhum pacote novo; risco maior é a API de guarda de navegação do Next 16, a validar no planner)
