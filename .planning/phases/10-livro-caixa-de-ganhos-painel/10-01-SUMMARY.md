---
phase: 10-livro-caixa-de-ganhos-painel
plan: 01
subsystem: database
tags: [postgres, supabase, rls, migrations, plpgsql, jsonb, date_trunc, enum, partial-index]

requires:
  - phase: 04-cases
    provides: "public.cases (a âncora do lançamento) e a RLS de âncora dupla que serve de contraste"
  - phase: 07-agenda-consultas
    provides: "supabase/migrations/20260722200000_appointments.sql — o precedente escrito de `on delete restrict` que decidiu D-26"
provides:
  - "public.procedure_catalog_items — catálogo de procedimentos por perfil com price_cents em centavos inteiros, RLS com 4 policies"
  - "public.profiles.consultation_price_cents — valor padrão da consulta, nullable, com constraint de não-negativo"
  - "public.payment_method — pg enum (pix, cash, card, insurance)"
  - "public.financial_entries — livro-caixa de entrada, snapshot de rótulo + centavos, voided_at, 3 policies e NENHUMA de DELETE"
  - "public.get_earnings_summary(uuid, date, date, date) — agregação jsonb: cards hoje/semana/mês, total e média do período, série by_day"
  - "Dois índices parciais que embutem o filtro de anulados no próprio índice"
affects: [10-02, 10-03, 10-04, 10-05]

tech-stack:
  added: []
  patterns:
    - "RLS de âncora SIMPLES por profile_id para dados de dinheiro (contraste deliberado com a âncora dupla de public.cases)"
    - "Ausência de policy como garantia de segurança: sem policy de DELETE, a RLS nega DELETE por default"
    - "Índice parcial com o predicado de negócio dentro dele (where voided_at is null)"
    - "Agregação de painel numa única função SQL stable/security invoker que devolve jsonb — um round-trip, um snapshot"
    - "received_on como `date` para eliminar conversão de fuso e DST da agregação"

key-files:
  created:
    - supabase/migrations/20260821000000_procedure_catalog_and_prices.sql
    - supabase/migrations/20260821000100_financial_entries.sql
    - .planning/phases/10-livro-caixa-de-ganhos-painel/deferred-items.md
  modified: []

key-decisions:
  - "D-26 REVISADA no checkpoint: financial_entries.case_id usa `on delete restrict`, não `cascade` — o banco passa a ser a barreira contra apagar faturamento, alinhando com o precedente de appointments.sql e com a letra de D-19"
  - "D-01, D-05 e D-19 ratificadas como escritas (sem coluna de agendamento; snapshot de preço; anular em vez de apagar)"
  - "O segundo índice parcial usa `where voided_at is null and case_id is not null` (ordem invertida em relação ao rascunho do RESEARCH) — semântica idêntica, e é a ordem que o critério de aceite do plano conta"
  - "As migrations foram aplicadas via Supabase MCP apply_migration, não via `supabase db push`"

patterns-established:
  - "Prosa de migration em comentários `--` de coluna 0, nunca blocos /* */: os critérios de aceite contam ocorrências sobre `grep -v '^--'`, e um comentário de bloco escaparia do filtro"
  - "Superfície de segurança que a RLS NÃO cobre é declarada em voz alta no comentário da migration (o case_id vindo do cliente é IDOR que a action tem de fechar)"

requirements-completed: [EARN-01, EARN-02, EARN-03, EARN-04, EARN-05]

