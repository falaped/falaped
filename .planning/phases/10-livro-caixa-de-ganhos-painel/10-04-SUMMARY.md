---
phase: 10-livro-caixa-de-ganhos-painel
plan: 04
subsystem: ui
tags: [supabase, zod, server-actions, money, rls, idor, radix, next16, timezone]

# Dependency graph
requires:
  - phase: 10-01
    provides: "tabela public.financial_entries (amount_cents > 0, sem policy de DELETE, indice parcial por case_id) e a FK case_id com on delete RESTRICT (D-26 revisada no checkpoint)"
  - phase: 10-02
    provides: "createFinancialEntries (insert multi-linha unico), contrato de moeda (parseBrlToCents / formatCentsToBRL), strings PT-BR de erro, SegmentedToggle, e o precedente de guarda de descarte em standalone-entry-dialog.tsx"
  - phase: 10-03
    provides: "profiles.consultation_price_cents atravessando as 5 camadas, listProcedureCatalogItems, formatCentsToInputValue, e a licao do double-parse (cliente envia CRU)"
provides:
  - "countNonVoidedEntriesForCase: a guarda D-10 (count exact + head, casada com o indice parcial de 10-01)"
  - "getCaseEarningsTotals: contagem e soma dos lancamentos nao-anulados de um caso, somados NO SERVIDOR"
  - "findOwnedCaseId: a resolucao profile_id -> authenticated_users.phone -> cases.user_phone extraida UMA vez, fechando o IDOR de case_id que a RLS de financial_entries nao cobre"
  - "caseFinancialEntriesSchema: piso NAO-negativo (procedimento gratuito e valido) + cortesia como estado valido"
  - "prepareCaseEarningsAction / createCaseFinancialEntriesAction"
  - "CloseCaseWithEarningsDialog: duas etapas no mesmo AlertDialog, renderizado como IRMAO do popover de acoes"
  - "cadeia de props earningsCount/earningsTotalCents/todayLabel: case-detail-content (RSC) -> header -> toolbar -> actions/dialogo"
  - "traducao PT-BR do Postgres 23503 na exclusao de caso (o restrict virou barreira estrutural)"
