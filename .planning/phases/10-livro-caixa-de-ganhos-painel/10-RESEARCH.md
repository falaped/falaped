# Phase 10: Livro-caixa de Ganhos & Painel - Research

**Researched:** 2026-08-21
**Domain:** Livro-caixa (money-in-cents ledger) sobre Postgres/Supabase + agregação SQL com buckets de data local + painel React (Next 16 RSC + recharts) + soft-delete auditável
**Confidence:** HIGH (quase tudo é padrão já vivo no repo; os 3 pontos greenfield — dinheiro, `date_trunc`, `voided_at` — foram resolvidos contra docs oficiais do PostgreSQL e precedentes internos)

## Summary

Esta fase tem **zero dependência nova** e **zero incógnita de biblioteca**: tudo que ela precisa já está instalado e já tem molde no repo. `recharts` 3.9.0 está em `package.json` e usado em `growth-chart.tsx`; `sonner` faz o toast "Desfazer" em `calendar-editor.tsx`; `exam_catalog_items` é o molde 1:1 do catálogo de procedimentos; `save_availability` é o molde de RPC `security invoker` + owner-check; `patient_measurements` é o molde de **valor inteiro em unidade-base** (grama/mm) com input decimal na UI — que é exatamente o problema de "centavos com input em R$". Não há um único pacote a instalar.

Os três pontos genuinamente greenfield se resolvem assim: **(1) dinheiro** — `amount_cents integer not null check (amount_cents > 0)`, input `type="text" inputMode="decimal"` (padrão `measurement-form.tsx`) transformado por Zod em centavos via `Math.round(reais * 100)`, e um `formatCentsToBRL` novo dentro do `lib/formatters.ts` **existente** (não criar arquivo novo — o repo já concentra formatação ali, e hoje ele só tem data/telefone/HTML). **(2) Agregação e fuso** — a dica 💡 do scan está **confirmada**: com `received_on date`, `date_trunc` recebe um `date` que o Postgres promove a `timestamp` e devolve a meia-noite local — **nenhum `AT TIME ZONE`, nenhum risco de DST**; e `date_trunc('week', …)` já é segunda-feira por definição ISO 8601. O único lugar onde "fuso" continua existindo é derivar "hoje" — e isso o RSC já sabe fazer com `tz(CLINIC_TIME_ZONE)` exatamente como `app/dashboard/agenda/page.tsx` faz, passando a data pronta como parâmetro. **(3) `voided_at`** — o filtro fica *dentro* da função SQL de agregação (impossível esquecer no caminho que produz os números) + índice parcial + uma única fn de listagem com `includeVoided` default `false`; e a garantia de auditoria mais barata do repositório é **não criar policy de DELETE** na tabela (RLS nega por default).

O risco real da fase não é técnico, é de **integridade referencial no `delete-case` existente** (ver Pitfall 1) e de **RLS âncora simples vs dupla** (ver Pitfall 2 e Padrão 1). Ambos têm resposta fechada abaixo.

**Primary recommendation:** Uma tabela `public.financial_entries` (nome já usado nos docs de planejamento — `.planning/STATE.md` § Pending Todos), ancorada **só em `profile_id`** com `description text NOT NULL` sempre preenchida (snapshot do rótulo), `case_id` nullable com FK `ON DELETE RESTRICT`, sem policy de DELETE; uma tabela `public.procedure_catalog_items` copiada de `exam_catalog_items` + `price_cents`; uma coluna `profiles.consultation_price_cents`; **uma** função SQL `get_earnings_summary(profile, from, to, today)` que devolve `jsonb` com cards + média + série diária (é onde `date_trunc`/`sum`/`voided_at is null` vivem); insert **multi-row único** para "1 consulta + N procedimentos" (já é atômico — não precisa de RPC); guarda de re-encerramento no action, como manda D-10.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Totais dia/semana/mês + média por atendimento | Database (função SQL) | — | EARN-03 exige agregação em SQL; `date_trunc` não é expressável em PostgREST |
| Filtro `voided_at is null` nos números | Database (dentro da função) | Módulo de leitura | Se o filtro vive no SQL da agregação, nenhum caller pode esquecê-lo |
| Snapshot de preço (congelar centavos + rótulo) | API / Server Action | Database (colunas NOT NULL) | O snapshot é cópia no ato da escrita; o banco só garante que existe |
| Ownership / escopo `profile_id` | Database (RLS) | API (`.eq("profile_id")` + gate `paid`) | Defense-in-depth, é a norma do repo pós-2026-06-04 |
| Gate de assinatura (`paid`) | API / RSC | — | RLS `to authenticated` **não** impõe assinatura (comentário explícito em `20260722200000_appointments.sql`) |
| Parse "R$ 150,00" → 15000 centavos | API (Zod no boundary) | Client (máscara/`inputMode`) | Nunca confiar no cliente; o Zod `safeParse` do action é a fonte da verdade |
| Formatação de exibição em R$ | Client / RSC | — | `Intl.NumberFormat('pt-BR')` em `lib/formatters.ts` |
| Buckets na data local da clínica | Frontend Server (RSC) | Database | O RSC calcula `hoje`/janela com `tz(CLINIC_TIME_ZONE)` (precedente Fase 6) e passa `date` pronto |
| Gráfico de barras por dia | Browser (client component) | — | `recharts` precisa de DOM; `"use client"` obrigatório |
| Janela de "Desfazer" da anulação | Browser (toast) + API (2º action) | — | Precedente `calendar-editor.tsx`: o undo é uma **segunda chamada de action real**, não estado local |

## Project Constraints (from CLAUDE.md)

Diretivas acionáveis extraídas de `./CLAUDE.md` — o planner deve verificar conformidade tarefa a tarefa:

| # | Diretiva | Onde morde nesta fase |
|---|----------|----------------------|
| C-1 | Três camadas `app/ → actions/ → modules/` | Nenhum `.from()` em componente; nenhum `.rpc()` em componente |
| C-2 | Uma fn exportada por arquivo em `modules/` | `create-financial-entries.ts`, `list-financial-entries.ts`, `get-earnings-summary.ts`, `void-financial-entry.ts`, `restore-financial-entry.ts`, `count-non-voided-entries-for-case.ts` — 6 arquivos, não 1 |
| C-3 | `SupabaseClient` injetado; nunca construir client no módulo; nunca importar `next/cache`/`next/headers` em `modules/` | `revalidatePath` só nos actions |
| C-4 | Módulo lança `throw new Error("[DOMAIN] …")` | Tag `[EARNINGS]` para lançamentos, `[PROCEDURE_CATALOG]` para o catálogo (padrão observado: `[EXAM_CATALOG]`) |
| C-5 | Action captura e devolve union `{ ok: true } \| { ok: false; error }` | Todos os 6 actions novos |
| C-6 | Zod `safeParse` no boundary + `lib/zod-error-message.ts` | `lib/schemas/financial-entry.ts`, `lib/schemas/procedure-catalog-item.ts` |
| C-7 | `getAuthenticatedUser(supabase)` + gate `profile.status === "paid"` em **todo** action e route handler | Ver nota de exceção em "Achado 8" (o `updateProfileAction` existente **não** tem gate — não regredir isso) |
| C-8 | Todo acesso escopado por `profile_id` | `.eq("profile_id", profile.id)` em leitura, escrita e anulação — inclusive junto do `id` (backstop IDOR, precedente `delete-measurement.spec.ts`) |
| C-9 | Strings de UI em PT-BR | Rótulos, toasts, mensagens de erro, comments de migration |
| C-10 | Arquivos em kebab-case; 2 espaços; **aspas duplas** | Igualar o estilo do arquivo vizinho quanto a ponto-e-vírgula (o repo é dividido; `modules/cases/*` e `actions/*` recentes **não** usam `;`) |
| C-11 | Route handler só quando Server Action não serve | Nada nesta fase precisa de route handler |
| C-12 | Fotos/dados de menores são sensíveis | Lançamento **não** deve gravar nome de paciente; guarda só `case_id` e o rótulo do procedimento (o nome vem por join, sob RLS) |

Fonte adicional: `.planning/STATE.md` § Blockers/Concerns — *"Todo slice novo precisa filtro `profile_id` em read/write/delete + gate `paid` + teste de ownership (Pitfall 17)"*.

## User Constraints (from CONTEXT.md)

### Locked Decisions

*(copiado literalmente de `10-CONTEXT.md` § Implementation Decisions)*

**Âncora do ganho — o que o lançamento referencia**
- **D-01:** O lançamento referencia **`cases(id)`** (caso encerrado) ou **nada** (avulso). NÃO existe coluna de agendamento — o vínculo com a agenda sai de vez. — **Reversibility:** one-way.
- **D-02:** `case_id` é nullable (avulso não tem caso). Um lançamento tem caso OU descrição livre, nunca nenhum dos dois.

**Preços no perfil (pré-requisito do gatilho)**
- **D-03:** O perfil do médico ganha **"Valor da Consulta"** — o valor padrão cobrado por uma consulta, usado em todo encerramento.
- **D-04:** Procedimentos extras (frenectomia, laserterapia, etc.) viram um **catálogo por perfil, cada item com seu próprio preço**. Molde exato no repo: `supabase/migrations/20260710020400_exam_catalog_items.sql` — acrescentar coluna de preço em centavos.
- **D-05:** O preço é **congelado (snapshot) no lançamento** — o lançamento guarda os centavos copiados no momento da gravação, junto do rótulo do procedimento. Reajustar o preço no perfil hoje NÃO reescreve o faturamento de meses anteriores. — **Reversibility:** one-way.

**Gatilho — o lançamento nasce no encerramento do caso**
- **D-06:** O gatilho é **encerrar o caso**, não a agenda. Ponto de entrada existente: `components/dashboard/cases/case-detail-actions.tsx:84` ("Encerrar caso", já atrás de um `AlertDialog`) → `updateCaseStatusAction(caseId, "closed")`.
- **D-07:** Ao encerrar, o app **pergunta o que foi realizado de procedimento além da consulta** e gera **1 lançamento da consulta + 1 lançamento por procedimento** escolhido do catálogo.
- **D-08:** **N lançamentos por caso** — sem constraint unique em `case_id`.
- **D-09:** **Cortesia é suportada:** ele pode encerrar o caso **sem gerar lançamento nenhum**. Consequência aceita: esse atendimento sai do numerador **e** do denominador da média.
- **D-10:** **Re-encerramento não relança.** No encerramento seguinte o app detecta que já existe lançamento não-anulado para aquele caso e **não pergunta nada**. Guarda de aplicação, não de banco (D-08 proíbe unique). — **Reversibility:** reversible.

**Campos do lançamento**
- **D-11:** A **data de recebimento é campo próprio do lançamento, escolhido pelo médico** — não herda o instante do encerramento. É essa data que define os buckets dia/semana/mês do painel. — **Reversibility:** costly.
- **D-12:** **Forma de pagamento: enum fixo** — pix / dinheiro / cartão / convênio. Gravada em todo lançamento.
- **D-13:** **Avulso:** descrição livre **obrigatória** + valor + data + forma de pagamento, sem `case_id`.
- **D-14:** Valores sempre em **centavos inteiros** (`integer`/`bigint`), nunca float/numeric-como-dinheiro-em-reais.

**Painel de Ganhos**
- **D-15:** Composição: **cards de totais (hoje / semana / mês) + gráfico de barras por dia + lista de lançamentos do período**. `recharts` 3.9.0 **já está no projeto**.
- **D-16:** Abre no **mês atual**.
- **D-17:** **Média = total do período ÷ (nº de casos distintos com lançamento não-anulado + nº de avulsos não-anulados) no período.** Arredondamento único, reconciliando ao centavo.
- **D-18:** Menu lateral: **grupo novo "Financeiro"** em `components/app-sidebar.tsx`, contendo o item "Ganhos". Ícone de carteira (`lucide-react`). O grupo "Agenda" foi removido em `4475d4d` — não reintroduzir.

**Anulação (estorno)**
- **D-19:** **Não existe edição de valor.** Corrigir = anular + lançar de novo. `voided_at` sempre, `delete` nunca. — **Reversibility:** one-way.
- **D-20:** Ele anula **do painel de Ganhos e também de dentro do caso** que gerou o lançamento. Confirmação via `AlertDialog`.
- **D-21:** Lançamento anulado fica **escondido por padrão**, atrás de um filtro "mostrar anulados". Totais e média sempre filtram `voided_at is null`.
- **D-22:** **Toast com "Desfazer" por alguns segundos** limpa `voided_at`; passada a janela, a anulação é definitiva. Padrão da agenda (commit `71bfa06`).

**Travado pelo roadmap / projeto**
- **D-23:** Agregação **em SQL** (`date_trunc` + `sum`), buckets pela data local da clínica. Escopo `profile_id` + gate `paid` em toda leitura/escrita/anulação, com **teste de ownership** (SC-4). RLS + policies na mesma migration.
- **D-24:** Três camadas, uma fn por arquivo, client injetado, tag `[EARNINGS]`, Zod `safeParse`, result union, PT-BR.
- **D-25:** Fuso **America/Sao_Paulo** (`lib/clinic-timezone.ts`), semana começando na segunda.

### Claude's Discretion

- **Onde nasce o avulso:** botão **"Novo lançamento" na página de Ganhos**, e só ali.
- Nomes exatos de tabelas/colunas (`earnings`? `earning_entries`? `procedure_catalog_items`?) e forma da forma-de-pagamento (pg enum vs text+CHECK — enum é o padrão recente).
- Obrigatoriedade da forma de pagamento no diálogo (sugestão: obrigatória, sem default).
- Janela exata do "Desfazer" (segundos) — alinhar com o que a agenda já usa.
- Layout/composição visual do painel e do diálogo; se o diálogo de valores é um passo dentro do `AlertDialog` de "Encerrar caso" ou um dialog seguinte.
- Se catálogo de procedimentos e campos de preço viram um plano separado dentro da fase (recomendado, dado DV-3).