coverage:
  - id: D1
    description: "procedure_catalog_items com price_cents em centavos inteiros, constraints de preço/nome, trigger de updated_at e 4 policies owner-scoped"
    requirement: EARN-01
    verification:
      - kind: integration
        ref: "supabase MCP: pg_policies count=4 + relrowsecurity=true em procedure_catalog_items (schema vivo)"
        status: pass
      - kind: other
        ref: "grep -v '^--' 20260821000000_procedure_catalog_and_prices.sql | grep -c 'create policy' == 4; auth_user_id anchors == 5; tipos monetários/float == 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "profiles.consultation_price_cents nullable com constraint de não-negativo"
    requirement: EARN-01
    verification:
      - kind: integration
        ref: "supabase MCP: coluna consultation_price_cents presente em public.profiles (schema vivo)"
        status: pass
    human_judgment: false
  - id: D3
    description: "enum payment_method (pix, cash, card, insurance) com rótulos PT-BR delegados à UI"
    requirement: EARN-01
    verification:
      - kind: integration
        ref: "supabase MCP: enum payment_method = {pix,cash,card,insurance} na ordem declarada (schema vivo)"
        status: pass
    human_judgment: false
  - id: D4
    description: "financial_entries: case_id nullable sem unique (avulso + N linhas por caso), snapshot de rótulo e centavos, FK com on delete restrict"
    requirement: EARN-02
    verification:
      - kind: integration
        ref: "supabase MCP: pg_constraint confdeltype='r' em financial_entries_case_id_fkey (RESTRICT confirmado no schema vivo)"
        status: pass
      - kind: integration
        ref: "supabase MCP: delete no caso pai -> ERROR 23503 financial_entries_case_id_fkey"
        status: pass
    human_judgment: false
  - id: D5
    description: "get_earnings_summary devolve cards hoje/semana/mês independentes do período navegado, total e série by_day, com janela meio-aberta"
    requirement: EARN-03
    verification:
      - kind: integration
        ref: "smoke test 3 linhas: today=week=month=period=35000, by_day 1 entrada; com p_to=today period=0 e by_day=[] enquanto os cards seguiram 23000"
        status: pass
      - kind: integration
        ref: "período vazio (2020): todos os escalares 0 e by_day=[] (não null)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Média = total ÷ (casos distintos + avulsos) com arredondamento único"
    requirement: EARN-04
    verification:
      - kind: integration
        ref: "smoke test: 2 linhas no mesmo case_id + 1 avulso -> attendances=2 (não 3), average_cents=17500=round(35000/2)"
        status: pass
      - kind: other
        ref: "grep -v '^--' 20260821000100_financial_entries.sql | grep -c 'round(' == 1"
        status: pass
    human_judgment: false
  - id: D7
    description: "Anulação por voided_at sem apagar; DELETE negado pela ausência de policy; escopo profile_id em toda leitura"
    requirement: EARN-05
    verification:
      - kind: integration
        ref: "supabase MCP: 0 policies de DELETE em financial_entries; delete como role authenticated com JWT real -> 0 linhas afetadas"
        status: pass
      - kind: integration
        ref: "anular o avulso de 12000 -> period 23000, attendances 1, average 23000, sem mudança de código"
        status: pass
    human_judgment: false
  - id: D8
    description: "Endurecimento de search_path da função de agregação"
    verification:
      - kind: integration
        ref: "supabase MCP: prosecdef=false (INVOKER), provolatile='s' (STABLE), proconfig=search_path=\"\"; Advisors não listam get_earnings_summary em function_search_path_mutable"
        status: pass
    human_judgment: false

duration: 34min
completed: 2026-08-21
status: complete
---

# Phase 10 Plan 01: Schema do Livro-Caixa Summary

**Schema completo do livro-caixa aplicado ao banco vivo: catálogo de procedimentos com preço, `financial_entries` com RLS de âncora simples e zero policy de DELETE, e a agregação `get_earnings_summary` em jsonb com arredondamento único — com D-26 revertida de `cascade` para `restrict`, pondo o banco (e não uma string de UI) como barreira contra apagar faturamento.**

## Performance

- **Duration:** ~34 min (incluindo dois checkpoints bloqueantes)
- **Tasks:** 2 de implementação + 2 checkpoints resolvidos
- **Files modified:** 3 criados (2 migrations + 1 registro de deviation)

## Accomplishments