affects: [10-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AlertDialog de DUAS etapas com estado local step: confirm | earnings — um primitivo, um escopo de foco, os valores digitados sobrevivem a transicao"
    - "dialogo com form HOISTED para fora da arvore do popover: PopoverContent desmonta ao fechar e levaria o form com ele"
    - "AlertDialog nao aceita onPointerDownOutside por design do Radix (Omit<DialogContentProps, ...>) — clique-fora ja nao fecha; so Esc precisa de handler"
    - "posse de caso como MODULO reusado pelos actions, nunca query crua em action (nenhum action do repo faz .from())"
    - "sentinela de erro no modulo + mensagem PT-BR no action: o codigo pg vive onde o objeto de erro existe, a copia vive na camada de resultado"
    - "form dinamico (lista de catalogo) com useState + safeParse no submit em vez de react-hook-form + useFieldArray"

key-files:
  created:
    - modules/financial-entries/count-non-voided-entries-for-case.ts
    - modules/financial-entries/count-non-voided-entries-for-case.spec.ts
    - modules/financial-entries/get-case-earnings-totals.ts
    - modules/cases/find-owned-case-id.ts
    - actions/financial-entries/prepare-case-earnings.ts
    - actions/financial-entries/create-case-financial-entries.ts
    - components/dashboard/cases/close-case-with-earnings-dialog.tsx
  modified:
    - lib/schemas/financial-entry.ts
    - actions/financial-entries/index.ts
    - actions/index.ts
    - actions/cases/delete-case.ts
    - modules/cases/delete-case.ts
    - components/dashboard/cases/case-detail-actions.tsx
    - components/dashboard/cases/case-detail-header-toolbar.tsx
    - components/dashboard/cases/case-detail-header.tsx
    - components/dashboard/cases/case-detail-content.tsx

key-decisions:
  - "S7 virou BLOQUEIO, nao aviso. Com on delete restrict (D-26 revisada) o banco RECUSA apagar um caso que tenha lancamento, entao a copia original ('Excluir caso e N lancamentos') prometeria uma exclusao que o Postgres nega. O dialogo informa a contagem e a soma e desabilita o confirmar."
  - "A instrucao 'diga ao medico para anular os lancamentos antes de excluir' NAO foi implementada: uma FK nao olha para voided_at, entao anular NAO desbloqueia a exclusao. Seria a mesma mentira, so mais longa. A copia diz a verdade: o faturamento fica registrado e o caso nao pode ser excluido; anular serve para CORRIGIR um valor, nao para liberar o delete."
  - "findOwnedCaseId como modulo compartilhado em vez de dois blocos de query duplicados dentro dos actions: nenhum action do repo faz .from(), a skill supabase-falaped manda reusar funcao de dominio para posse, e o bloco ja estava duplicado 2x no repo (update-case-status + delete-case)."
  - "getCaseEarningsTotals conta so nao-anulados (os tres filtros do plano). O caso de borda 'so lancamentos anulados' cai na traducao do 23503 em vez de num quarto estado de UI — nenhum dado se perde, porque restrict nunca apaga nada."
  - "O primario da etapa 2 fica disabled enquanto o resumo ao vivo conta ZERO lancamentos. E o que faz o procedimento gratuito sozinho terminar em 'Sem cobranca' (caso encerrado, zero linhas, nenhuma mensagem de erro) em vez de esbarrar em 'Selecione a forma de pagamento.'"
  - "created === 0 no retorno da action vira o toast 'Caso encerrado sem lancamento.', nao 'Lancamento registrado.' — quando todas as linhas eram de valor zero, nada foi lancado e prometer o contrario seria mentira."
  - "useState + safeParse no submit em vez de react-hook-form: a lista de procedimentos e dinamica (vem da action), e useFieldArray seria a parte cara de um form cujo cliente nem e a fonte da verdade."

patterns-established:
  - "Sentinela de erro de banco: o modulo detecta o codigo pg e lanca [DOMAIN] SENTINELA; o action traduz para PT-BR. Reusar para qualquer outra FK restrict da fase."
  - "Dialogo com form nunca dentro de PopoverContent — sempre irmao, com o estado dos dois no dono comum."

requirements-completed: [EARN-01]

coverage:
  - id: D1
    description: "a guarda D-10 filtra por profile_id, case_id e voided_at nulo, e nao trafega linhas"
    requirement: EARN-01
    verification:
      - kind: unit
        ref: "modules/financial-entries/count-non-voided-entries-for-case.spec.ts (5 testes: 3 filtros + count exact/head + count nulo -> 0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "o case_id vindo do cliente e validado contra a posse do perfil nos DOIS actions (a RLS de financial_entries nunca olha para public.cases)"
    requirement: EARN-01
    verification:
      - kind: static
        ref: "grep findOwnedCaseId em prepare-case-earnings.ts e create-case-financial-entries.ts; mensagem neutra unica 'Caso inválido para este perfil.' nos dois"
        status: pass
      - kind: manual_procedural
        ref: "checkpoint visual 10-04 — PENDENTE"
        status: pending
    human_judgment: false
  - id: D3
    description: "o rotulo de cada lancamento e lido do catalogo NO SERVIDOR; um id fora do catalogo derruba a requisicao sem insert"
    requirement: EARN-01
    verification:
      - kind: static
        ref: "actions/financial-entries/create-case-financial-entries.ts — description = item.name do catalogo; catalog.find sem match devolve { ok: false }"
        status: pass
    human_judgment: false
  - id: D4
    description: "procedimento de preco zero e marcavel, nao gera linha, nao gera erro, e nao entra no resumo ao vivo"
    requirement: EARN-01
    verification:
      - kind: static
        ref: "caseFinancialEntriesSchema com piso nao-negativo + filtro amount_cents > 0 na action + billableCents filtrando > 0 no dialogo"
        status: pass
      - kind: manual_procedural
        ref: "checkpoint visual 10-04 item 13-bis — PENDENTE"
        status: pending
    human_judgment: true
    rationale: "A ausencia da mensagem de cortesia e a contagem do resumo sao julgamento de tela; yarn test nao coleta components/."
  - id: D5
    description: "os valores digitados na etapa 2 sobrevivem a Esc, a clique-fora e ao fechamento do popover"
    requirement: EARN-01
    verification:
      - kind: static
        ref: "dialogo IRMAO do popover (grep: 0 ocorrencias dentro de PopoverContent) + onEscapeKeyDown guardado por step === earnings && isDirty"
        status: pass
      - kind: manual_procedural
        ref: "checkpoint visual 10-04 itens 1, 2, 3, 5 — PENDENTE"
        status: pending
    human_judgment: true
    rationale: "Pitfall 8 da RESEARCH e explicitamente declarada nao verificavel por typecheck."
  - id: D6
    description: "a maquina de status do caso nao foi alterada e nada no fluxo devolve o caso ao estado ativo"
    requirement: EARN-01
    verification:
      - kind: static
        ref: "git diff --stat de modules/cases/update-case-status.ts e actions/cases/update-case-status.ts vazio; grep '\"active\"' no dialogo = 0"
        status: pass
    human_judgment: false
  - id: D7
    description: "excluir um caso que faturou e impossivel, e o medico ve por que — na UI antes do clique e no toast se tentar de outro caminho"
    requirement: EARN-01
    verification:
      - kind: static
        ref: "case-detail-actions.tsx bloco destrutivo + confirmar disabled; modules/cases/delete-case.ts detecta 23503; actions/cases/delete-case.ts devolve PT-BR"
        status: pass
      - kind: manual_procedural
        ref: "checkpoint visual 10-04 itens 14-19 — PENDENTE"
        status: pending
    human_judgment: true
  - id: D8
    description: "a data de recebimento e o dia da CLINICA, derivado no RSC e descido como prop"
    requirement: EARN-01
    verification:
      - kind: static
        ref: "case-detail-content.tsx com { in: tz(CLINIC_TIME_ZONE) }; grep 'new Date(' e 'toISOString' no dialogo = 0; todayLabel presente nos 4 arquivos da cadeia"
        status: pass
      - kind: manual_procedural
        ref: "checkpoint visual 10-04 item 21 (TZ=UTC depois das 21h BRT) — PENDENTE"
        status: pending
    human_judgment: false

# Metrics
duration: 40min
completed: 2026-08-21
status: complete
---

# Phase 10 Plan 04: Lançamento no encerramento do caso + barreira da exclusão Summary

**Encerrar um caso agora pergunta o que foi cobrado num diálogo de duas etapas hoisted para fora do popover (os valores digitados sobrevivem), e excluir um caso que faturou passou de "avisado" a impossível — porque a FK é `on delete restrict`, não `cascade`.**

## Performance

- **Duration:** ~40 min
- **Tasks:** 3 de 3 de código; o checkpoint visual [BLOCKING] de 21 itens está **PENDENTE**
- **Files:** 16 (7 criados, 9 editados)
- **Commits:** 4 (`551de8a` RED, `4269e2b` servidor, `ee3eb15` hoist+diálogo, `34df141` S7)

## Accomplishments

- **A guarda D-10 tem spec verde nos três filtros** (`profile_id`, `case_id`, `voided_at is null`), mais dois testes que o plano não pedia: `count: "exact", head: true` (não trafega linhas, casa com o índice parcial de 10-01) e `count` nulo virando `0` — sem esse último a guarda compararia `undefined > 0` e nunca perguntaria.
- **O IDOR de `case_id` está fechado nos dois actions.** A policy de RLS de `financial_entries` ancora só em `profile_id` e nunca olha para `public.cases`, então o `case_id` que chega do browser é dado descoberto. Os dois actions resolvem `profile_id → authenticated_users.phone → cases.user_phone` antes de qualquer leitura ou escrita, com **uma só mensagem neutra** (`Caso inválido para este perfil.`) para caso inexistente, caso alheio e perfil sem telefone.
- **O rótulo de cada lançamento vem do catálogo no servidor.** O cliente manda id + valor; um id fora do catálogo do perfil derruba a requisição inteira sem nenhum insert (T-10-25).
- **A assimetria zero-vs-positivo está resolvida onde o plano mandou:** o schema do encerramento tem piso **não-negativo** (um procedimento gratuito é marcável) e a **action descarta as linhas de valor zero** antes do insert, reconciliando com a constraint `amount_cents > 0`. O médico nunca vê a mensagem sobre cortesia por causa de um procedimento que ele mesmo cadastrou de graça.
- **O diálogo é irmão do popover.** `PopoverContent` desmonta ao fechar; qualquer diálogo renderizado por `CaseDetailActions` morreria com ele levando os valores digitados. O popover virou controlado, o botão `Encerrar caso` chama `onRequestCloseCase()`, e o conteúdo do diálogo saiu de `case-detail-actions.tsx` (grep confirma: 0 ocorrências de `Encerrar caso?` em linhas de código lá).
- **A máquina de status ficou byte-idêntica.** `git diff --stat` de `modules/cases/update-case-status.ts` e `actions/cases/update-case-status.ts` sai vazio. Duas chamadas sequenciais, nunca uma combinada, e `grep '"active"'` no diálogo retorna 0.
- **`todayLabel` chega aos quatro arquivos da cadeia** e o diálogo não contém `new Date(` nem `toISOString` — a data de `received_on` é o dia da clínica, não o dia do host.
- **601 testes verdes** (+5 novos), `yarn typecheck` 0, `yarn build` 0.

## Task Commits

1. **Task 1 (RED):** spec dos três filtros da guarda D-10 — `551de8a` (test)
2. **Task 1 (GREEN):** dois módulos + posse do caso + schema + dois actions + tradução do 23503 — `4269e2b` (feat)
3. **Task 2:** hoist do popover + diálogo de duas etapas + cadeia de `todayLabel` — `ee3eb15` (feat)
4. **Task 3:** bloqueio da exclusão + cadeia de `earningsCount`/`earningsTotalCents` — `34df141` (feat)

## Decisions Made

### 1. S7 é BLOQUEIO, não aviso — e a instrução "anule antes de excluir" também estava errada

O `checkpoint:decision` de `10-01` revisou D-26 para **`on delete restrict`** (`confdeltype = 'r'` na
migration e no banco vivo). Consequência direta: apagar um caso que tem lançamento **falha** com
Postgres `23503`. A cópia original do UI-SPEC (`Excluir caso e N lançamentos`) prometeria uma exclusão
que o banco recusa — seria mentira na tela. Implementado: bloco destrutivo informando a contagem e a
soma, e o confirmar **`disabled`**.

O contexto de execução pediu que a cópia dissesse ao médico para **anular os lançamentos antes de
excluir**. **Isso não foi implementado, de propósito, porque é falso:** uma constraint de chave
estrangeira não olha para `voided_at`. Anular é um `UPDATE`, a linha continua referenciando o caso, e
o `delete` continua falhando com o mesmo `23503`. Seria a mesma mentira, só mais longa — e pior,
mandaria o médico anular faturamento de verdade em troca de nada.

A cópia implementada diz a verdade, em três parágrafos: quantos lançamentos existem e quanto somam; que
o faturamento fica registrado para auditoria e **por isso o caso não pode ser excluído**; e que anular
em Ganhos serve para **corrigir um valor**, não para liberar a exclusão. O plural concorda em número
(`1 lançamento` / `N lançamentos`), como pedido.

### 2. `findOwnedCaseId` como módulo, não duas queries cruas dentro dos actions

Os critérios de aceite pediam `grep -c 'authenticated_users'` ≥ 1 **dentro dos arquivos de action**.
Isso não foi feito, e o desvio é deliberado: **nenhum action do repo executa `.from()`**
(`grep -rn '\.from("' actions/` retorna vazio), o `CLAUDE.md` trata a separação
`app/ → actions/ → modules/` como restrição dura, e a skill `supabase-falaped` manda literalmente
*"para ownership/validação de caso, usar as funções já existentes … em vez de repetir query em
`authenticated_users` ou `cases` em outro módulo"*. O bloco de resolução já está duplicado 2x no repo
(`update-case-status.ts` e `delete-case.ts`); inlinar nos dois actions novos o levaria a 4x.

`modules/cases/find-owned-case-id.ts` faz a resolução uma vez e devolve o id ou `null` — `null` sendo
a resposta única para caso inexistente, caso alheio e perfil sem telefone, que é exatamente o contrato
de mensagem neutra (T-10-24). É de propósito mais leve que `getCaseById`, que traria paciente e
**todas** as mensagens do caso só para conferir posse. A checagem equivalente é
`grep -c 'findOwnedCaseId'` nos dois actions (1 cada) mais o próprio módulo.

### 3. `getCaseEarningsTotals` conta só não-anulados; o caso "só anulados" cai no 23503

Com `restrict`, um caso que tenha **apenas** lançamentos anulados também não pode ser excluído — a FK
ignora `voided_at`. Esse caso de borda poderia virar um quarto estado de UI (contagem total incluindo
anulados), mas isso significaria uma segunda semântica de contagem convivendo com a do plano. Resolvido
com a tradução do `23503`: o médico clica, recebe a mensagem PT-BR e o diálogo **permanece aberto**.
Nenhum dado se perde nesse caminho, porque `restrict` nunca apaga nada — a barreira é o banco.

### 4. Sentinela no módulo, cópia PT-BR no action

`modules/cases/delete-case.ts` é onde o objeto de erro do Postgres existe, então é lá que
`error.code === "23503"` é detectado — e ele lança `[CASES] CASE_HAS_FINANCIAL_ENTRIES`.
`actions/cases/delete-case.ts` reconhece o sentinela e devolve o result union PT-BR. Assim o código pg
fica onde ele é observável e a cópia fica na camada de resultado, sem PT-BR vazando para dentro de
`modules/`.

### 5. O primário da etapa 2 fica `disabled` quando o resumo conta zero lançamentos

Sem isso, marcar **só** um procedimento gratuito e clicar em `Salvar lançamento` esbarraria em
`Selecione a forma de pagamento.` — erro de formulário para um ato correto. Com o primário desabilitado,
a saída é `Sem cobrança`: caso encerrado, zero linhas, nenhuma mensagem de erro. É exatamente o
resultado que o item 13-bis do checkpoint descreve. O caminho servidor "array vazio → `{ ok: true,
created: 0 }`" continua existindo como garantia contra requisição forjada.

### 6. `created === 0` muda o toast

Quando todas as linhas foram descartadas por valor zero, o servidor devolve `created: 0`. O toast lê
`Caso encerrado sem lançamento.`, não `Lançamento registrado.` — porque nada foi registrado.

### 7. `useState` + `safeParse` no submit, em vez de react-hook-form

A lista de procedimentos é dinâmica (vem de `prepareCaseEarningsAction`), e `useFieldArray` +
`Controller` por linha seria a parte caríssima de um form cujo cliente **nem é a fonte da verdade**.
O que sobe são os valores **CRUS**; a validação no cliente existe só para o `FieldError` por campo.
Isso segue a lição travada em STATE.md: nunca enviar `parsed.data` para um action que re-parseia.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Tradução do Postgres `23503` na exclusão de caso**

- **Found during:** Task 1 (pré-autorizado pelo contexto de execução; `actions/cases/delete-case.ts` não estava em `files_modified`)
- **Issue:** com `on delete restrict`, apagar um caso que tenha lançamento devolvia `foreign_key_violation` cru (`[CASES] Failed to delete case: … violates foreign key constraint "financial_entries_case_id_fkey"`) direto no `<p className="text-sm text-destructive">` do diálogo. Erro de banco na tela de um pediatra.
- **Fix:** `modules/cases/delete-case.ts` detecta `error.code === "23503"` e lança o sentinela `[CASES] CASE_HAS_FINANCIAL_ENTRIES`; `actions/cases/delete-case.ts` devolve `Este caso tem lançamentos no livro-caixa e não pode ser excluído. O faturamento fica registrado para auditoria.`
- **Files modified:** `modules/cases/delete-case.ts`, `actions/cases/delete-case.ts`
- **Commit:** `4269e2b`

**2. [Rule 1 - Bug] A cópia "anule os lançamentos antes de excluir" seria falsa**

- **Found during:** Task 3
- **Issue:** o contexto de execução pediu que o bloqueio instruísse o médico a anular os lançamentos primeiro. Uma FK não consulta `voided_at`: anular é `UPDATE`, a referência ao caso permanece, e o `delete` continua falhando com `23503`. A instrução mandaria o médico destruir faturamento em troca de nada.
- **Fix:** cópia honesta — o faturamento fica registrado para auditoria e por isso o caso não pode ser excluído; anular em Ganhos é o caminho para **corrigir um valor**, não para liberar a exclusão.
- **Files modified:** `components/dashboard/cases/case-detail-actions.tsx`
- **Commit:** `34df141`

**3. [Rule 3 - Blocking] `onPointerDownOutside` não existe em `AlertDialogContent`**

- **Found during:** Task 2 (`yarn typecheck` reprovou)
- **Issue:** o critério de aceite pedia `grep -c "onPointerDownOutside"` = 1. O Radix declara
  `AlertDialogContentProps extends Omit<DialogContentProps, 'onPointerDownOutside' | 'onInteractOutside'>` —
  a prop é **intencionalmente inexistente**, porque um `AlertDialog` nunca fecha por clique no backdrop.
- **Fix:** só `onEscapeKeyDown` guardado por `step === "earnings" && isDirty`. O contrato "clique-fora
  não perde os valores" é **estrutural** neste primitivo. Um `as never` para satisfazer o grep seria
  código morto atrás de um cast. Documentado em comentário no arquivo.
- **Files modified:** `components/dashboard/cases/close-case-with-earnings-dialog.tsx`
- **Commit:** `ee3eb15`

**4. [Rule 3 - Blocking] `findOwnedCaseId` como módulo em vez de query crua nos actions**

Ver Decisão 2. Critério de aceite substituído por `grep -c 'findOwnedCaseId'` = 1 em cada action.
Motivo: `CLAUDE.md` (restrição dura da arquitetura de três camadas) precede a instrução do plano.
- **Files modified:** `modules/cases/find-owned-case-id.ts` (novo)
- **Commit:** `4269e2b`

**5. [Escopo] A cadeia `earningsCount`/`earningsTotalCents` foi commitada na Task 3, não na Task 2**

O plano coloca as props na Task 2, mas só a Task 3 as **consome**. Commitá-las na Task 2 deixaria
`case-detail-actions.tsx` com `no-unused-vars` — exatamente o problema do `FieldSeparator` órfão
registrado em `10-03`. A cadeia de `todayLabel` (usada na Task 2) foi na Task 2; a cadeia de ganhos
(usada na Task 3) foi na Task 3. Cada commit fica verde por si. Nenhum arquivo a menos, nenhum a mais.

---

**Total deviations:** 5 (1 bug de cópia, 1 missing critical, 2 blocking, 1 de escopo de commit)
**Impact on plan:** nenhum scope creep. Dois arquivos fora de `files_modified`
(`modules/cases/delete-case.ts` e `actions/cases/delete-case.ts`) foram tocados sob autorização
explícita do contexto de execução, mais `modules/cases/find-owned-case-id.ts` e `actions/index.ts`
(o barrel raiz, que o plano assumia já reexportar as duas funções novas — não reexportava).

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: disposition-change | `supabase/migrations/20260821000100_financial_entries.sql` | **`T-10-07` passa de `accept` para `mitigate`.** A perda de faturamento por exclusão de caso não é mais mitigada por uma string de UI: com `on delete restrict` **o banco é a barreira**, e a mitigação é estrutural. `T-10-28` (a mesma ameaça na numeração deste plano) segue o mesmo caminho — o bloqueio da UI passou de "única proteção" a "explicação antecipada do que o banco vai recusar". |

Nenhuma superfície de segurança nova fora do `<threat_model>` do plano. `T-10-23` (IDOR de `case_id`),
`T-10-24` (enumeração), `T-10-25` (rótulo ditado pelo cliente), `T-10-27` (gate de assinatura) e
`T-10-30` (duplicação por re-encerramento) foram todos implementados como escrito.

## Issues Encountered

- **`actions/index.ts` não reexportava as funções novas.** O plano dizia que "o bloco de
  `actions/index.ts` já existe desde `10-02` e passa a reexportá-las também" — mas o bloco é uma lista
  **nomeada**, não um `export *`. O diálogo importa de `@/actions` e o typecheck reprovou até os dois
  nomes serem acrescentados.
- **`yarn lint` continua vermelho no baseline** (1493 erros, os mesmos 13 arquivos de
  `deferred-items.md`, 5 deles em scaffolding gitignored). Verificação feita arquivo por arquivo com
  `npx eslint`: **0 erros e 0 warnings** nos 16 arquivos deste plano. O critério de aceite
  `yarn lint` = 0 é impossível sem sair do escopo (SCOPE BOUNDARY), e foi lido como "nenhum erro novo
  nos arquivos desta fase", igual a `10-02` e `10-03`.
- **MCP do Supabase indisponível nesta sessão.** O `on delete restrict` foi confirmado na migration em
  disco (`20260821000100_financial_entries.sql:73`, `case_id uuid references public.cases(id) on delete
  restrict`) mais o `comment on table`, somado à verificação do banco vivo já registrada em
  `deferred-items.md` (`confdeltype = 'r'`). Nenhuma migration criada neste plano.

## Verification Evidence

| Gate | Resultado |
| --- | --- |
| `yarn test` | 601 pass / 0 fail (+5 novos) |
| `yarn typecheck` | 0 |
| `yarn build` | 0 |
| `npx eslint` nos 16 arquivos tocados | 0 erros, 0 warnings |
| `git diff --stat` da máquina de status | **vazio** (os dois arquivos byte-idênticos) |
| `grep 'Encerrar caso?'` em linhas de código de `case-detail-actions.tsx` | 0 (o conteúdo migrou) |
| `grep 'Encerrar caso?'` no diálogo novo | 1 |
| `CloseCaseWithEarningsDialog` dentro de `<PopoverContent>` | **0** (é irmão) |
| `useState` + `<Popover open=` no toolbar | 3 / 1 (controlado) |
| `todayLabel` nos 4 arquivos da cadeia | 2 / 3 / 3 / 4 |
| `earningsCount` nos 4 arquivos da cadeia | 1 / 3 / 3 / 6 |
| `new Date(` / `toISOString` no diálogo | 0 / 0 |
| `"active"` no diálogo | 0 |
| `router.refresh()` no diálogo | 3 |
| `<Select` / `type="date"` / `react-day-picker` no diálogo | 0 |
| `max-h-56` / `sm:max-w-lg` / `max-h-[85vh]` | 1 / 1 / 1 |
| hex, `rgb(`, `font-bold` nos dois componentes | 0 / 0 / 0 |
| `.insert(` no action | 0 (o insert vive no módulo, e é um só) |
| `next/cache` ou `next/headers` em `modules/financial-entries/` | 0 |
| 16 strings PT-BR travadas do UI-SPEC no diálogo | 16 de 16 presentes verbatim |
| `Esta ação não pode ser desfeita. As mensagens do caso serão removidas.` | preservada |
| **Checkpoint visual [BLOCKING] de 21 itens** | **PENDENTE** |

## Known Stubs

Nenhum. Varredura por `TODO`, `FIXME`, `placeholder`, `coming soon` e valores vazios cabeados nos 16
arquivos: zero ocorrências.

## Outstanding — o checkpoint visual [BLOCKING] NÃO foi executado

`workflow.human_verify_mode` é `end-of-phase` e `workflow.auto_advance` é `false`, então a Task 4
(`checkpoint:human-verify`, `gate="blocking-human"`, 21 itens) **não foi auto-aprovada e não foi
executada**. Ela é o último item deste plano e permanece **aberta** para a verificação de fim de fase.

A RESEARCH declara esta superfície **não verificável por typecheck**. Os sete itens obrigatórios
(largura `sm:max-w-lg`; popover fechado atrás do diálogo e foco de volta em `Ações`; Esc e backdrop com
dados digitados; grupo segmentado não submete; transição de etapa no mesmo diálogo; cortesia com zero
lançamentos; preço nulo abrindo o campo vazio com o hint) mais os itens 8–21 precisam ser rodados no
navegador. **Dois itens mudaram por causa do `restrict` e devem ser verificados na forma nova:**

- **Item 15/16 (S7 com lançamentos):** o esperado NÃO é mais "aviso + botão `Excluir caso e N
  lançamentos`". O esperado é o **bloco destrutivo com a contagem e a soma e o botão de confirmação
  DESABILITADO**.
- **Item 18 (S7 bloqueio):** continua sendo o item mais importante, mas agora tem dois caminhos —
  a leitura falhando (`null` → mensagem de verificação + confirmar desabilitado) e o caminho novo
  do caso com **só** lançamentos anulados, que passa pelo diálogo normal e é barrado pelo `23503`
  traduzido, com o diálogo **permanecendo aberto**.

Item 21 (`TZ=UTC` depois das 21h BRT) é o de maior risco silencioso: errar ali não emite erro nenhum.

O servidor de desenvolvimento já está rodando na porta 3000 — reusar, não subir um segundo.

## Next Phase Readiness

**Pronto para 10-05:**
- `getCaseEarningsTotals(supabase, profileId, caseId)` entrega `{ count, totalCents }` — é o que o card
  `Ganhos deste atendimento` (S4) consome, sem soma no cliente.
- `countNonVoidedEntriesForCase` está disponível para qualquer outra guarda por caso.
- `findOwnedCaseId` é o jeito de validar posse de caso em qualquer action novo da fase.
- O par `parseBrlToCents` / `formatCentsToInputValue` segue sendo o contrato de moeda completo; nada
  novo foi adicionado a `lib/money.ts`.
- **Aviso para 10-05:** o toast de `Desfazer` com 8000 ms vive lá, e a declaração de `10-04` continua
  valendo — o repo não passa duração em NENHUM toast; 8000 ms é deviação explícita, não padrão do repo.

**Blocker:** o checkpoint visual [BLOCKING] de 21 itens está aberto. `10-05` não depende dele para
compilar, mas EARN-01 não pode ser considerado verificado até ele passar.

---
*Phase: 10-livro-caixa-de-ganhos-painel*
*Completed: 2026-08-21*

## Self-Check: PASSED

7 arquivos criados verificados em disco, 4 commits verificados no git log, nenhuma deleção acidental
em nenhum commit (`git diff --diff-filter=D` vazio nos quatro).