### Deferred Ideas (OUT OF SCOPE)

- **Relatório/filtro por forma de pagamento** — o campo é gravado (D-12), mas "quanto entrou por pix este mês" é outra fase.
- **Editar valor de um lançamento** — rejeitado nesta fase (D-19).
- **Des-anular a qualquer momento** — rejeitado (D-22); só a janela do toast.
- **Vínculo com `appointments`** — removido (D-01/DV-1).
- **Exportação do livro-caixa (CSV/PDF)** — não pedido, não escopado.
- **Despesas / lucro / DRE** — a fase é só entrada de dinheiro.
- **Ganhos visíveis para a assistente** — fora do escopo delegado da Phase 8/9.
- **Preço por convênio / tabela de preços diferente por plano** — não levantado.

> **Disciplina de escopo confirmada:** nada acima foi pesquisado. Nenhuma recomendação deste documento prepara terreno para essas ideias (sem coluna `insurance_id`, sem `entry_kind` para relatório por método, sem view de exportação).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EARN-01 | Registra o valor recebido por um atendimento (centavos inteiros), ligado ao **caso encerrado** (`cases.id`) — não ao agendamento *(emendado DV-1)* | Padrão 1 (schema + RLS âncora simples), Padrão 3 (gatilho no encerramento sem tocar a máquina de status), Achado 2 (centavos), Achado 8 (preço no perfil + catálogo) |
| EARN-02 | Lançamentos avulsos, não ligados a consulta | Padrão 1 (`case_id` nullable + `description NOT NULL` sempre), Padrão 5 (dialog "Novo lançamento" na página de Ganhos) |
| EARN-03 | Painel com totais por dia, semana e mês (agregação em SQL, buckets na data local da clínica) | Achado 3 (`received_on date` + `date_trunc` sem `AT TIME ZONE`), Padrão 2 (a função `get_earnings_summary` completa) |
| EARN-04 | Valor médio por atendimento = total ÷ (casos distintos + avulsos), arredondamento único *(emendado DV-2)* | Achado 4 (expressão SQL exata `count(distinct case_id) + count(*) filter (where case_id is null)`) |
| EARN-05 | Anula/estorna sem apagar; leitura/escrita/anulação escopadas por `profile_id` + gate `paid` | Achado 5 (`voided_at` + ausência deliberada de policy DELETE + índice parcial), Padrão 4 (undo por 2º action), Security Domain (teste de ownership) |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.107.0 (instalado) | Insert multi-row atômico, `.rpc()` da agregação, RLS | Já é a única via de dados do repo `[VERIFIED: package.json]` |
| `zod` | ^4.3.6 (instalado) | `safeParse` no boundary; espelho do pg enum; R$→centavos | Padrão de todos os `lib/schemas/*` `[VERIFIED: package.json + lib/schemas/appointment.ts]` |
| `react-hook-form` + `@hookform/resolvers` | ^7.71.2 / ^5.2.2 (instalado) | Form do diálogo e do avulso | Padrão de `measurement-form.tsx` e `profile-content.tsx` `[VERIFIED]` |
| `recharts` | 3.9.0 (pinado, instalado) | Gráfico de barras por dia | D-15; único consumidor hoje é `growth-chart.tsx` `[VERIFIED: package.json]` |
| `sonner` | ^2.0.7 (instalado) | Toast com ação "Desfazer" | Precedente literal em `calendar-editor.tsx:902` `[VERIFIED]` |
| `date-fns` + `@date-fns/tz` | ^4.1.0 / ^1.5.0 (instalado) | Janela do mês + "hoje" no fuso da clínica | Precedente literal em `app/dashboard/agenda/page.tsx` `[VERIFIED]` |
| `Intl.NumberFormat` | runtime Node 24 / browser | Formatação R$ | Nativo — **rung 3/4 da escada**, nenhuma lib de moeda `[VERIFIED: node -v = v24.18.0]` |
| PostgreSQL `date_trunc` / `FILTER` / `jsonb_build_object` | Postgres do Supabase | Agregação | Nativo; `date_trunc('week')` = segunda por ISO 8601 `[CITED: postgresql.org/docs/current/functions-datetime.html]` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | ^0.511.0 | `WalletIcon` (grupo "Financeiro", D-18), `Trash2Icon`/`RotateCcwIcon` | Já o icon set do sidebar |
| shadcn `Dialog` / `AlertDialog` / `Card` / `Table` / `Select` / `Checkbox` / `Tabs` / `Field` / `Input` | em `components/ui/` | Diálogo, confirmação de anulação, cards, lista, forma de pagamento, multi-seleção de procedimentos | Todos já existem — verificado por `ls components/ui` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Intl.NumberFormat` | `dinero.js` / `currency.js` | Dependência nova para 3 linhas. **Rejeitado** — só somamos inteiros; a única aritmética é `round(total/n)` e isso vive no Postgres |
| Máscara de moeda dedicada (`react-number-format`) | — | Dependência nova; `inputMode="decimal"` + transform Zod é o padrão já provado em `measurement-form.tsx` |
| Função SQL (RPC) para agregar | PostgREST + group-by no cliente | PostgREST não expressa `date_trunc` no `select`; agrupar no cliente **viola EARN-03** ("agregação em SQL"). **Rejeitado** |
| RPC transacional para inserir consulta+N procedimentos | Insert multi-row único | O insert multi-row **já é um statement, logo atômico**. RPC seria over-engineering. **Insert multi-row escolhido** (ver Achado 6) |
| VIEW `financial_entries_active` para blindar `voided_at` | Filtro dentro da função SQL + 1 fn de listagem | View exige `security_invoker=on` e cria superfície extra sem eliminar o esquecimento nos writes. **Rejeitado** (ver Achado 5) |
| `text` + `CHECK` para forma de pagamento | pg enum | Enum é o padrão recente (`appointment_status`, `appointment_type`, `medical_certificate_type`, `case_report_source`) — **enum escolhido**, com a nota de migração do Achado 9 |
| `numeric(12,2)` para dinheiro | `integer` centavos | Proibido por D-14 e pelo roadmap |

**Installation:**

```bash
# Nenhuma. Zero pacotes novos nesta fase.
```

**Version verification:** feita via `node -e require('./package.json')` e `ls node_modules` implícito no repo — `recharts@3.9.0` (pinado, sem `^`), `sonner@^2.0.7`, `zod@^4.3.6`, `@date-fns/tz@^1.5.0`, `date-fns@^4.1.0`, `@supabase/supabase-js@^2.107.0`. `[VERIFIED: package.json local]`

## Package Legitimacy Audit

**Nenhum pacote externo é instalado nesta fase.** O gate de legitimidade não se aplica: todas as dependências usadas (`recharts`, `sonner`, `zod`, `date-fns`, `@date-fns/tz`, `react-hook-form`, `lucide-react`, `@supabase/supabase-js`) já estão em `package.json` e em uso em código de produção do repo, e a única capacidade "nova" (formatação de moeda) é resolvida por `Intl`, que é runtime nativo.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| — (nenhum novo) | — | — | — | — | — | N/A |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

> Se o planner sentir necessidade de qualquer pacote novo (máscara de moeda, lib de datas, lib de gráfico), isso é sinal de desvio: reabrir esta seção e rodar `gsd-tools query package-legitimacy check` antes de escrever a tarefa.

## Architecture Patterns

### System Architecture Diagram

```
┌── GATILHO A: encerramento do caso (D-06/D-07) ──────────────────────────────┐
│                                                                             │
│  [Browser] CaseDetailActions ("Encerrar caso" + AlertDialog existente)      │
│      │  1. confirma                                                         │
│      ▼                                                                      │
│  updateCaseStatusAction(caseId,"closed")   ← INTOCADO (máquina de status)    │
│      │  ok                                                                  │
│      ▼                                                                      │
│  prepareCaseEarningsAction(caseId)  ──► modules/financial-entries/          │
│      │                                   count-non-voided-entries-for-case  │
│      │                                 + modules/profiles (preço)           │
│      │                                 + modules/procedure-catalog (lista)  │
│      │                                                                      │
│      ├── { ask:false }  (já tem lançamento → D-10)  ─────► fim, nada exibe   │
│      └── { ask:true, consultationPriceCents, procedures[] }                  │
│               │                                                             │
│               ▼                                                             │
│      [Browser] CaseEarningsDialog                                           │
│         · valor da consulta (pré-preenchido, editável)                      │
│         · checkbox por procedimento do catálogo (preço ao lado)             │
│         · data de recebimento (dd/mm/aaaa, default = hoje local)            │
│         · forma de pagamento (Select, obrigatório, sem default)             │
│         · [Encerrar sem lançamento] (cortesia, D-09)                        │
│               │ submit                                                      │
│               ▼                                                             │
│      createCaseFinancialEntriesAction  ─► Zod safeParse → R$→centavos       │
│               │                          → gate paid → ownership do caso    │
│               ▼                                                             │
│      modules/financial-entries/create-financial-entries.ts                  │
│               │  UM insert multi-row  (1 consulta + N procedimentos)        │
│               ▼                                                             │
│      ╔═══════════════════════════════╗                                      │
│      ║ public.financial_entries      ║  RLS: profile_id âncora simples      │
│      ║  amount_cents  (int, >0)      ║  SEM policy de DELETE                │
│      ║  description   (NOT NULL)     ║                                      │
│      ║  received_on   (date)         ║                                      │
│      ║  payment_method (enum)        ║                                      │
│      ║  case_id  (null | FK RESTRICT)║                                      │
│      ║  voided_at (null = vale)      ║                                      │
│      ╚═══════════════════════════════╝                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                          ▲                        │
   GATILHO B: avulso      │                        │  leitura
   [Browser] "Novo        │                        ▼
   lançamento" (Ganhos)   │        ┌────────────────────────────────────────┐
     → createStandalone…  │        │ get_earnings_summary(profile,from,to,  │
       Action ────────────┘        │                      today)  [SQL fn]  │
                                   │  · where voided_at is null  ← blindado │
                                   │  · date_trunc('week'|'month', …)       │
                                   │  · sum(…) FILTER (…)                   │
                                   │  · count(distinct case_id)             │
                                   │    + count(*) filter (case_id is null) │
                                   │  · round(total/denom) ← 1 arredondam.  │
                                   └────────────────────────────────────────┘
                                                   │ jsonb
                                                   ▼
   [RSC] app/dashboard/earnings/page.tsx  (gate auth+paid, redirect)
      · calcula janela do mês + "hoje" com tz(CLINIC_TIME_ZONE)  ← único fuso
      · chama getEarningsSummary + listFinancialEntries (2 leituras paralelas)
                                                   │ props
                                                   ▼
   [Browser] EarningsPanel ("use client")
      · 3 Cards (hoje/semana/mês) + Card de média
      · <ResponsiveContainer><BarChart>  ← recharts, série by_day
      · <Table> lista + AlertDialog "Anular"
              │
              ▼  voidFinancialEntryAction  → toast.success + { label:"Desfazer" }
                                             → restoreFinancialEntryAction (2º action)
                                             → router.refresh()  ← OBRIGATÓRIO
```

### Recommended Project Structure

```
supabase/migrations/
├── 2026082x000000_procedure_catalog_and_prices.sql   # catálogo + profiles.consultation_price_cents
└── 2026082x000100_financial_entries.sql              # enum + tabela + índices + RLS(3 policies) + fn de agregação

lib/
├── formatters.ts                    # + formatCentsToBRL (EDITAR o existente, não criar arquivo)
├── money.ts                         # parseBrlToCents + spec  (única fn nova de lógica)
└── schemas/
    ├── financial-entry.ts           # enum espelho + create/void/standalone
    └── procedure-catalog-item.ts

modules/financial-entries/
├── types.ts
├── create-financial-entries.ts      # insert multi-row
├── list-financial-entries.ts        # includeVoided default false (D-21)
├── get-earnings-summary.ts          # .rpc("get_earnings_summary")
├── void-financial-entry.ts          # set voided_at
├── restore-financial-entry.ts       # voided_at = null (D-22)
├── count-non-voided-entries-for-case.ts   # guarda D-10
└── *.spec.ts                        # ownership (molde delete-measurement.spec.ts)

modules/procedure-catalog/           # espelha modules/exam-catalog/
├── types.ts
├── list-procedure-catalog-items.ts
├── create-procedure-catalog-item.ts
├── update-procedure-catalog-item.ts
└── delete-procedure-catalog-item.ts

actions/financial-entries/{index.ts, prepare-case-earnings.ts, create-case-financial-entries.ts,
                           create-standalone-financial-entry.ts, void-financial-entry.ts,
                           restore-financial-entry.ts}
actions/procedure-catalog/{index.ts, …}
actions/index.ts                     # + reexport dos 2 barrels

app/dashboard/earnings/page.tsx      # RSC, gate auth+paid
components/dashboard/earnings/{earnings-panel.tsx, earnings-cards.tsx,
                               earnings-daily-chart.tsx, earnings-table.tsx,
                               standalone-entry-dialog.tsx}