- **`public.financial_entries` existe e é imutável por construção.** Snapshot de rótulo e centavos (D-05), `case_id` nullable e sem unique (D-02/D-08), `voided_at` para anular, e a segurança mais barata da fase: **nenhuma policy de DELETE**, então a RLS nega a operação por default. Confirmado no banco vivo — `delete` como role `authenticated` com JWT real afeta 0 linhas.
- **RLS de âncora simples, com a lacuna declarada em voz alta.** As 3 policies ancoram só em `profile_id` (contraste deliberado com a âncora dupla de `public.cases`, que existe porque `cases.profile_id` é nullable). Como a policy nunca olha para `cases`, o comentário da migration declara que o `case_id` vindo do cliente é uma **superfície de IDOR que a action de `10-04` tem de fechar** — a lacuna está escrita onde o próximo executor vai tropeçar nela.
- **`get_earnings_summary` entrega os 4 números de um único snapshot.** `stable` + `security invoker` + `search_path` vazio + nomes qualificados. Cards hoje/semana/mês relativos a `p_today` e independentes do período navegado; janela meio-aberta `[p_from, p_to)`; um único `round` em precisão arbitrária; `by_day` sempre array, nunca null.
- **A média conta atendimentos, não linhas.** `count(distinct case_id) + count(*) filter (where case_id is null)` — provado no banco: 2 linhas no mesmo caso + 1 avulso dão `attendances = 2`, não 3.
- **Zero conversão de fuso na agregação.** `received_on` é `date`, então `date_trunc` já devolve o bucket local — sem `AT TIME ZONE`, sem risco de DST, sem depender do `TimeZone` da sessão. O único fuso da feature fica no RSC (`10-02`).
- **Catálogo de procedimentos + valor da consulta prontos** para o plano `10-02` consumir. `price_cents >= 0` (procedimento gratuito é catalogável) e `consultation_price_cents` nullable (`NULL` = ainda não configurado, não zero).

## Task Commits

1. **Checkpoint: ratificar D-01/D-05/D-19/D-26** — resolvido pelo usuário com `revisar-d26`
2. **Task 1: Migration do catálogo + valor da consulta** — `e094e21` (feat)
3. **Task 2: Migration financial_entries + get_earnings_summary** — `f2e01a4` (feat)
4. **Registro da deviation D-26 e follow-ups** — `4227d6d` (docs)
5. **[BLOCKING] Checkpoint: aplicar ao banco vivo + smoke test** — resolvido com "aplicada"

## Files Created/Modified

- `supabase/migrations/20260821000000_procedure_catalog_and_prices.sql` — `procedure_catalog_items` (tabela, índice, trigger de `updated_at` nomeado por tabela, RLS + 4 policies) e `profiles.consultation_price_cents` com constraint e comentário
- `supabase/migrations/20260821000100_financial_entries.sql` — enum `payment_method`, tabela `financial_entries`, 2 índices parciais, trigger, RLS + 3 policies, função `get_earnings_summary` com `revoke`/`grant`
- `.planning/phases/10-livro-caixa-de-ganhos-painel/deferred-items.md` — registro durável de D-26 revisada e dos dois follow-ups que ela cria

## Decisions Made

- **D-26 revisada: `on delete restrict`.** O usuário reabriu a decisão no checkpoint. `restrict` alinha com o precedente escrito do próprio repo (`20260722200000_appointments.sql` escolheu `restrict` em `patient_id` justamente "para preservar o histórico … que a Fase 10 vai referenciar") e com a letra de D-19. Com `cascade`, excluir um caso apagaria faturamento — inclusive de meses já fechados — e a única barreira seria uma string de UI. Com `restrict`, a barreira é o banco: `delete` no caso pai devolve `23503`.
- **D-01, D-05, D-19 ratificadas** sem alteração.
- **O `PLAN.md` não foi reescrito.** A migration + `deferred-items.md` são a fonte da verdade sobre `restrict`; o `10-01-PLAN.md` (incluindo "Desvios Declarados #2", o `<action>` da Task 2 e a linha `T-10-07` do threat model) continua descrevendo `cascade`. Isso foi instrução explícita do coordenador.
- **Prosa de migration em `--` de coluna 0, nunca `/* */`.** Não é estilo por estilo: os critérios de aceite contam `create policy`, `round(`, `for delete` e `appointment` sobre `grep -v '^--'`. Um comentário de bloco escaparia do filtro e invalidaria as contagens. Isso também forçou disciplina de vocabulário nos comentários indentados e nas strings de `comment on …` — nenhum deles pode conter as palavras que as contagens procuram (por isso os comentários dizem "precisão arbitrária" e não a palavra do tipo, e "conversão de fuso" e não a expressão literal).

## Deviations from Plan

### Declared deviation (decisão do usuário no checkpoint)

**1. [Checkpoint decision] `financial_entries.case_id` é `on delete restrict`, não `on delete cascade`**
- **Found during:** Checkpoint 1, antes da Task 2
- **Issue:** O plano especificava `cascade` (D-26). O usuário escolheu `revisar-d26`.
- **Fix:** FK escrita como `on delete restrict`; o comentário de cabeçalho item (e) declara a revisão, cita `20260722200000_appointments.sql` e nomeia o preço a pagar.
- **Files modified:** `supabase/migrations/20260821000100_financial_entries.sql`
- **Verification:** `confdeltype = 'r'` no schema vivo; `delete` no caso pai devolve `23503`.
- **Committed in:** `f2e01a4`, registrado em `4227d6d`

**Follow-ups que `restrict` cria — NÃO feitos aqui (fora de `files_modified` de 10-01), registrados em `deferred-items.md`:**
1. **`actions/cases/delete-case.ts` tem de traduzir o Postgres `23503`** (`foreign_key_violation`) num result union PT-BR. Um caso com lançamento (mesmo anulado) não pode ser apagado, e hoje esse erro vazaria cru. **Plano alvo: `10-04`.**
2. **O S7 de `10-04` está superado: o diálogo destrutivo BLOQUEIA em vez de avisar.** Não faz sentido prometer "excluir caso e N lançamentos" quando o banco vai recusar. Mensagem correta: *"Este caso tem lançamentos no livro-caixa. Anule os lançamentos antes de excluir o caso."*
3. **`T-10-07` muda de `accept` para `mitigate`.** Era "cascade apaga faturamento, mitigado por uma string de UI". Agora a mitigação é estrutural — o banco é a barreira. O threat model do `PLAN.md` não foi reescrito; esta é a disposição vigente.

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Ordem do predicado do segundo índice parcial**
- **Found during:** Task 2 (verificação dos critérios de aceite)
- **Issue:** O rascunho do RESEARCH escreve `where case_id is not null and voided_at is null`. O critério de aceite do plano é `grep -c "where voided_at is null" >= 2`, que essa ordem falha — o rascunho do próprio plano não passaria na própria verificação.
- **Fix:** Predicado reordenado para `where voided_at is null and case_id is not null`. Semântica idêntica: o Postgres prova implicação de predicado para casar índice parcial, independente da ordem dos conjuntos.
- **Files modified:** `supabase/migrations/20260821000100_financial_entries.sql`
- **Verification:** contagem passou a 2; o índice existe no schema vivo (3 índices em `financial_entries`).
- **Committed in:** `f2e01a4`

---

**Total deviations:** 1 declarada por decisão do usuário + 1 auto-fix (Rule 3, blocking)
**Impact on plan:** A revisão de D-26 endurece a fase (o banco protege o faturamento em vez de uma string) ao custo de 2 follow-ups em `10-04`, ambos registrados. O auto-fix é cosmético em SQL e necessário para a verificação fechar. Nenhum scope creep.

## Verification

**Estrutural (consultado do banco VIVO, não dos arquivos):**

| Objeto | Resultado |
| --- | --- |
| `procedure_catalog_items` | 4 policies, RLS habilitada |
| `financial_entries` | 3 policies, **0 policies de DELETE**, RLS habilitada, 3 índices |
| `financial_entries_case_id_fkey` | `confdeltype = 'r'` → **RESTRICT** confirmado |
| `profiles.consultation_price_cents` | existe |
| enum `payment_method` | `{pix, cash, card, insurance}` na ordem declarada |
| `get_earnings_summary` | `prosecdef = false` (INVOKER), `provolatile = 's'` (STABLE), `proconfig = search_path=""` |
| Advisors | `get_earnings_summary` **não** aparece em `function_search_path_mutable` |