components/dashboard/cases/case-earnings-dialog.tsx    # o diálogo do encerramento
components/dashboard/profile/procedure-catalog-card.tsx # catálogo + preço no Perfil
```

### Padrão 1: Tabela de lançamentos — âncora simples em `profile_id` + `description NOT NULL`

**What:** `financial_entries` ancorada só em `profile_id`; `case_id` nullable; `description` **sempre** obrigatória.
**When to use:** é a decisão de schema da fase; tudo depende dela.

**Por que âncora simples e não a dupla de `cases`** — a análise concreta:

`supabase/migrations/20260604000003_rls_cases.sql` usa `profile_id OR user_phone` porque `cases.profile_id` é nullable e casos de origem WhatsApp podem chegar só com telefone. Mas o **caminho de leitura real do app já é `profile_id`**:

- `modules/cases/get-cases-by-profile-id.ts` → `.eq("profile_id", profile.id)` — a lista de casos **só mostra** casos com `profile_id`.
- `modules/cases/get-case-row-for-profile.ts` → `.eq("profile_id", profileId)`.
- `modules/cases/create-dashboard-case-with-patient.ts` → sempre insere `profile_id: profileId`.
- Exceções (`update-case-status.ts`, `delete-case.ts`, `get-case-by-id.ts`) resolvem `user_phone` de `authenticated_users` e filtram por telefone.

Consequência prática: um caso com `profile_id` nulo **não aparece na lista de casos**, logo o médico não abre seu detalhe pelo fluxo normal, logo não clica "Encerrar caso" nele. O diálogo de lançamento nasce onde `profile_id` já existe.

| Opção | O que quebra |
|-------|--------------|
| **Âncora simples `profile_id` (RECOMENDADA)** | Um caso WhatsApp-origin de `profile_id` nulo encerrado por um caminho alternativo não geraria lançamento **se o action exigisse `profile_id` no caso**. Mitigação: o action **estampa o `profile_id` da sessão no lançamento** e valida o caso pela **mesma âncora dupla que `updateCaseStatus` já usa** — então nem esse caso fica de fora, e o lançamento continua ancorado só em `profile_id`. |
| Espelhar a âncora dupla | Duplica 4 policies grandes com subquery em `authenticated_users`, cria um segundo caminho de posse para dinheiro (`user_phone` é *string*, não FK), e torna a soma "de quem?" ambígua quando telefone e perfil divergem. Nenhum benefício, pois todo lançamento nasce com `profile_id` da sessão. |

**FK + NOT NULL exatos que impedem vazamento cross-tenant via `case_id`:**

1. `profile_id uuid **not null** references public.profiles(id) on delete cascade` — o dono é sempre explícito e sempre existe.
2. `case_id uuid **null** references public.cases(id) on delete restrict` — nullable por D-02.
3. **A defesa contra `case_id` de outro tenant é no action** (o cliente manda `caseId`): antes do insert, o action verifica a posse do caso. Um `case_id` de outro médico é rejeitado ali. Como defesa em profundidade, o `select` de exibição faz join `cases(...)` — e a RLS de `cases` (âncora dupla) já nega linhas de outro dono, então mesmo um `case_id` plantado no banco não renderiza dado alheio.
4. **Nenhuma policy de DELETE** (ver Achado 5).

**Migration recomendada (arquivo único, PT-BR, molde `20260722200000_appointments.sql`):**

```sql
-- Lançamentos financeiros do médico (EARN-01..05, Fase 10). Livro-caixa de ENTRADA:
-- todo valor em CENTAVOS INTEIROS (D-14) — nunca float, nunca numeric-em-reais.
--
-- ÂNCORA (D-01/DV-1): o lançamento pendura em cases(id) (caso encerrado) ou em nada
-- (avulso). NÃO existe coluna de agendamento. `case_id` é nullable (D-02) e NÃO tem
-- unique — um atendimento gera 1 linha de consulta + N linhas de procedimento (D-08).
--
-- RLS ÂNCORA SIMPLES por profile_id (deliberado): diferente de public.cases (que usa
-- profile_id OR user_phone porque cases.profile_id é nullable), aqui profile_id é NOT
-- NULL e estampado server-side pela action — dinheiro tem exatamente um dono. O caso
-- referenciado é validado na action pela MESMA âncora dupla que updateCaseStatus usa.
--
-- AUDITORIA (D-19): corrigir é ANULAR (voided_at), nunca apagar. Por isso esta tabela
-- NÃO tem policy de DELETE — a RLS nega DELETE por default, e essa ausência é a
-- garantia mais barata de que nenhum caminho de app apaga faturamento. O ON DELETE
-- CASCADE de profile_id continua valendo (apagar a conta apaga tudo do dono, exigência
-- do fluxo de exclusão de conta), pois FK cascade não passa por policy.

create type public.payment_method as enum (
  'pix',        -- Pix
  'cash',       -- Dinheiro
  'card',       -- Cartão
  'insurance'   -- Convênio
);

comment on type public.payment_method is
  'Forma de pagamento do lançamento (D-12): pix | cash | card | insurance. Valores em inglês; rótulos PT-BR vivem na UI (PAYMENT_METHOD_LABEL), mesma convenção de appointment_status.';

create table public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,

  -- Caso de origem. NULL = lançamento avulso (EARN-02/D-02). ON DELETE RESTRICT
  -- preserva a integridade do livro-caixa: um caso com lançamento não-anulado não
  -- pode ser apagado (a action de excluir caso traduz o 23503 em mensagem PT-BR).
  case_id uuid references public.cases(id) on delete restrict,

  -- SNAPSHOT do rótulo (D-05): "Consulta", o nome do procedimento no momento da
  -- gravação, ou a descrição livre do avulso (D-13). SEMPRE preenchida — é o que
  -- torna o lançamento reconhecível meses depois sem depender de join.
  description text not null,

  -- SNAPSHOT do preço (D-05/D-14): centavos inteiros. integer cobre até
  -- R$ 21.474.836,47 por linha; sum(integer) em Postgres já promove a bigint,
  -- então totais não estouram.
  amount_cents integer not null,

  payment_method public.payment_method not null,

  -- Data de RECEBIMENTO escolhida pelo médico (D-11), não o instante do
  -- encerramento. Tipo `date` (não timestamptz) DE PROPÓSITO: é um dia de
  -- calendário, então date_trunc sobre ela já é o bucket local — zero AT TIME
  -- ZONE, zero risco de DST na agregação (EARN-03).
  received_on date not null,

  -- Anulação/estorno (D-19..D-22). NULL = lançamento vale; timestamp = anulado.
  voided_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint financial_entries_amount_positive check (amount_cents > 0),
  constraint financial_entries_description_not_blank check (btrim(description) <> '')
);

comment on table public.financial_entries is
  'Livro-caixa de entrada do médico (EARN-01..05). Valores em centavos inteiros; preço e rótulo congelados por snapshot (D-05). case_id nullable = avulso (D-02), sem unique (N linhas por caso, D-08). Anulação por voided_at, nunca delete (D-19) — tabela sem policy de DELETE. Buckets do painel pela received_on (date, dia local da clínica).';

comment on column public.financial_entries.received_on is
  'Data de recebimento escolhida pelo médico (D-11). `date` e não timestamptz: é um dia de calendário, então date_trunc já devolve o bucket local sem AT TIME ZONE.';
comment on column public.financial_entries.voided_at is
  'Anulação (D-19): NULL = vale, timestamp = anulado. TODO total/média filtra voided_at is null.';

-- Índice do painel: cobre o range de received_on por dono já filtrando anulados
-- (índice PARCIAL — o filtro voided_at is null vive no índice, então o plano da
-- agregação nunca lê linha anulada).
create index idx_financial_entries_profile_received_active
  on public.financial_entries (profile_id, received_on)
  where voided_at is null;

-- Índice da guarda de re-encerramento (D-10) e da lista dentro do caso (D-20).
create index idx_financial_entries_case_active
  on public.financial_entries (case_id)
  where case_id is not null and voided_at is null;

create or replace function public.set_updated_at_financial_entries()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_financial_entries_set_updated_at
  before update on public.financial_entries
  for each row
  execute function public.set_updated_at_financial_entries();

alter table public.financial_entries enable row level security;

create policy "Financial entries select own"
on public.financial_entries for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Financial entries insert own"
on public.financial_entries for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

-- UPDATE existe para anular/desanular (voided_at) — NÃO para editar valor (D-19),
-- o que é regra de app: a action de anulação só escreve a coluna voided_at.
create policy "Financial entries update own"
on public.financial_entries for update to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
)
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

-- SEM policy de DELETE — deliberado (D-19). A RLS nega DELETE por default.
```

**Anti-pattern evitado:** a constraint "tem caso OU tem descrição" (`check (case_id is not null or description is not null)`) desaparece porque `description` é sempre `NOT NULL`. Uma constraint menos, um caminho de erro menos, e o lançamento sobrevive legível a qualquer mudança no caso.

### Padrão 2: Agregação em UMA função SQL — o lugar onde `voided_at` não pode ser esquecido

**What:** função `stable`, `security invoker`, `set search_path = ''`, devolvendo `jsonb`.
**When to use:** todo número do painel (cards, média, série do gráfico) vem daqui. A lista de lançamentos, não — essa é `select` normal via PostgREST.

**Por que RPC e não PostgREST + agrupamento no cliente:**
1. EARN-03 exige literalmente "agregação em SQL" — agrupar no cliente reprova o requisito.
2. PostgREST não expressa `date_trunc(...)` na cláusula `select` — o bucket semana/mês é impossível sem função.
3. Precedente do repo: `supabase/migrations/20260722100000_save_availability_rpc.sql` + `actions/availability/save-availability.ts` — é o único `.rpc()` do repo hoje, com o padrão `security invoker` + `set search_path = ''` + `revoke/grant` já validado.
4. Um round-trip devolve tudo (4 escalares + série diária) em vez de 4 queries.

```sql
-- Agregação do painel de Ganhos (EARN-03/EARN-04, Fase 10).
--
-- POR QUÊ no banco: date_trunc não é expressável em PostgREST e EARN-03 exige
-- agregação em SQL. Molde do save_availability RPC: SECURITY INVOKER (a RLS
-- owner-scoped continua valendo como defesa em profundidade) + search_path = ''
-- + nomes totalmente qualificados (evita o advisor function_search_path_mutable).
--
-- FUSO (D-25): NÃO há AT TIME ZONE aqui. received_on é `date` (um dia de
-- calendário escolhido pelo médico, D-11), então date_trunc já devolve o bucket
-- local. O único "fuso" da feature é derivar "hoje"/janela do mês, e isso o RSC
-- faz com tz(CLINIC_TIME_ZONE) (mesmo padrão de app/dashboard/agenda/page.tsx) e
-- passa pronto em p_today/p_from/p_to. date_trunc('week', …) é segunda-feira por
-- definição ISO 8601 — casa com D-25 sem parâmetro extra.
--
-- ANULADOS (D-21): o filtro voided_at is null vive AQUI, no único caminho que
-- produz os números. Nenhum caller pode esquecê-lo.
create or replace function public.get_earnings_summary(
  p_profile_id uuid,
  p_from date,     -- início do período navegado (inclusivo)
  p_to date,       -- fim do período navegado (EXCLUSIVO, meio-aberto)
  p_today date     -- "hoje" na data local da clínica, calculado no RSC
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with scoped as (
    -- Sem filtro de data: os cards hoje/semana/mês são relativos a p_today e
    -- independem do período navegado (o médico pode estar olhando março).
    select fe.amount_cents, fe.case_id, fe.received_on
    from public.financial_entries fe
    where fe.profile_id = p_profile_id
      and fe.voided_at is null
      -- Owner-check redundante (defesa contra IDOR, igual save_availability):
      -- a RLS já negaria as linhas, isto só torna a intenção explícita.
      and exists (
        select 1 from public.profiles p
        where p.id = p_profile_id and p.auth_user_id = auth.uid()
      )
  ),
  win as (
    select * from scoped
    where received_on >= p_from and received_on < p_to
  ),
  cards as (
    select
      coalesce(sum(amount_cents) filter (
        where received_on = p_today
      ), 0)::bigint as today_cents,
      coalesce(sum(amount_cents) filter (
        where date_trunc('week', received_on) = date_trunc('week', p_today)
      ), 0)::bigint as week_cents,
      coalesce(sum(amount_cents) filter (
        where date_trunc('month', received_on) = date_trunc('month', p_today)
      ), 0)::bigint as month_cents
    from scoped
  ),
  period as (
    select
      coalesce(sum(amount_cents), 0)::bigint as period_cents,
      -- DENOMINADOR DA MÉDIA (DV-2/D-17): casos DISTINTOS com lançamento +
      -- avulsos contados individualmente. count(distinct case_id) ignora NULL
      -- por definição de SQL, então as duas parcelas não se sobrepõem.
      (count(distinct case_id)
        + count(*) filter (where case_id is null))::bigint as attendances
    from win
  ),
  by_day as (
    select received_on, sum(amount_cents)::bigint as cents
    from win
    group by received_on
    order by received_on
  )
  select jsonb_build_object(
    'today_cents',   c.today_cents,
    'week_cents',    c.week_cents,
    'month_cents',   c.month_cents,
    'period_cents',  p.period_cents,
    'attendances',   p.attendances,
    -- ARREDONDAMENTO ÚNICO (D-17): uma única divisão em numeric, um único
    -- round, resultado já em centavos inteiros. A UI NUNCA recalcula a média.
    'average_cents',
      case when p.attendances = 0 then 0
           else round(p.period_cents::numeric / p.attendances)::bigint end,
    'by_day', coalesce((
      select jsonb_agg(jsonb_build_object('received_on', received_on, 'cents', cents))
      from by_day
    ), '[]'::jsonb)
  )
  from cards c cross join period p;
$$;

comment on function public.get_earnings_summary(uuid, date, date, date) is
  'Agregação do painel de Ganhos (EARN-03/EARN-04): cards hoje/semana/mês relativos a p_today, total e média do período [p_from, p_to) e série diária. Filtra voided_at is null (D-21). Buckets por date_trunc sobre received_on (date) — sem AT TIME ZONE, sem DST. Média = total ÷ (casos distintos + avulsos) com arredondamento único (DV-2/D-17). SECURITY INVOKER + owner-check por auth.uid().';

revoke all on function public.get_earnings_summary(uuid, date, date, date) from public;
grant execute on function public.get_earnings_summary(uuid, date, date, date) to authenticated;
```

**Ceiling conhecido:** `scoped` não filtra data (os cards precisam de linhas fora da janela navegada). Com o índice parcial `(profile_id, received_on) where voided_at is null` isso é um index-scan sobre o histórico de **um** médico — centenas a poucos milhares de linhas. Se um dia doer, particione: uma segunda CTE limitada a `date_trunc('month', p_today)` ± 1 semana cobre os 3 cards.

### Padrão 3: O gatilho é efeito colateral — a máquina de status não muda

**What:** duas chamadas sequenciais no client, não uma action combinada.
**Why:** CONTEXT § Integration Points é explícito — *"Não alterar a máquina de status do caso; o lançamento é efeito colateral do encerramento, não parte dele."*

```
handleCloseCase() {
  1) await updateCaseStatusAction(caseId, "closed")   // ARQUIVO INTOCADO
  2) if (!ok) return toast.error(...)
  3) const prep = await prepareCaseEarningsAction(caseId)
  4) if (prep.ok && prep.ask) setEarningsDialogOpen(true)   // senão: fim
  5) router.refresh()
}
```

**Por que uma action separada (`prepareCaseEarningsAction`) e não props do RSC:** `CaseDetailActions` está **três** client components abaixo do RSC (`app/dashboard/cases/[id]/page.tsx` → `case-detail-header.tsx:128` → `case-detail-header-toolbar.tsx:41` → `case-detail-actions.tsx`). Threading de `consultationPriceCents` + catálogo por 3 componentes é diff grande e acoplamento gratuito. Uma action que devolve `{ ask, consultationPriceCents, procedures[] }` é 1 arquivo e resolve a guarda D-10 no mesmo round-trip.

**Onde exatamente mora a guarda D-10:** dentro de `prepareCaseEarningsAction`, chamando `modules/financial-entries/count-non-voided-entries-for-case.ts`. A query:

```ts
const { count, error } = await supabase
  .from("financial_entries")
  .select("id", { count: "exact", head: true })
  .eq("profile_id", profileId)     // C-8: sempre junto do case_id
  .eq("case_id", caseId)
  .is("voided_at", null)
// error -> throw new Error(`[EARNINGS] ...`)
// (count ?? 0) > 0  =>  ask: false   (não pergunta nada, D-10)
```

`head: true` não trafega linhas. O índice parcial `idx_financial_entries_case_active` atende exatamente esse predicado.

**Não colocar a guarda em `modules/cases/update-case-status.ts`:** isso importaria o domínio financeiro dentro do domínio de casos e violaria "o lançamento é efeito colateral". O arquivo de status permanece byte-idêntico.

### Padrão 4: Anulação com "Desfazer" — o padrão exato da agenda

**What:** `AlertDialog` de confirmação → action de anular → `toast.success` com `action: { label: "Desfazer", onClick }` → segunda action de restaurar → `router.refresh()`.

Precedente literal (`components/dashboard/agenda/calendar-editor.tsx:996-1010`):

```tsx
const result = await persistDraft(next)
if (result.ok) {
  toast.success("Disponibilidade atualizada.", {
    action: {
      label: "Desfazer",
      onClick: async () => {
        const undoResult = await persistDraft(before)
        if (undoResult.ok) toast.success("Mudança desfeita.")
        else { setDraft(next); toast.error(undoResult.error) }
      },
    },
  })
} else { setDraft(before); toast.error(result.error) }
```

**Fatos verificados sobre a janela do "Desfazer":**

| Pergunta | Resposta verificada |
|----------|--------------------|
| Arquivo exato | `components/dashboard/agenda/calendar-editor.tsx` — dois sítios: linha ~902 (`applyAvailabilityIntent`) e ~996 (`clearAndPersist`, o dos botões "Limpar disponibilidade/folgas" do commit `71bfa06`) |
| Janela em ms | **Nenhuma explícita.** Não há `duration:` em nenhum `toast(...)` do repo, nem em `components/ui/sonner.tsx` (`toastOptions` só define `classNames`). Logo vale o default do `sonner` (**4000 ms**) `[ASSUMED: default do sonner v2 — não verificado em docs nesta sessão]` |
| Client-only ou action real? | **Action real.** O undo chama `persistDraft(before)` de novo — outra ida ao servidor. Nada é "desfeito" só na memória |
| Recomendação para dinheiro | Passar `duration: 8000` **explícito** no toast da anulação. 4 s é curto para uma decisão financeira, e um número explícito no código é auditável. Custo: um campo. Registrar em PT-BR: `"Lançamento anulado."` + `label: "Desfazer"` |

**Consequência de design importante:** como o undo é um action real, `restoreFinancialEntryAction` **é uma escrita gateada** (`paid` + `profile_id` + `id`), não um detalhe de UI. E ela não tem janela do lado do servidor — a "janela" é só o toast desaparecer. Isso é **exatamente** o que D-22 pede ("passada a janela, a anulação é definitiva" na prática = o botão sai da tela). Não construir expiração server-side: seria inventar requisito (o deferred diz "des-anular a qualquer momento — rejeitado", mas não pede enforcement temporal no banco).

### Padrão 5: Painel — RSC calcula o fuso, client component desenha

```tsx
// app/dashboard/earnings/page.tsx  (RSC)
// Molde: app/dashboard/agenda/page.tsx (gate + tz + Promise.all)
const context = { in: tz(CLINIC_TIME_ZONE) }
const now = new Date()
const monthStart = startOfMonth(now, context)
const monthEnd = addMonths(monthStart, 1, context)   // meio-aberto [start, end)
const toIsoDate = (d: Date) => format(d, "yyyy-MM-dd", context)

const [summary, entries] = await Promise.all([
  getEarningsSummary(supabase, profile.id, toIsoDate(monthStart), toIsoDate(monthEnd), toIsoDate(now)),
  listFinancialEntries(supabase, profile.id, { from, to, includeVoided: false }),
])
```

Gate obrigatório antes disso, copiado de `app/dashboard/agenda/page.tsx:35-38`:

```tsx
const { profile } = await getAuthenticatedUser(supabase)
if (!profile?.id) redirect("/auth/login")
// RLS `to authenticated` NÃO impõe a assinatura — o gate paid é regra de app.
if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")
```

### Padrão 6: Gráfico de barras — o uso concreto de recharts 3.9.0 no repo

Padrão a copiar de `components/dashboard/patients/growth/growth-chart.tsx:330-370` (verificado linha a linha):

```tsx
"use client"                                    // OBRIGATÓRIO — recharts precisa de DOM

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

<div className="rounded-xl border border-border bg-card p-4">
  <ResponsiveContainer width="100%" height={280}>
    <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
      <YAxis
        type="number"
        tick={{ fontSize: 11 }}
        width={64}
        tickFormatter={(v) => formatCentsToBRL(Number(v))}
      />
      <Tooltip
        formatter={(value) => formatCentsToBRL(Number(value))}
        labelFormatter={(label) => `Dia ${label}`}
      />
      <Bar dataKey="cents" fill="var(--primary)" isAnimationActive={false} />
    </BarChart>
  </ResponsiveContainer>
</div>
```

Detalhes que **são** o padrão do repo (não inventar outros):
- `ResponsiveContainer width="100%" height={N}` com altura numérica fixa — sem `aspect`.
- Grid via `className="stroke-border"` (token Tailwind), **não** prop `stroke`.
- Cores por **CSS var de token**: `fill="var(--primary)"`, `stroke="var(--chart-1)"`, `var(--muted-foreground)`.
- `tick={{ fontSize: 11 }}`, `isAnimationActive={false}` (o repo desativa animação em todas as séries).
- Wrapper `rounded-xl border border-border bg-card p-4`.
- Não existe `components/ui/chart.tsx` (o wrapper shadcn de charts) — **não adicionar**; o repo usa recharts cru.

### Anti-Patterns to Avoid

- **Somar reais em `number` JS.** `0.1 + 0.2 !== 0.3`. Toda aritmética é em centavos inteiros, e a única divisão acontece no Postgres.
- **Recalcular a média no cliente.** Se a UI fizer `total / n` em JS, ela divergirá do `average_cents` do SQL no meio-centavo. A UI **exibe** `average_cents`.
- **Somar médias por bucket para obter a média do período.** Média de médias não reconcilia. Só existe uma média, do período inteiro.
- **`revalidatePath` sem `router.refresh()`.** Achado do quick `260724-ojm`: quando o client component faz `await someAction()`, o `revalidatePath` invalida o cache mas **o RSC da página atual não re-renderiza**. Todo action desta fase invocado de client component precisa de `router.refresh()` depois.
- **Filtro `voided_at` no componente.** Se a UI filtra, o total já veio errado. O filtro é SQL.
- **`delete` de lançamento.** Nem no módulo, nem no action, nem em migration futura. Sem policy de DELETE, tentar isso falha silenciosamente (0 linhas) — o que é o comportamento desejado.
- **Reintroduzir o grupo "Agenda" no sidebar.** `4475d4d` removeu deliberadamente (rota `/dashboard/agenda` intacta, só o menu saiu). O novo grupo "Financeiro" é **acréscimo** ao array `navMain`; nada mais nele muda.
- **`consultation_price_cents` como `numeric`/reais no `profiles`.** Mesma unidade em toda a fase: centavos.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Formatar R$ | Concatenar `"R$ " + (c/100).toFixed(2).replace(".", ",")` | `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })` | Separador de milhar, negativos, espaço non-breaking correto — e é nativo |
| Bucket de semana começando na segunda | Aritmética de `getDay()`/offset | `date_trunc('week', …)` | Semana ISO 8601 já começa segunda `[CITED: postgresql.org]` — zero código |
| "É hoje?" no fuso da clínica | `new Date().toISOString().slice(0,10)` | `format(now, "yyyy-MM-dd", { in: tz(CLINIC_TIME_ZONE) })` | UTC no Vercel: até 03:00 de Brasília o `toISOString` já é o dia seguinte. `lib/clinic-timezone.ts` existe exatamente para isso |
| Parse de data dd/mm/aaaa | Regex própria + `new Date(str)` | `lib/brazilian-date-form.ts` (`maskBrazilianDateInput`, `parseBirthDateFormValueToIso`, `isCompleteBirthDateInputString`) | Já existe, já testado (`brazilian-date-form.spec.ts`), já usado em `measurement-form.tsx` |
| Atomicidade de N inserts | Loop de inserts / RPC | **Um** `.insert([row1, row2, …])` | Um statement = uma transação implícita. RPC aqui é over-engineering (Achado 6) |
| Mensagem de erro amigável a partir de erro cru | `String(e)` no toast | `getFriendlyToastMessage` (`lib/get-friendly-toast-message.ts`) + `zodErrorToUserMessage` (`lib/zod-error-message.ts`) | Já removem a tag `[DOMAIN]` e normalizam JSON de erro |
| Trigger de `updated_at` | Escrever `updated_at` na mão em cada update | Trigger por tabela (molde `exam_catalog_items` / `patient_measurements`) | Padrão do repo; funciona também para o `voided_at` |
| Um novo `lib/currency.ts` para formatar | Arquivo novo | Editar `lib/formatters.ts` | O repo já concentra formatação de exibição lá (datas, telefone, HTML). Um arquivo novo fragmenta |

**Key insight:** esta fase é 90% cópia de moldes internos. Toda vez que a implementação parecer "precisar de algo novo", a resposta quase certa está em `supabase/migrations/20260710020400_exam_catalog_items.sql`, `20260722100000_save_availability_rpc.sql`, `20260722200000_appointments.sql`, `components/dashboard/patients/growth/measurement-form.tsx` ou `components/dashboard/agenda/calendar-editor.tsx`.

## Achados de Pesquisa (as 10 prioridades)

### Achado 1 — Âncora de RLS: **âncora simples `profile_id`**

Resolvido em detalhe no **Padrão 1** acima (com a tabela comparativa e o SQL exato das 3 policies). Resumo executivo:

- `cases` usa âncora dupla porque `cases.profile_id` **é** nullable `[VERIFIED: 20260604000003_rls_cases.sql + get-case-row-for-profile.ts retorna profile_id: string | null]`.
- `financial_entries` usa **só `profile_id`, NOT NULL**, estampado server-side.
- A posse do **caso** referenciado é validada **no action**, com a mesma resolução `profile_id → authenticated_users.phone → cases.user_phone` que `modules/cases/update-case-status.ts` já usa — assim nem o caso WhatsApp-origin de `profile_id` nulo fica sem faturar.
- Vazamento cross-tenant por `case_id` é impossível: (a) o action valida a posse antes do insert; (b) o join de exibição passa pela RLS de `cases`.
- `[VERIFIED: leitura de 20260604000003_rls_cases.sql, get-cases-by-profile-id.ts, get-case-row-for-profile.ts, update-case-status.ts, delete-case.ts, create-dashboard-case-with-patient.ts]`

### Achado 2 — Dinheiro em centavos: coluna, input e formatação

**Coluna: `integer`, não `bigint`.** `integer` cobre R$ 21.474.836,47 **por lançamento** — inatingível para uma consulta pediátrica. E `sum(integer)` no Postgres **já promove o resultado a `bigint`**, então o total do período não estoura mesmo com milhões de linhas. `bigint` só dobraria o storage sem ganho. Com `check (amount_cents > 0)` (zero é cortesia, e cortesia é *não gerar lançamento*, D-09). `[VERIFIED: molde patient_measurements usa integer para weight_grams; sum(int)→bigint é comportamento documentado do PostgreSQL]`

**Input em R$: `type="text" inputMode="decimal"`, sem máscara, sem `type="number"`.** É o padrão já provado do repo `[VERIFIED: components/dashboard/patients/growth/measurement-form.tsx:229,246,265]` — o form aceita `"12,4"` (vírgula brasileira) como *string*, e o Zod transforma. `type="number"` foi rejeitado no repo por bons motivos (vírgula vs ponto por locale, scroll wheel alterando valor, `valueAsNumber` inconsistente). Precedente de transform (`optionalAnthropometric` em `lib/schemas/patient-measurement.ts`):

```ts
// lib/money.ts  — a ÚNICA lógica nova de dinheiro na fase
/**
 * Converte um valor em reais digitado pelo médico ("150", "150,00", "1.500,50")
 * em CENTAVOS INTEIROS. Aceita vírgula decimal brasileira e ponto de milhar.
 * Retorna null quando não é um número válido — quem chama decide a mensagem.
 */