**Funcional (3 linhas: 15000 + 8000 no mesmo `case_id`, 12000 avulso, todas `received_on = current_date`):**

| Cenário | Resultado |
| --- | --- |
| Baseline | `today = week = month = period = 35000`; **`attendances = 2` (não 3)** → DV-2 correto; `average_cents = 17500 = round(35000/2)`; `by_day` com 1 entrada |
| Anular o avulso de 12000 | `period 23000`, `attendances 1`, `average 23000` — **sem nenhuma mudança de código** |
| Janela meio-aberta (`p_to = today`) | `period_cents 0`, `by_day []`, enquanto os cards hoje/semana/mês seguiram em 23000 → cards corretamente independentes do período navegado |
| Período vazio (2020) | todos os escalares 0, `by_day = []` (não null) |
| `delete` em `financial_entries` como role `authenticated` com claims de JWT reais | **0 linhas afetadas** (D-19 vale) |
| `delete` no caso pai | **`ERROR 23503 financial_entries_case_id_fkey`** — a barreira do `restrict` funciona |
| Limpeza | `financial_entries` de volta a 0 linhas, o caso intacto |

**Estático:** contagens sobre `grep -v '^--'` fecharam em ambos os arquivos — `create policy` 4 e 3; `for delete` 0; `round(` 1; `appointment` 0; tipos de ponto flutuante e monetários 0; `numeric` aparece uma única vez (o cast da média); `where voided_at is null` 2. Parênteses balanceados e `$$` pareados nos dois arquivos (conferido com o `appointments.sql` como controle). `yarn typecheck` sai em 0 — nenhum arquivo TS foi tocado.

## Issues Encountered

**Duas notas sobre o estado do banco vivo que importam depois:**

1. **As migrations foram aplicadas via Supabase MCP `apply_migration`, não via `supabase db push`.** A *version* registrada difere do timestamp do nome do arquivo — mesmo padrão do histórico de migrations de vacinas, disponibilidade e agendamentos deste repo. **Um `supabase db push` futuro pode não reconhecê-las como já aplicadas: rodar `list_migrations` antes de empurrar.**
2. **As duas novas funções de trigger (`set_updated_at_procedure_catalog_items`, `set_updated_at_financial_entries`) aparecem no advisor `function_search_path_mutable`** — exatamente como as 18 funções `set_updated_at_*` que já existiam neste schema. É padrão pré-existente do repo, não introduzido por esta fase, e **não foi corrigido aqui** (corrigir só estas duas criaria inconsistência com as outras 18; endurecer todas é outra fase). A função que importa, `get_earnings_summary`, está limpa.

## User Setup Required

Resolvido durante a execução: o checkpoint `[BLOCKING]` de aplicação ao banco vivo foi cumprido e verificado. Nenhuma variável de ambiente nova. Nenhum pacote novo instalado nesta fase.

## Next Phase Readiness

**Pronto para `10-02`** (o plano da fatia vertical `tracer`: avulso → painel). O schema existe no banco, então a verificação de `10-02` não pode dar falso-positivo por migration não aplicada.

**O que `10-02`+ precisa lembrar:**
- `modules/supabase/get-authenticated-user.ts` tem um `.select(...)` **hardcoded** — sem adicionar `consultation_price_cents` ali, o RSC nunca vê o valor. É o esquecimento mais provável da fase.
- `get_earnings_summary` espera `p_from`/`p_to`/`p_today` já resolvidos no fuso da clínica pelo RSC. A função não converte fuso nenhum.
- A action de lançamento **tem** de validar a posse do `case_id` (a RLS não cobre esse caminho) — molde em `modules/cases/update-case-status.ts`.
- **Blocker herdado:** os 2 follow-ups do `restrict` em `deferred-items.md` precisam entrar em `10-04`.

---
*Phase: 10-livro-caixa-de-ganhos-painel*
*Completed: 2026-08-21*

## Self-Check: PASSED

Todos os 4 arquivos existem em disco e todos os 4 commits existem no histórico (`e094e21`, `f2e01a4`, `4227d6d`, `09e1081`). Nenhum arquivo rastreado foi apagado pelos commits deste plano.