export function parseBrlToCents(value: string): number | null {
  const s = value.trim().replace(/\./g, "").replace(",", ".")
  if (s === "") return null
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}
```

`Math.round(n * 100)` é seguro para 2 decimais: `150.05 * 100 === 15005.000000000002` → `15005`. Deixar **um** `*.spec.ts` com os casos `"150"`, `"150,00"`, `"1.500,50"`, `"0,01"`, `"150.05"`, `"abc"`, `""` — checagem mínima obrigatória (caminho de dinheiro).

**Formatação: em `lib/formatters.ts` (arquivo existente).** Verificado: `lib/formatters.ts` hoje só tem data/telefone/HTML — **nenhum** formatador numérico ou monetário existe em `lib/` `[VERIFIED: grep + leitura integral de lib/formatters.ts e lib/parsers.ts]`. Logo isto é acréscimo, não duplicação:

```ts
// lib/formatters.ts (append)
/** Instância única — construir Intl.NumberFormat por chamada é caro. */
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

/** Formata centavos inteiros como moeda brasileira (15000 -> "R$ 150,00"). */
export function formatCentsToBRL(cents: number): string {
  return BRL.format(cents / 100)
}
```

A divisão por 100 aqui é só apresentação — nunca volta ao banco.

### Achado 3 — Agregação e fuso: a dica 💡 do scan está **CONFIRMADA**

**Confirmado, não refutado.** Guardar a data de recebimento como `date` elimina a conversão de fuso na agregação:

> *"`source` is a value expression of type `timestamp`, `timestamp with time zone`, or `interval`. (Values of type `date` and `time` are cast automatically to `timestamp` or `interval`, respectively.)"* `[CITED: postgresql.org/docs/current/functions-datetime.html]`

Um `date` é promovido a `timestamp` **sem** fuso, então `date_trunc('month', received_on)` devolve a meia-noite do dia 1 daquele mês local — o bucket certo, sem `AT TIME ZONE`, sem DST, sem depender do `TimeZone` da sessão. Com `timestamptz` seria obrigatório `date_trunc('month', received_on AT TIME ZONE 'America/Sao_Paulo')` em **toda** expressão, e qualquer esquecimento produziria bucket UTC (um recebimento de 31/01 às 22h local cairia em fevereiro).

**"Semana começa na segunda" — verificado:** ISO 8601 define semanas começando na segunda, e é essa a semântica de `week` no Postgres `[CITED: postgresql.org/docs/current/functions-datetime.html]`. Nenhum parâmetro extra, nenhum `weekStartsOn`.

**Consequência para `lib/clinic-timezone.ts`:** o arquivo **continua sendo usado** — só muda *onde*. Não mais no SQL, e sim no RSC, para derivar `hoje` e a janela do mês (`startOfMonth(now, { in: tz(CLINIC_TIME_ZONE) })`), exatamente como `app/dashboard/agenda/page.tsx` faz. O JSDoc do arquivo já antecipa isso: *"e, futuramente, buckets de ganhos (Phase 10)"* `[VERIFIED: leitura de lib/clinic-timezone.ts]`. E o default do campo "data de recebimento" no diálogo é essa mesma data local — não `new Date()` cru.

**⚠️ Desvio de redação que o planner DEVE registrar:** ROADMAP § Phase 10 SC-3 diz literalmente *"buckets pela data local da clínica (`AT TIME ZONE 'America/Sao_Paulo'`)"*. Com `received_on date` **não haverá `AT TIME ZONE` no SQL** — o resultado (buckets na data local da clínica) é idêntico e mais seguro, mas um verificador que faça grep literal por `AT TIME ZONE` reprovaria. O plano deve declarar esse desvio de mecanismo (mesmo outcome, mecanismo melhor) em texto, para não travar `/gsd-verify-work`.

**RPC vs PostgREST: RPC** — justificado no Padrão 2 (`date_trunc` não é expressável em PostgREST; EARN-03 exige SQL; precedente `save_availability`).

### Achado 4 — A média (DV-2 / D-17) em SQL

Expressão exata (já embutida no Padrão 2):

```sql
-- denominador
(count(distinct case_id) + count(*) filter (where case_id is null))::bigint as attendances

-- média, arredondamento ÚNICO
case when attendances = 0 then 0
     else round(period_cents::numeric / attendances)::bigint end as average_cents
```

Três propriedades que fazem isso ser correto:

1. **`count(distinct case_id)` ignora NULL** — é definição de SQL. Logo as duas parcelas do denominador **não se sobrepõem**: casos entram uma vez cada, avulsos entram um a um. Um atendimento com 3 procedimentos conta **1** (o objetivo de DV-2).
2. **Um único arredondamento.** `period_cents` é `sum` de inteiros → exato. A divisão acontece em `numeric` (precisão arbitrária, não float) e `round()` é aplicado **uma vez**, produzindo centavos inteiros.
3. **`attendances = 0` → 0**, não divisão por zero. (Equivalente a `nullif(attendances,0)`, mas explícito evita `null` na UI.)

**Como o arredondamento nunca faz a média "divergir do total exibido":** o total exibido vem de `period_cents` (exato, sem arredondamento); a média vem de `average_cents` (arredondada uma vez). A regra operacional de "reconcilia ao centavo" é: **a UI exibe os dois valores que o SQL devolveu e nunca deriva um do outro**. Se a UI fizesse `average = total / n` em JS, ou somasse médias diárias, aí sim apareceria drift. Note que `average_cents × attendances ≠ period_cents` em geral — isso é intrínseco a qualquer média inteira, não é erro; o que não pode acontecer é a *mesma* grandeza ter dois valores diferentes na tela. Adicionar comentário nesse sentido no componente dos cards.

### Achado 5 — `voided_at`: forma da coluna e como tornar o filtro impossível de esquecer

**Coluna:** `voided_at timestamptz` (nullable; `NULL` = vale). Não usar `boolean voided` — a data é a auditoria (D-19 "totais auditáveis"). Nada de `voided_by`: há um único usuário por perfil nesta fase (o assento da assistente é deferred).

**Quatro camadas para não esquecer o filtro, do mais forte ao mais fraco:**

| Camada | Mecanismo | Força |
|--------|-----------|-------|
| 1 | O filtro `voided_at is null` vive **dentro** de `get_earnings_summary` — o único caminho que produz totais/média | **Mais forte.** Nenhum caller pode esquecer o que não pode passar |
| 2 | **Índice parcial** `where voided_at is null` — o plano de execução da agregação só toca linhas ativas | Performance + intenção documentada no schema |
| 3 | `list-financial-entries.ts` é a **única** fn de listagem, com `includeVoided` default `false` (D-21). O único lugar que passa `true` é o filtro "mostrar anulados" | Uma superfície, um default seguro |
| 4 | `*.spec.ts` que afirma o `.is("voided_at", null)` na listagem default (molde `delete-measurement.spec.ts`, que grava as chamadas `.eq()` num mock) | Regressão travada |

**Por que NÃO uma VIEW `financial_entries_active`:** (a) precisa de `security_invoker = on` senão a RLS do dono da view vaza; (b) resolve leitura mas não protege writes; (c) cria uma segunda superfície de nome para a mesma tabela — mais coisa para manter, zero garantia adicional sobre a camada 1. **Rejeitada.**

**A garantia de auditoria mais barata: não criar policy de DELETE.** Verificado que `exam_catalog_items`, `appointments` etc. criam as 4 policies; aqui criam-se **3** (select/insert/update). A RLS nega DELETE por default, então nenhum caminho de app apaga faturamento, mesmo se alguém escrever `.delete()` por engano. Documentar essa ausência em comentário — senão a próxima pessoa "corrige" a assimetria. O `ON DELETE CASCADE` de `profile_id` continua funcionando (FK cascade não passa por policy), preservando o fluxo de exclusão de conta (`actions/profile/delete-account.ts`).

**Janela do "Desfazer":** ver a tabela de fatos verificados no Padrão 4 — arquivo `components/dashboard/agenda/calendar-editor.tsx` (~linhas 902 e 996), **sem `duration` explícito** em nenhum toast do repo (default do sonner, ~4000 ms `[ASSUMED]`), e o undo é **uma segunda chamada de action real**, não estado local. Recomendação: `duration: 8000` explícito no toast da anulação.

### Achado 6 — Atomicidade de "1 consulta + N procedimentos": **insert multi-row único, sem RPC**

Um `insert` PostgREST com array de linhas é **um statement SQL**, logo uma transação implícita: ou todas as linhas entram, ou nenhuma. Não há janela de escrita parcial.

```ts
// modules/financial-entries/create-financial-entries.ts
const { data, error } = await supabase
  .from("financial_entries")
  .insert(rows)                      // rows: 1 consulta + N procedimentos
  .select("id")
if (error) throw new Error(`[EARNINGS] Failed to create entries: ${error.message}`)
```

**Por que `save_availability` precisou de RPC e isto não:** aquele fluxo eram **3 round-trips independentes** (delete+insert de rules → inserts de overrides → deletes de overrides) — o comentário da migration descreve exatamente o estado corrompido que uma falha no meio produzia `[VERIFIED: 20260722100000_save_availability_rpc.sql]`. Aqui é **um** statement. Adicionar RPC seria over-engineering: mais SQL para manter, mais um `grant`, zero ganho.

**Failure mode da opção mais simples-ainda (um insert por linha em loop):** falha na 3ª linha deixa consulta + 1 procedimento gravados e o resto não; o total do mês fica errado sem nenhum sinal, e o médico não tem como saber quanto persistiu. **Nunca fazer loop de inserts.**

**Ceiling do insert multi-row:** ele não protege contra *double-submit* (dois cliques concorrentes passando pela guarda D-10 antes de qualquer insert — TOCTOU). Risco real: um médico, um diálogo, botão desabilitado por `useTransition`/`isPending` (padrão do repo em `case-detail-actions.tsx`). D-10 é explícito que a guarda é de aplicação, não de banco, e D-08 proíbe unique em `case_id`. Deixar como está e marcar:

```ts
// ponytail: guarda de re-encerramento é TOCTOU-vulnerável sob duplo-clique
// concorrente (D-10 é guarda de app por decisão). Se algum dia duplicar de
// verdade, o upgrade é uma coluna de lote (closing_batch_id) + índice unique
// parcial nela — D-08 proíbe unique em case_id sozinho.
```

### Achado 7 — Onde exatamente vive a guarda de re-encerramento (D-10)

**Arquivos lidos:** `modules/cases/update-case-status.ts`, `actions/cases/update-case-status.ts`, `components/dashboard/cases/case-detail-actions.tsx`.

O que o módulo faz hoje (relevante para D-10): ao reabrir (`status: "active"`), ele **reseta o cronômetro** — `started_at: new Date().toISOString()`, `consultation_paused_ms: 0`, `consultation_paused_at: null`. Ou seja, reabrir + reencerrar é um ciclo natural do produto, e sem guarda cada ciclo geraria um faturamento novo `[VERIFIED: leitura integral]`.

**A guarda fica em `prepareCaseEarningsAction` (action novo), não em `update-case-status.ts`.** Motivos: (1) CONTEXT proíbe alterar a máquina de status; (2) `update-case-status.ts` não pode importar o domínio financeiro sem inverter a dependência; (3) a decisão a tomar é de **UI** ("perguntar ou não"), e o action que monta o diálogo é quem sabe disso.

Query da guarda: ver **Padrão 3** (`count: "exact", head: true` + `.eq("profile_id")` + `.eq("case_id")` + `.is("voided_at", null)`).

**Arquivos que mudam / não mudam:**

| Arquivo | Mudança |
|---------|---------|
| `modules/cases/update-case-status.ts` | **NENHUMA** |
| `actions/cases/update-case-status.ts` | **NENHUMA** (já revalida `/dashboard/cases`, `/dashboard/cases/{id}`, `/dashboard/cases/new/{id}`) |
| `components/dashboard/cases/case-detail-actions.tsx` | `handleCloseCase` ganha o passo 3-5 do Padrão 3 + estado do diálogo + `useRouter` |
| `components/dashboard/cases/case-detail-header-toolbar.tsx` | Nenhuma (o diálogo é renderizado por `CaseDetailActions`) — **atenção:** ele vive dentro de um `Popover`; validar que o `Dialog` abre com o popover fechando (checkpoint visual) |

### Achado 8 — Catálogo de procedimentos com preço + "Valor da Consulta"

**Estrutura a copiar de `supabase/migrations/20260710020400_exam_catalog_items.sql`** (arquivo único, verificado): tabela (`id` uuid pk default `gen_random_uuid()`, `profile_id` not null FK cascade, `name text not null`, `created_at`, `updated_at`) → `create index idx_..._profile_id` → `comment on table` em PT-BR → `create or replace function public.set_updated_at_<tabela>()` + trigger `before update` → `enable row level security` → 4 policies `select/insert/update/delete own` com `profile_id in (select id from public.profiles where auth_user_id = auth.uid())`.

Diferença: **uma coluna de preço**.

```sql
create table public.procedure_catalog_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  -- Preço em CENTAVOS INTEIROS (D-04/D-14). >= 0 (e não > 0) porque o médico pode
  -- catalogar um procedimento gratuito. O lançamento copia este valor por snapshot
  -- (D-05) — reajustar aqui NÃO reescreve o faturamento já gravado.
  price_cents integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint procedure_catalog_items_price_non_negative check (price_cents >= 0),
  constraint procedure_catalog_items_name_not_blank check (btrim(name) <> '')
);
```

Aqui as **4** policies são apropriadas (inclusive DELETE): o catálogo é dado de referência editável, não faturamento. Apagar um item do catálogo **não** afeta lançamentos passados — o snapshot já copiou nome e centavos. Essa é a prova de que D-05 vale a pena.

**"Valor da Consulta" (D-03) — onde exatamente:** coluna em `profiles`, molde `20260316020000_profiles_add_default_location_state_and_city.sql`:

```sql
alter table public.profiles
  add column if not exists consultation_price_cents integer null;

alter table public.profiles
  add constraint profiles_consultation_price_non_negative
  check (consultation_price_cents is null or consultation_price_cents >= 0);

comment on column public.profiles.consultation_price_cents is
  'Valor padrão da consulta em CENTAVOS INTEIROS (D-03/D-14). NULL = ainda não configurado — o diálogo de encerramento abre com o campo vazio.';
```

**⚠️ Três lugares que a coluna nova precisa atravessar (fáceis de esquecer, verificados):**

1. **`modules/supabase/get-authenticated-user.ts`** — o `.select(...)` é uma **string hardcoded** de colunas. Sem adicionar `consultation_price_cents` ali, o RSC nunca vê o valor. **Este é o esquecimento mais provável da fase.**
2. `modules/profiles/types.ts` — `type Profile` (usado como `AuthenticatedUserProfile`).
3. `modules/profiles/update-profile.ts` — `UpdateProfilePayload`; e `lib/schemas/profile.ts` (`updateProfileFormSchema`) + o mapeamento explícito de payload em `actions/profile/update-profile.ts` (que lista campo por campo).

`modules/profiles/get-profile-by-id.ts` **não** precisa mudar (seleciona apenas `auth_user_id, report_template_id`).

**Nota de gate (C-7):** `actions/profile/update-profile.ts` **não tem** gate `paid` hoje — por design: Perfil é onde o usuário não-pago conclui a conta `[VERIFIED: leitura do action; ele checa só `!profile`]`. **Não adicionar** o gate ali (regressão de fluxo). Os actions **novos** do catálogo e de lançamentos **têm** gate `paid` (SC-4).

**O catálogo precisa de diretório próprio de módulo?** Sim: `modules/procedure-catalog/` com 4 fns (list/create/update/delete), espelhando `modules/exam-catalog/` (que hoje tem só `get-exam-catalog-items.ts` + `types.ts` porque é read-only). Não é possível reaproveitar `exam-catalog`: outra tabela, outro domínio, e C-2 pede uma fn por arquivo.

**Onde na tela de Perfil:** `app/dashboard/profile/profile-content.tsx` é uma sequência de `<Card>` ("Informações do perfil" ~l.267, "Logos" ~l.549, "Aparência" ~l.677, "Plano" ~l.731, zona de perigo ~l.777). Recomendação: **um Card novo "Preços"** inserido **depois** de "Informações do perfil" e antes de "Logos", contendo (a) o input "Valor da consulta (R$)" ligado ao form existente, e (b) o CRUD do catálogo em componente separado `components/dashboard/profile/procedure-catalog-card.tsx` (o catálogo tem estado próprio e actions próprios — não deve entrar no `useForm` do perfil). O `app/dashboard/profile/page.tsx` passa a carregar `listProcedureCatalogItems` junto de `getReportTemplatesByProfileId`.

**Dado DV-3 (superfície nova não prevista no roadmap): recomendação forte de que catálogo + preço sejam um PLANO PRÓPRIO** dentro da fase, executado **primeiro** — sem preço cadastrado o diálogo de encerramento não tem o que oferecer. Ordem sugerida: `10-01` migrations (checkpoint de push) → `10-02` catálogo + preço no perfil → `10-03` diálogo de encerramento + lançamentos → `10-04` painel + anulação.

### Achado 9 — pg enum para forma de pagamento

**Padrão do repo confirmado** `[VERIFIED: grep "create type public" em supabase/migrations]`: `case_report_source` ('web','whatsapp'), `medical_certificate_type`, `appointment_status` (5 valores), `appointment_type` (4 valores). Convenção explícita nos comentários: **valores em inglês, rótulos PT-BR na UI** (`APPOINTMENT_TYPE_LABEL`).

DDL (já no Padrão 1): `create type public.payment_method as enum ('pix','cash','card','insurance');` + `comment on type`.

Espelho Zod (molde `lib/schemas/appointment.ts`, que faz exatamente isso para `appointment_status`):

```ts
// lib/schemas/financial-entry.ts
/** Os 4 valores da forma de pagamento, espelhando o pg enum payment_method. */
export const paymentMethodSchema = z.enum(
  ["pix", "cash", "card", "insurance"],
  { message: "Forma de pagamento inválida." },
)
export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>
```

Rótulos PT-BR na UI (não no banco): `{ pix: "Pix", cash: "Dinheiro", card: "Cartão", insurance: "Convênio" }`.

**Nota de segurança de migração — importa pouco aqui, mas o planner deve saber:** *"If `ALTER TYPE ... ADD VALUE` … is executed inside a transaction block, the new value cannot be used until after the transaction has been committed."* `[CITED: postgresql.org/docs/current/sql-altertype.html]`. Como o runner de migrations envolve cada arquivo numa transação, **acrescentar um 5º método depois exige dois arquivos**: um só com o `ADD VALUE`, outro com qualquer backfill/uso. Isso **não** afeta esta fase (o enum nasce completo com `CREATE TYPE`, que não tem essa restrição). É custo apenas se um método novo aparecer — e como o relatório por forma de pagamento é **deferred**, isso é hipotético. `text` + `CHECK` evitaria o custo, mas romperia o padrão recente do repo: **enum escolhido**.

**Obrigatoriedade no diálogo (discricionário):** obrigatória, **sem default**. Um `Select` com placeholder "Selecione…". Justificativa: um default (ex.: "pix") grava método errado por inércia em todo lançamento, e o campo existe justamente para o relatório futuro. Custo: um clique a mais.

### Achado 10 — Reuso de gráfico (recharts 3.9.0)

Coberto integralmente pelo **Padrão 6** (imports, `ResponsiveContainer width="100%" height={N}`, tokens `var(--primary)`/`var(--chart-1)`/`var(--muted-foreground)`, `CartesianGrid className="stroke-border"`, `tick={{fontSize:11}}`, `isAnimationActive={false}`, wrapper `rounded-xl border border-border bg-card p-4`, `"use client"` obrigatório). Verificado que `growth-chart.tsx` é o **único** consumidor de recharts no repo e que **não existe** `components/ui/chart.tsx` — não adicionar o wrapper shadcn.

Diferença: `growth-chart.tsx` usa `ComposedChart` + `Line`/`Scatter` com `data` **por série**; o painel de ganhos usa `BarChart` com `data` **no chart** e um único `<Bar dataKey="cents">`. Formatar eixo Y e tooltip com `formatCentsToBRL` (o `Tooltip formatter` do repo já é usado assim, com `.replace(".", ",")` manual — aqui o `Intl` resolve melhor).

### Achado extra — `revalidatePath`, rota nova e sidebar

**Targets de `revalidatePath` por action:**

| Action | Targets |
|--------|---------|
| `createCaseFinancialEntriesAction` | `/dashboard/earnings`, `/dashboard/cases/${caseId}` |
| `createStandaloneFinancialEntryAction` | `/dashboard/earnings` |
| `voidFinancialEntryAction` / `restoreFinancialEntryAction` | `/dashboard/earnings` + `/dashboard/cases/${caseId}` quando o lançamento tem caso (D-20 permite anular de dentro do caso) |
| `create/update/deleteProcedureCatalogItemAction` | `/dashboard/profile` |
| `updateProfileAction` (preço) | `/dashboard/profile` (já faz) |
| `updateCaseStatusAction` | **inalterado** (já revalida `/dashboard/cases`, `/dashboard/cases/${caseId}`, `/dashboard/cases/new/${caseId}`) |

**Mais `router.refresh()` no client depois de cada uma** — ver Anti-Patterns e o quick `260724-ojm`.

**Rota:** `app/dashboard/earnings/` **não colide** — `ls app/dashboard` dá `agenda, cases, discussions, exam-requests, guidance, link-whatsapp, medical-certificates, medical-reports, patients, prescription-templates, prescriptions, profile, referrals, report-templates, vaccines` `[VERIFIED]`. E `grep -rli "earning|ganhos|livro-caixa|voided"` em `app actions modules components lib supabase` só acha **comentários** (`lib/clinic-timezone.ts` e `20260722200000_appointments.sql` mencionam "ganhos"/"Fase 10" em prosa) — **nenhum identificador ocupado** `[VERIFIED]`.

Recomendação de nome: **`/dashboard/earnings`** (segmento em inglês, rótulo "Ganhos" em PT-BR). Coerente com o repo, que usa segmentos em inglês (`medical-certificates`, `report-templates`, `patients`) com UI em PT-BR — `agenda` é a exceção por ser palavra idêntica nos dois idiomas.

**`components/app-sidebar.tsx` — shape do `navMain` (verificado):**

```ts
const navMain = [
  { title: string, icon: LucideIcon, isActive: boolean, items: { title: string, url: string }[] },
  …
]
```

Grupos atuais: "Principal", "Atendimentos", "Templates", "Serviços". Acréscimo (D-18):

```ts
{
  title: "Financeiro",
  icon: WalletIcon,          // + import de lucide-react
  isActive: false,
  items: [{ title: "Ganhos", url: "/dashboard/earnings" }],
},
```

`isNavItemActive` já cobre por `pathname.startsWith(url)` — nenhum caso especial necessário (os `if` especiais existem só para `/dashboard` e `/dashboard/cases`).

**Remoção do grupo "Agenda" confirmada:** `4475d4d` — *"chore(sidebar): remove item Agenda do menu por enquanto. Rota /dashboard/agenda e todo o código da agenda permanecem intactos — apenas o grupo do menu lateral saiu. Import CalendarIcon removido por ficar órfão."* Diff: −7 linhas em `components/app-sidebar.tsx` `[VERIFIED: git show 4475d4d]`. **Não reintroduzir** ao editar o array; não reintroduzir o import `CalendarIcon`.

## Runtime State Inventory

*Não se aplica: esta fase é greenfield aditivo (tabelas, colunas e rotas novas). Nenhum rename, refactor, migração de dado ou substituição de string. Não há estado de runtime pré-existente com o nome antigo, porque não há nome antigo.*

Único estado externo a considerar: **as migrations precisam ser aplicadas manualmente ao banco vivo** (ver Environment Availability) — não é estado a renomear, é passo de deploy.

## Common Pitfalls

### Pitfall 1 — Excluir um caso que já faturou (⚠️ o mais grave, e cruza domínio)

**O que dá errado:** `modules/cases/delete-case.ts` existe e é acionável pelo botão "Excluir caso" de `case-detail-actions.tsx` (que já avisa *"Esta ação não pode ser desfeita"*). Com FK `on delete restrict`, esse delete passa a falhar com `23503` e o médico recebe um erro cru vindo de `[CASES] Failed to delete case: …`.

**Por que acontece:** um caso com lançamento não-anulado é uma dependência financeira; o banco corretamente se recusa a apagá-lo.

**Como evitar — as três opções, e a escolha:**

| Opção FK | Consequência |
|----------|--------------|
| `on delete cascade` | **Apaga faturamento** ao apagar o caso. Destrói a auditoria que é a razão de D-19. **Rejeitada** |
| `on delete set null` | Zero mudança no domínio `cases` (é a opção mais barata). Mas os N lançamentos daquele caso viram N avulsos → **o denominador da média muda retroativamente** (1 atendimento com 3 procedimentos vira 3 atendimentos) e um número histórico já visto pelo médico muda sozinho. Número errado num relatório financeiro é pior que uma mensagem de erro |
| **`on delete restrict` (RECOMENDADA)** | Preserva a semântica do denominador e a auditoria. Custo: `actions/cases/delete-case.ts` precisa traduzir o `23503` numa mensagem PT-BR |

**Tarefa obrigatória que o plano deve incluir** (precedente exato: o mapeamento de `23P01` → mensagem amigável dos actions de `appointments`, Fase 7):

```ts
// actions/cases/delete-case.ts — mapear a violação de FK
if (message.includes("23503") || message.includes("financial_entries")) {
  return {
    ok: false,
    error: "Este caso tem lançamentos financeiros. Anule os lançamentos em Ganhos antes de excluir o caso.",
  }
}
```

**Sinal de alerta:** se o plano não tocar `actions/cases/delete-case.ts`, este pitfall está ativo.

### Pitfall 2 — `case_id` de outro médico chegando do cliente (IDOR)

**O que dá errado:** o `caseId` vem do browser. Sem validação, um lançamento é gravado apontando para o caso de outro médico.
**Por que acontece:** a RLS de `financial_entries` valida `profile_id` (que o servidor estampa), **não** `case_id`.
**Como evitar:** o action valida a posse do caso **antes** do insert, com a resolução `profile_id → authenticated_users.phone → cases.user_phone` (mesmo caminho de `update-case-status.ts`), e devolve `{ ok:false, error:"Caso inválido para este perfil." }` caso contrário. Segunda linha de defesa: o `select` de exibição faz join `cases(...)` e a RLS de `cases` nega linha alheia.
**Sinal de alerta:** um action que confia no `caseId` do cliente sem nenhuma leitura de `cases` antes do insert.

### Pitfall 3 — O `select` hardcoded de `get-authenticated-user.ts`

**O que dá errado:** `consultation_price_cents` é adicionada à tabela, ao tipo e ao form, mas o diálogo de encerramento abre sempre com o campo vazio.
**Por que acontece:** `modules/supabase/get-authenticated-user.ts` lista colunas numa **string literal**; coluna não listada = `undefined` em runtime, e TypeScript não reclama porque há `as AuthenticatedUserProfile`.
**Como evitar:** adicionar `consultation_price_cents` naquela string.
**Sinal de alerta:** o preço salva em Perfil, some ao recarregar, e não há erro em lugar nenhum.

### Pitfall 4 — Fuso: "hoje" derivado em UTC

**O que dá errado:** entre 21h e 00h de Brasília, `new Date().toISOString().slice(0,10)` já é o dia seguinte (Vercel roda em UTC). O lançamento cai no bucket errado e o card "Hoje" mostra R$ 0,00 depois das 21h.
**Como evitar:** derivar sempre com `format(now, "yyyy-MM-dd", { in: tz(CLINIC_TIME_ZONE) })` — no RSC, para `p_today` e para o default do campo de data.
**Sinal de alerta:** qualquer `toISOString()` ou `new Date(iso)` cru perto de data nesta fase. `lib/schemas/patient-measurement.ts` já documenta esse mesmo bug ("never `new Date(iso)` raw — that parses as UTC and drifts across timezones, Pitfall 4").

### Pitfall 5 — Painel não atualiza depois de anular

**O que dá errado:** `voidFinancialEntryAction` chama `revalidatePath("/dashboard/earnings")`, mas a linha continua na tela.
**Por que acontece:** documentado no quick `260724-ojm` — `revalidatePath` invalida o cache do servidor, e quando o client component apenas `await` a action, **o RSC da página atual não re-renderiza**. `next.config.ts` tem `cacheComponents: true`, o que agrava.
**Como evitar:** `router.refresh()` no client depois de cada action bem-sucedida (inclusive dentro do `onClick` do "Desfazer").
**Sinal de alerta:** só funciona com F5.

### Pitfall 6 — Migration não aplicada ao banco vivo

**O que dá errado:** o código faz `.from("financial_entries")` e a tabela não existe em produção.
**Por que acontece:** aplicar migration é passo humano neste repo. O SUMMARY do quick `260724-jka` registra literalmente *"colunas reason/type em appointments (**migration não aplicada**)"* — já aconteceu.
**Como evitar:** o plano da migration termina em `checkpoint:human-verify` **[BLOCKING]**, exatamente como a Fase 6/7 fizeram (ROADMAP: *"checkpoint de push da migração"*, *"checkpoint [BLOCKING] de push da migração"*). Nenhum plano de código roda antes.
**Sinal de alerta:** um plano que cria migration e código no mesmo wave sem checkpoint no meio.

### Pitfall 7 — Média divergindo do total na tela

**O que dá errado:** a média exibida não fecha com o total exibido.
**Por que acontece:** a UI recalculou (`total/n` em JS), ou somou médias por bucket, ou arredondou reais antes de somar.
**Como evitar:** exibir `average_cents` e `period_cents` como vieram do SQL; nenhuma aritmética de dinheiro em JS além de `/100` para formatar.
**Sinal de alerta:** qualquer `/` ou `reduce((a,b)=>a+b)` sobre valores monetários num componente.

### Pitfall 8 — `Popover` + `Dialog` aninhados

**O que dá errado:** o diálogo de lançamento abre dentro do `Popover` de "Ações" (`case-detail-header-toolbar.tsx:41`) e é cortado, ou fecha junto com o popover, ou perde foco.
**Por que acontece:** `CaseDetailActions` é renderizado dentro de `<PopoverContent className="w-64 p-2">`; portais aninhados de Radix brigam por foco.
**Como evitar:** fechar o popover antes de abrir o `Dialog` (estado controlado), ou renderizar o diálogo fora da árvore do popover. **Requer checkpoint visual** — não é verificável por typecheck.
**Sinal de alerta:** o diálogo aparece com 256px de largura.

## Code Examples

### Módulo de listagem com o default seguro de `voided_at` (D-21)

```ts
// modules/financial-entries/list-financial-entries.ts
import type { SupabaseClient } from "@supabase/supabase-js"
import type { FinancialEntry } from "./types"

const ENTRY_SELECT =
  "id, case_id, description, amount_cents, payment_method, received_on, voided_at, created_at, case:cases(id, patient:patients(id, name))"

/**
 * Lista os lançamentos do período para um perfil, mais recentes primeiro.
 * `includeVoided` default FALSE (D-21): anulados ficam escondidos atrás do
 * filtro "mostrar anulados" — nenhum caller vê anulado por acidente.
 * Escopo por profile_id (C-8), meio-aberto [from, to).
 */
export async function listFinancialEntries(
  supabase: SupabaseClient,
  profileId: string,
  params: { from: string; to: string; includeVoided?: boolean },
): Promise<FinancialEntry[]> {
  let query = supabase
    .from("financial_entries")
    .select(ENTRY_SELECT)
    .eq("profile_id", profileId)
    .gte("received_on", params.from)
    .lt("received_on", params.to)
    .order("received_on", { ascending: false })
    .order("created_at", { ascending: false })

  if (!params.includeVoided) query = query.is("voided_at", null)

  const { data, error } = await query
  if (error) throw new Error(`[EARNINGS] Failed to list entries: ${error.message}`)
  return (data ?? []) as FinancialEntry[]
}
```

### Anulação escopada (backstop IDOR, molde `delete-measurement.ts`)

```ts
// modules/financial-entries/void-financial-entry.ts
/**
 * Marca um lançamento como anulado (D-19: voided_at, nunca delete).
 * Escopado por id + profile_id — nunca por id sozinho (guarda de IDOR).
 * Idempotente por `.is("voided_at", null)`: anular duas vezes não muda o timestamp.
 */
export async function voidFinancialEntry(
  supabase: SupabaseClient,
  entryId: string,
  profileId: string,
): Promise<void> {
  const { error } = await supabase
    .from("financial_entries")
    .update({ voided_at: new Date().toISOString() })
    .eq("id", entryId)
    .eq("profile_id", profileId)
    .is("voided_at", null)

  if (error) throw new Error(`[EARNINGS] Failed to void entry: ${error.message}`)
}
```

### Action do lançamento no encerramento (gate + Zod + snapshot)

```ts
// actions/financial-entries/create-case-financial-entries.ts
"use server"
// Molde: actions/availability/save-availability.ts (gate + safeParse + union)

export async function createCaseFinancialEntriesAction(
  input: CreateCaseFinancialEntriesInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  const parsed = createCaseFinancialEntriesSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }

  try {
    // (1) posse do caso (Pitfall 2) — mesma âncora de updateCaseStatus
    await assertCaseBelongsToProfile(supabase, parsed.data.caseId, profile.id)

    // (2) guarda D-10 revalidada server-side: o cliente pode ter a tela velha
    const existing = await countNonVoidedEntriesForCase(supabase, parsed.data.caseId, profile.id)
    if (existing > 0) return { ok: false, error: "Este caso já tem lançamento." }

    // (3) SNAPSHOT (D-05): rótulo + centavos lidos AGORA do catálogo/perfil,
    //     nunca aceitos do cliente — o cliente só manda QUAIS procedimentos.
    const rows = await buildEntryRows(supabase, profile.id, parsed.data)

    // (4) UM insert multi-row = atômico (Achado 6)
    await createFinancialEntries(supabase, rows)

    revalidatePath("/dashboard/earnings")
    revalidatePath(`/dashboard/cases/${parsed.data.caseId}`)
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Erro ao registrar lançamento. Tente novamente.",
    }
  }
}
```

**Ponto de segurança do passo (3):** o **valor** dos procedimentos é lido do catálogo no servidor, não recebido do cliente. Se o cliente mandasse `amount_cents`, ele escolheria seu próprio faturamento — e, mais sutil, os números deixariam de ser um snapshot confiável do catálogo. A **única** exceção é o valor da consulta, que o diálogo permite ajustar (D-03 diz "valor padrão") — esse sim vem validado do input, com `check (amount_cents > 0)` e teto no Zod.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tabela nova sem RLS, escopo só no código | RLS + policies **na mesma migration** + `.eq("profile_id")` no código | 2026-06-04 (`20260604000*`) | Obrigatório aqui (D-23, `.planning/STATE.md`: *"RLS é AGORA a norma"*) |
| `text` + `CHECK` para domínio fechado | pg enum + espelho Zod | Fase 7 (`appointment_status`) | Forma de pagamento é enum |
| Multi-write não transacional em 3 round-trips | RPC plpgsql quando há **de fato** múltiplos statements | `20260722100000` (CR-02) | Aqui **não** se aplica: é 1 statement (Achado 6) |
| `await action()` e esperar o RSC atualizar | `await action()` **+** `router.refresh()` | quick `260724-ojm` | Todo action desta fase chamado do client |
| Semana derivada com aritmética de `getDay()` | `date_trunc('week')` / `startOfWeek(..., weekStartsOn: 1)` | Fase 6 (D-11) | Segunda-feira sem código |

**Deprecated/outdated nesta fase:**
- **`appointment_id` no lançamento** — removido por DV-1/D-01. O comentário de `20260722200000_appointments.sql` (*"patient_id usa ON DELETE RESTRICT … para preservar o histórico de consultas que a Fase 10 (ganhos -> consulta FK) vai referenciar"*) ficou **obsoleto**: a Fase 10 não referencia `appointments`. O `RESTRICT` daquele FK permanece por outros motivos; não desfazer, apenas não se apoiar naquele comentário.
- **`.planning/STATE.md` § Accumulated Context, linha ~87** — *"Média de ganhos = total ÷ TODOS os lançamentos do período"* está **superado por DV-2/D-17**. `ROADMAP.md` e `REQUIREMENTS.md` já foram emendados em 2026-08-21; **`STATE.md` não**. Um agente que leia só o STATE implementa a fórmula errada. **O plano deve incluir a emenda dessa linha.**
- **`.planning/STATE.md` § Roadmap table, linha ~44** — *"10 | … | ortogonal; depende só da FK de consulta (Phase 7)"* também está superado (DV-1: zero dependência da Phase 7).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A janela default do toast do `sonner` v2 é ~4000 ms (nenhum `duration` explícito existe no repo) | Padrão 4 / Achado 5 | Baixo — a recomendação é justamente passar `duration: 8000` explícito, o que torna o default irrelevante |
| A2 | O nome `financial_entries` é o preferido (aparece em `.planning/STATE.md` § Pending Todos, não em código) | Padrão 1 | Baixo — renomear antes da migration é trivial; depois exige migration de rename |
| A3 | `/dashboard/earnings` (segmento em inglês) é preferível a `/dashboard/ganhos` | Achado extra | Baixo — decisão de gosto; o repo usa segmentos em inglês com UI PT-BR, exceto `agenda` |
| A4 | O médico prefere valor da consulta **editável** no diálogo e preços de procedimento **fixos** do catálogo | Padrão 3 / Code Examples | Médio — se ele quiser ajustar procedimento também, muda o form e o passo de snapshot (mas não o schema) |
| A5 | Cards "hoje/semana/mês" são relativos a **hoje**, independentes do mês navegado | Padrão 2 | Médio — se devem seguir o período navegado, a função SQL simplifica (uma CTE menos), mas os cards ficam sem sentido ao navegar meses passados |
| A6 | `on delete restrict` em `case_id` (com mensagem PT-BR no delete de caso) é preferível a `set null` | Pitfall 1 | **Alto** — é a única recomendação que **altera um arquivo de outro domínio** (`actions/cases/delete-case.ts`). Se o usuário preferir `set null`, o diff encolhe e o risco vira "média histórica muda ao excluir caso" |
| A7 | Não haverá `AT TIME ZONE` no SQL (contra a letra de SC-3), porque `received_on` é `date` | Achado 3 | **Alto** — mesmo outcome, mecanismo diferente do texto do roadmap. Precisa aparecer no plano para não reprovar na verificação |
| A8 | Não criar policy de DELETE em `financial_entries` (assimetria deliberada vs as outras tabelas) | Achado 5 | Baixo — se incomodar, criar a policy custa 6 linhas; a garantia é que se perde |
| A9 | O catálogo de procedimentos **não** precisa de `unique (profile_id, lower(name))` | Achado 8 | Baixo — `exam_catalog_items` também não tem; duplicata é irritante, não corruptora |

## Open Questions

1. **`on delete restrict` vs `set null` em `case_id` (A6) — pede aval do usuário.**
   - O que sabemos: `restrict` preserva o denominador e a auditoria, e exige tocar `actions/cases/delete-case.ts` para traduzir o `23503`. `set null` é diff menor e altera silenciosamente médias históricas quando um caso é excluído.
   - O que não está claro: com que frequência o médico realmente exclui casos.
   - Recomendação: ir com `restrict` + mensagem PT-BR; é a escolha correta para dinheiro. Levantar em `/gsd-discuss-phase` se o planner quiser confirmar antes.

2. **Cards relativos a "hoje" ou ao período navegado (A5).**
   - O que sabemos: D-15 pede "cards de totais (hoje / semana / mês)" e D-16 diz que o painel abre no mês atual — na abertura, as duas leituras coincidem. Só divergem ao navegar meses.
   - Recomendação: cards sempre relativos a hoje; o gráfico, a lista e a média seguem o período navegado. Deixar isso escrito na UI ("Hoje", "Esta semana", "Este mês" vs "Período").

3. **O diálogo é um passo dentro do `AlertDialog` de "Encerrar caso" ou um `Dialog` seguinte (discricionário em CONTEXT).**
   - Recomendação: **`Dialog` seguinte**. O `AlertDialog` existente é uma confirmação sim/não e reaproveitá-lo como formulário quebra a semântica de alerta (e o a11y do Radix). Além disso, um `Dialog` separado mantém `updateCaseStatusAction` desacoplado (D-06 e o "efeito colateral"). Ver Pitfall 8 quanto ao Popover.

4. **A pequena assimetria de gate no Perfil.**
   - O que sabemos: `actions/profile/update-profile.ts` **não** tem gate `paid` (deliberado: é onde a conta é concluída). O "Valor da Consulta" viaja nesse action; o catálogo tem actions próprios (com gate).
   - Recomendação: manter. Documentar em comentário. SC-4 fala de "leitura/escrita/anulação" **de lançamentos** — o preço no perfil é configuração, não lançamento.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build, `yarn test`, `tsc` | ✓ | v24.18.0 | — |
| Yarn 1.x (Classic) | pinado em `packageManager` | ✓ | 1.22.22 | nenhum (yarn-only por commit `556f6b8`) |
| Supabase CLI | aplicar migrations | ✓ | 2.104.0 (`/opt/homebrew/bin/supabase`) | painel do Supabase / MCP `apply_migration` |
| Postgres do projeto Supabase | tabelas, enum, função de agregação | ✓ (remoto, não verificado nesta sessão) | — | — |
| `psql` / Postgres local | testar o SQL antes de aplicar | ✗ | — | `supabase start` (stack local em Docker) ou aplicar em staging |
| Docker | `supabase start` | ✗ (não encontrado no PATH) | — | validar o SQL direto no projeto remoto, via checkpoint humano |
| `tsx` + `node:test` | os `*.spec.ts` de ownership e de `parseBrlToCents` | ✓ | `tsx` ^4.21.0 (devDep); `yarn test` = `find modules lib -name '*.spec.ts' \| xargs tsx --test` | — |

**Missing dependencies with no fallback:** nenhuma.

**Missing dependencies with fallback:**
- **Sem Postgres local / sem Docker** → a função `get_earnings_summary` não pode ser exercitada localmente antes de subir. Mitigação obrigatória: o plano da migration termina em **`checkpoint:human-verify` [BLOCKING]** que inclui rodar a função uma vez com dados reais e conferir os 4 números (hoje/semana/mês/média) contra uma conta manual. Precedente: Fases 6 e 7 usaram exatamente esse checkpoint de push de migration.
- **Aplicação de migration é passo humano** (ver Pitfall 6) — o quick `260724-jka` deixou uma migration não aplicada, então o checkpoint deve exigir confirmação explícita de "aplicada", não só "escrita".

## Security Domain

`workflow.security_enforcement: true`, `security_asvs_level: 1` `[VERIFIED: .planning/config.json]`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | não (indireto) | Supabase Auth já existente; a fase só consome `getAuthenticatedUser` |
| V3 Session Management | não | Cookie-based SSR via `@supabase/ssr`, inalterado |
| V4 Access Control | **sim (central)** | RLS âncora `profile_id` (3 policies) + `.eq("profile_id")` em **todo** read/write/void + `.eq("id")` junto (backstop IDOR) + gate `paid` no action e no RSC + validação de posse do `case_id` no action + `security invoker` na função SQL com owner-check por `auth.uid()` |
| V5 Input Validation | **sim** | Zod `safeParse` no boundary de todos os actions; `paymentMethodSchema` espelhando o pg enum; `parseBrlToCents` + teto/`> 0`; CHECK constraints (`amount_cents > 0`, descrição não-vazia, `price_cents >= 0`) como última linha |
| V6 Cryptography | não | Nenhum segredo, nenhum hash, nenhum dado criptografado nesta fase |
| V7 Error Handling / Logging | **sim** | Módulo lança `[EARNINGS] …`; action converte em union; `getFriendlyToastMessage` remove a tag antes do toast — erro cru de banco nunca chega ao cliente. `voided_at` + `created_at`/`updated_at` são o log de auditoria (D-19) |
| V8 Data Protection | **sim (LGPD)** | O lançamento **não** grava nome/dado do paciente — só `case_id` e o rótulo do procedimento. O nome vem por join sob RLS. Ganhos são exclusivos do médico dono (o assento da assistente é deferred e **não** deve ser preparado aqui) |
| V12 Files | não | Sem upload/download nesta fase (export é deferred) |
| V13 API | **sim** | Só Server Actions (nenhum route handler novo). `revoke all … from public; grant execute … to authenticated` na função SQL, igual `save_availability` |

### Known Threat Patterns for Next 16 + Supabase (Postgres/RLS) + dinheiro

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR em `entryId` na anulação (anular lançamento de outro médico) | Elevation of Privilege | `.eq("id", entryId).eq("profile_id", profileId)` — nunca `id` sozinho; RLS como 2ª camada; **spec test dedicado** (molde `delete-measurement.spec.ts`) |
| IDOR em `caseId` no lançamento (faturar sobre caso alheio) | Tampering | Validação de posse do caso no action antes do insert (Pitfall 2) |
| Cliente ditando `amount_cents` de procedimento | Tampering | Snapshot lido do catálogo **no servidor**; o cliente só manda ids de procedimento |
| Bypass do gate `paid` via leitura direta PostgREST | Elevation of Privilege | RLS `to authenticated` **não** impõe assinatura — o gate `paid` fica no action **e** no RSC (`redirect`). Documentado no comentário de `appointments` e replicado aqui |
| SQL injection na função de agregação | Tampering | Função `language sql` **sem** SQL dinâmico; parâmetros tipados (`uuid`, `date`); `set search_path = ''` + nomes totalmente qualificados (evita sequestro de `search_path`; o advisor `function_search_path_mutable` do Supabase cobra isso) |
| Repúdio de valor lançado ("não fui eu / não foi isso") | Repudiation | `voided_at` + `created_at`/`updated_at`; **sem DELETE** e sem edição de valor (D-19) — a trilha é imutável por construção |
| Overflow / valor absurdo (`999999999999`) | Denial of Service / Tampering | `integer` (teto ~R$ 21,4 mi/linha) + `check (amount_cents > 0)` + teto no Zod; `sum(integer)` → `bigint` no total |
| Enumeração por mensagem de erro ("caso não existe" vs "não é seu") | Information Disclosure | Uma única mensagem PT-BR neutra para os dois casos: "Caso inválido para este perfil." (padrão já usado em `create-dashboard-case-with-patient.ts`) |
| Vazamento de ganhos para o assento da assistente (Fase 8/9) | Information Disclosure | Fora de escopo aqui, **mas**: a âncora simples `profile_id` + zero policy baseada em membership significa que o assento **não** alcança esta tabela por default. Não adicionar nada "preparatório" — o default é o correto |

**Teste de ownership exigido por SC-4** (o repo já tem o molde exato — `modules/patient-growth/delete-measurement.spec.ts` monta um mock de `SupabaseClient` que grava as chamadas `.eq()` e afirma o escopo). Mínimo:
- `voidFinancialEntry` filtra por `id` **e** `profile_id`;
- `listFinancialEntries` aplica `.is("voided_at", null)` quando `includeVoided` é omitido;
- `countNonVoidedEntriesForCase` filtra por `profile_id`, `case_id` e `voided_at is null`;
- `parseBrlToCents` converte `"150,00"`, `"1.500,50"`, `"0,01"` corretamente e rejeita `"abc"`/`""`.

## Sources

### Primary (HIGH confidence) — código e artefatos deste repositório, lidos nesta sessão

- `supabase/migrations/20260604000003_rls_cases.sql` — âncora dupla `profile_id OR user_phone`, e o porquê (`cases.profile_id` nullable)
- `supabase/migrations/20260710020400_exam_catalog_items.sql` — molde do catálogo per-profile (tabela + índice + comment + trigger + 4 policies num arquivo)
- `supabase/migrations/20260722100000_save_availability_rpc.sql` — molde de função: `security invoker`, `set search_path = ''`, owner-check por `auth.uid()`, `revoke`/`grant`
- `supabase/migrations/20260722200000_appointments.sql` + `20260724210000_appointment_reason_type.sql` — molde de migration comentada com pg enum + RLS; convenção "valores em inglês, rótulos PT-BR"; nota de que RLS não impõe `paid`
- `supabase/migrations/20260709000000_patient_measurements.sql` — molde de coluna inteira em unidade-base (grama/mm) + CHECK + trigger
- `supabase/migrations/20260316020000_profiles_add_default_location_state_and_city.sql` — molde de `alter table public.profiles add column … + comment`
- `modules/cases/{update-case-status,get-case-row-for-profile,get-cases-by-profile-id,create-dashboard-case-with-patient,delete-case,get-case-by-id,types}.ts` — âncoras reais de posse, reset de cronômetro no reopen
- `modules/supabase/get-authenticated-user.ts` — o `.select()` hardcoded de colunas (Pitfall 3)
- `modules/patient-growth/{create-measurement,delete-measurement.spec}.ts` — conversão de unidade no action; molde do teste de ownership
- `modules/{profiles,exam-catalog}/*` — onde o preço entra; molde de módulo de catálogo
- `actions/{availability/save-availability,cases/update-case-status,profile/update-profile}.ts` — gate, `safeParse`, union, `revalidatePath`; ausência deliberada de gate no Perfil
- `components/dashboard/agenda/calendar-editor.tsx` (~902, ~996) — toast "Desfazer" como segunda chamada de action
- `components/dashboard/patients/growth/{growth-chart,measurement-form}.tsx` — uso concreto de recharts 3.9.0 + inputs `inputMode="decimal"` e máscara de data
- `components/dashboard/cases/{case-detail-actions,case-detail-header-toolbar}.tsx` — ponto de enxerto e o aninhamento em `Popover`
- `components/{app-sidebar,ui/sonner}.tsx` — shape do `navMain`; `toastOptions` sem `duration`
- `lib/{clinic-timezone,formatters,parsers,brazilian-date-form,schemas/{profile,appointment,patient-measurement}}.ts` — fuso, formatadores existentes (nenhum monetário), parse de data BR, espelho Zod de enum
- `app/dashboard/{agenda,profile}/page.tsx` — gate no RSC + janela com `tz(CLINIC_TIME_ZONE)`
- `package.json` — versões exatas; `git show 4475d4d`, `git show --stat 71bfa06`; `ls app/dashboard`; `grep -rli "earning|ganhos|voided"`
- `.planning/{ROADMAP,REQUIREMENTS,STATE,config}.json/.md` + `10-CONTEXT.md`; `.planning/quick/260724-ojm*/SUMMARY.md` (o achado do `router.refresh()`)

### Secondary (MEDIUM confidence) — documentação oficial

- `[CITED: https://www.postgresql.org/docs/current/functions-datetime.html]` — `date_trunc` aceita `timestamp`/`timestamptz`/`interval`, promove `date` a `timestamp` automaticamente; `week` = semana ISO 8601, que começa na segunda; semântica de `AT TIME ZONE`
- `[CITED: https://www.postgresql.org/docs/current/sql-altertype.html]` — `ALTER TYPE … ADD VALUE` dentro de bloco de transação: o valor novo não pode ser usado até o commit

### Tertiary (LOW confidence)

- Default de duração do toast do `sonner` (~4000 ms) — **não** verificado em docs nesta sessão; ver A1. A recomendação (`duration` explícito) neutraliza a dúvida.

*Nota de proveniência: o seam `classify-confidence --provider webfetch` devolve `LOW` genericamente por provedor. As duas linhas acima são de `postgresql.org` (documentação oficial do produto) e estão tagueadas `[CITED]` conforme a regra de proveniência, não pelo tier do provedor.*

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — zero pacote novo; todas as versões lidas de `package.json` local e todos os usos verificados em código de produção
- Architecture / schema / RLS: **HIGH** — cada decisão ancorada num molde de migration existente e lido; a única escolha original (âncora simples + `description NOT NULL`) está justificada contra os caminhos de leitura reais do domínio `cases`
- Agregação / fuso / média: **HIGH** — semântica de `date_trunc` e semana ISO confirmada na doc oficial; a expressão SQL foi escrita inteira e revisada contra DV-2. **Não executada** (sem Postgres local) → daí o checkpoint [BLOCKING]
- Pitfalls: **HIGH** — 6 dos 8 vêm de achados registrados no próprio repo (comentários de migration, SUMMARY de quick tasks, comentários de schema Zod)
- Decisões discricionárias de UI/nome: **MEDIUM** — ver Assumptions Log A2–A5
- `on delete restrict` + janela do "Desfazer": **MEDIUM** — recomendação técnica sólida, mas A6 toca outro domínio e A1 não foi verificado em docs

**Research date:** 2026-08-21
**Valid until:** 2026-09-20 (30 dias — stack estável, pinada, e nenhuma dependência externa nova). Se `recharts`, `sonner` ou a versão do Postgres do Supabase mudarem de major antes disso, revalidar apenas o Padrão 4 e o Padrão 6.
