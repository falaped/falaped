---
phase: 10-livro-caixa-de-ganhos-painel
plan: 03
subsystem: ui
tags: [supabase, zod, react-hook-form, server-actions, money, rls, idor, next16]

# Dependency graph
requires:
  - phase: 10-01
    provides: "tabela public.procedure_catalog_items (RLS owner-scoped, price_cents >= 0, name not blank) e a coluna profiles.consultation_price_cents"
  - phase: 10-02
    provides: "contrato de moeda (lib/money.ts parseBrlToCents, lib/formatters.ts formatCentsToBRL), strings PT-BR de erro em lib/schemas/financial-entry.ts, e o precedente de dialogo com input de moeda + FieldError + useTransition"
provides:
  - "consultation_price_cents atravessando as 5 camadas de TypeScript, incluindo a string de .select() hardcoded de get-authenticated-user.ts (o landmine da fase)"
  - "card Precos no Perfil, entre 'Informacoes do perfil' e 'Logos', com o campo 'Valor da consulta (R$)' contido (max-w-xs) e vazio quando o banco tem nulo"
  - "4 modulos de catalogo de procedimentos (list/create/update/delete), com update e delete filtrando id E profile_id"
  - "3 actions de catalogo com gate de autenticacao + gate de assinatura + revalidatePath"
  - "editor de catalogo (add / edit-no-lugar / remove-com-confirmacao) como bloco titulado dentro do card Precos"
  - "lib/money.ts: formatCentsToInputValue — o inverso de parseBrlToCents para pre-preencher inputs de moeda"
  - "spec de posse da exclusao de catalogo com mock gravador dos filtros .eq()"
affects: [10-04, 10-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "formatCentsToInputValue / parseBrlToCents como par ida-e-volta: centavos <-> texto do input, sem prefixo R$ (o prefixo vive no rotulo)"
    - "duplo filtro id + profile_id em toda mutacao owner-scoped, afirmado por spec com mock gravador de .eq()"
    - "componente cliente com estado e actions PROPRIOS convivendo dentro de um Card que pertence a outro useForm — bloco titulado, sem Card aninhado"
    - "cliente envia valores CRUS do form; o action re-valida e e a fonte unica da verdade (nunca enviar parsed.data para um action que re-parseia)"

key-files:
  created:
    - lib/schemas/procedure-catalog-item.ts
    - lib/schemas/profile.spec.ts
    - modules/procedure-catalog/types.ts
    - modules/procedure-catalog/list-procedure-catalog-items.ts
    - modules/procedure-catalog/create-procedure-catalog-item.ts
    - modules/procedure-catalog/update-procedure-catalog-item.ts
    - modules/procedure-catalog/delete-procedure-catalog-item.ts
    - modules/procedure-catalog/delete-procedure-catalog-item.spec.ts
    - actions/procedure-catalog/create-procedure-catalog-item.ts
    - actions/procedure-catalog/update-procedure-catalog-item.ts
    - actions/procedure-catalog/delete-procedure-catalog-item.ts
    - actions/procedure-catalog/index.ts
    - components/dashboard/profile/procedure-catalog-card.tsx
  modified:
    - modules/supabase/get-authenticated-user.ts
    - modules/profiles/types.ts
    - modules/profiles/update-profile.ts
    - lib/schemas/profile.ts
    - lib/money.ts
    - lib/money.spec.ts
    - actions/profile/update-profile.ts
    - actions/index.ts
    - app/dashboard/profile/page.tsx
    - app/dashboard/profile/profile-content.tsx

key-decisions:
  - "O botao Salvar dentro do card Precos FICA (variant=outline size=sm, mesmo submit do form de perfil): deixar o campo de dinheiro com seu unico controle de salvar no fundo do card ANTERIOR e a confusao 'salvar e sumir' que este plano existe para matar. Outline preserva a regra de primario unico do UI-SPEC."
  - "SEM cap de altura na lista de procedimentos — nao e necessario na escala atual. Se um catalogo passar de ~20 itens, o conserto e um max-h-* overflow-y-auto de uma linha no container da lista: caminho de upgrade conhecido e barato, nao uma questao aberta."
  - "O sinal de menos no texto e o que separa a mensagem de negativo da de inparseavel — parseBrlToCents devolve null nos dois casos, entao o schema checa o '-' antes de chamar o helper."
  - "Teto de 2_000_000_000 centavos nos dois schemas de preco (T-10-18), abaixo do limite de integer do Postgres, para o erro sair como mensagem PT-BR e nao como erro cru de banco."
  - "listProcedureCatalogItems devolve Pick<..., id|name|price_cents> (ProcedureCatalogItemOption) e nao a row inteira — e o que a UI e o dialogo de encerramento consomem."

patterns-established:
  - "Contrato de moeda bidirecional: parseBrlToCents na entrada, formatCentsToInputValue no pre-preenchimento. Wave 4 e 5 REUSAM, nao re-adicionam."
  - "Assimetria de preco vs lancamento: preco de catalogo aceita zero (procedimento gratuito e catalogavel) e rejeita so negativo; lancamento exige > 0."
  - "Spec de posse com mock gravador: todo modulo de mutacao owner-scoped ganha um spec que grava as chamadas .eq() e afirma id + profile_id juntos."

requirements-completed: [EARN-01]

coverage:
  - id: D1
    description: "consultation_price_cents atravessa as 5 camadas de TypeScript e sobrevive a um reload (o landmine da string de .select() hardcoded esta fechado)"
    requirement: EARN-01
    verification:
      - kind: unit
        ref: "lib/schemas/profile.spec.ts#consultation_price_cents (6 casos: 250,00 / vazio / zero / negativo / inparseavel / colado)"
        status: pass
      - kind: manual_procedural
        ref: "checkpoint visual 10-03 item 2 — digitar 250,00, salvar, F5, campo volta com 250,00"
        status: pass
    human_judgment: false
  - id: D2
    description: "campo Valor da consulta (R$) no card Precos: contido, vazio com placeholder quando o banco tem nulo, erro PT-BR no negativo"
    requirement: EARN-01
    verification:
      - kind: unit
        ref: "lib/schemas/profile.spec.ts#campo vazio vira undefined (grava nulo, nunca zero)"
        status: pass
      - kind: manual_procedural
        ref: "checkpoint visual 10-03 itens 1, 3, 4, 5"
        status: pass
    human_judgment: false
  - id: D3
    description: "as tres mutacoes de catalogo sao owner-scoped (id E profile_id) e gateadas por assinatura"
    requirement: EARN-01
    verification:
      - kind: unit
        ref: "modules/procedure-catalog/delete-procedure-catalog-item.spec.ts (3 testes, mock gravador de .eq())"
        status: pass
      - kind: manual_procedural
        ref: "checkpoint visual 10-03 item 15 — usuario nao-pago: perfil salva, mutacoes de catalogo recusam"
        status: pass
    human_judgment: false
  - id: D4
    description: "editor de catalogo: adicionar, editar no lugar (uma linha por vez, Esc + Descartar edicao), remover atras de confirmacao que tranquiliza sobre o snapshot"
    requirement: EARN-01
    verification:
      - kind: manual_procedural
        ref: "checkpoint visual 10-03 itens 6-11, 13, 14 — aprovado sem divergencias"
        status: pass
    human_judgment: true
    rationale: "Edicao no lugar, foco de volta no campo de nome, layout com nome longo e leitura da copia de confirmacao sao julgamento visual; nao ha teste de componente no repo (yarn test coleta so modules/ e lib/)."

# Metrics
duration: 25min
completed: 2026-08-21
status: complete
---

# Phase 10 Plan 03: Precos no Perfil e catalogo de procedimentos Summary

**Card `Precos` no Perfil com o valor da consulta ligado ao form existente e um editor de catalogo de procedimentos owner-scoped, mais o fechamento do landmine da fase: a coluna nova na string de `.select()` hardcoded de `get-authenticated-user.ts`.**

## Performance

- **Duration:** ~25 min (incluindo o checkpoint visual de 15 itens)
- **Tasks:** 3 de 3 (2 de codigo em TDD + 1 checkpoint visual aprovado)
- **Files modified:** 23 (13 criados, 10 editados)

## Accomplishments

- **O landmine esta fechado.** `consultation_price_cents` atravessa as cinco camadas: a string literal de `.select()` de `get-authenticated-user.ts`, o tipo `Profile`, o `UpdateProfilePayload`, o `updateProfileFormSchema` e o mapeamento campo-a-campo de `updateProfileAction`. Era a falha que "salva, some no reload e nao emite erro em lugar nenhum" — o item 2 do checkpoint visual confirmou o `250,00` voltando apos F5.
- **Card `Precos`** entre `Informacoes do perfil` e `Logos`, com o campo `Valor da consulta (R$)` contido em `max-w-xs`, `FieldDescription` e `FieldError`. Nulo abre o campo VAZIO com placeholder — nunca um zero que seria submetido por inercia.
- **Catalogo de procedimentos completo:** 4 modulos com tag `[PROCEDURE_CATALOG]`, `update` e `delete` filtrando `id` E `profile_id` (T-10-16), 3 actions com gate de autenticacao + gate de assinatura + `revalidatePath`, e o editor cliente com add / edit-no-lugar / remove-com-confirmacao.
- **`updateProfileAction` continua SEM gate de assinatura** (`grep -c 'profile.status'` = 0): Perfil e onde o usuario nao-pago conclui a conta, e um gate ali travaria o onboarding.
- **12 testes novos** (6 do schema de perfil, 3 do formatador de moeda, 3 de posse da exclusao de catalogo). `yarn test`: 596 pass / 0 fail.

## Task Commits

1. **Task 1 (RED): spec de `consultation_price_cents`** - `460d857` (test)
2. **Task 1 (GREEN): 5 camadas + card `Precos`** - `b6507db` (feat)
3. **Task 2 (RED): spec de posse da exclusao de catalogo** - `4a6d559` (test)
4. **Task 2 (GREEN): modulos + actions + editor de catalogo** - `43f1a8f` (feat)
5. **Task 3: checkpoint visual de 15 itens** - aprovado, sem divergencias (sem commit de codigo)

## Files Created/Modified

**Criados**
- `lib/schemas/procedure-catalog-item.ts` - nome (trim, 1-120) + preco em centavos, zero aceito, negativo rejeitado, teto abaixo de `integer`
- `lib/schemas/profile.spec.ts` - 6 casos do campo de valor da consulta
- `modules/procedure-catalog/types.ts` - `ProcedureCatalogItem`
- `modules/procedure-catalog/list-procedure-catalog-items.ts` - `.eq("profile_id")` + `.order("name")`, devolve `ProcedureCatalogItemOption`
- `modules/procedure-catalog/create-procedure-catalog-item.ts` - `profile_id` estampado do argumento, devolve o id
- `modules/procedure-catalog/update-procedure-catalog-item.ts` - duplo filtro `id` + `profile_id`
- `modules/procedure-catalog/delete-procedure-catalog-item.ts` - duplo filtro `id` + `profile_id`
- `modules/procedure-catalog/delete-procedure-catalog-item.spec.ts` - mock gravador de `.eq()`, 3 testes
- `actions/procedure-catalog/{create,update,delete}-procedure-catalog-item.ts` - gate de autenticacao + assinatura + `safeParse` + `revalidatePath` + result union
- `actions/procedure-catalog/index.ts` - barrel
- `components/dashboard/profile/procedure-catalog-card.tsx` - editor com estado e actions proprios, `router.refresh()` por mutacao

**Editados**
- `modules/supabase/get-authenticated-user.ts` - coluna acrescentada a string de `.select()` (o landmine)
- `modules/profiles/types.ts`, `modules/profiles/update-profile.ts` - `consultation_price_cents`
- `lib/schemas/profile.ts` - campo de formulario com transform para centavos
- `lib/money.ts`, `lib/money.spec.ts` - `formatCentsToInputValue` + 3 testes
- `actions/profile/update-profile.ts` - mapeamento do payload + correcao do double-parse (abaixo)
- `actions/index.ts` - bloco de reexport de `./procedure-catalog`
- `app/dashboard/profile/page.tsx` - carrega o catalogo junto dos templates
- `app/dashboard/profile/profile-content.tsx` - card `Precos` + bloco titulado `Procedimentos`

## Decisions Made

### 1. O botao `Salvar` dentro do card `Precos` fica

Adicionado como `variant="outline" size="sm"`, disparando o mesmo `form.handleSubmit(handleProfileSubmit)` do form de perfil. O UI-SPEC previa que o campo viajasse no `Salvar` existente sem controle proprio, mas esse `Salvar` mora no fundo do card ANTERIOR — um campo de dinheiro cujo unico controle de salvar esta em outro card e exatamente a confusao "digitei, salvei, sumiu" que este plano existe para matar. `outline` preserva a regra de primario unico do UI-SPEC (o primario segue sendo o `Salvar` do card de perfil). Levado ao checkpoint como decisao explicita; o usuario aprovou a tela como construida.

### 2. Sem cap de altura na lista de procedimentos (backstop de overflow, item 12)

Resolvido como **nao necessario na escala atual**. Nao e uma questao aberta: se um catalogo passar de ~20 itens, o conserto e uma unica linha — `max-h-* overflow-y-auto` no container da lista em `procedure-catalog-card.tsx`. Caminho de upgrade conhecido e barato, registrado aqui para nao ser re-investigado.

### 3. O sinal de menos no texto separa as duas mensagens de erro

`parseBrlToCents` devolve `null` tanto para negativo quanto para inparseavel, entao o schema nao consegue distinguir os casos pelo retorno. A checagem de `'-'` no texto acontece ANTES da chamada ao helper: e o que faz `-5` responder `O preco nao pode ser negativo.` em vez de `Valor invalido.`. Aplicado identico nos dois schemas de preco.

### 4. Teto de valor nos dois schemas de preco

`MAX_PRICE_CENTS = 2_000_000_000`, abaixo do limite de `integer` do Postgres (T-10-18). Sem ele um valor absurdo viraria erro cru de banco no toast em vez de mensagem PT-BR.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Salvar o perfil com QUALQUER campo em branco devolvia "Dados invalidos."**

- **Found during:** Task 1 (ao ligar o campo novo ao `useForm` existente)
- **Issue:** `profile-content.tsx` rodava `updateProfileSchema.safeParse(data)` no cliente e enviava **`parsed.data`** para `updateProfileAction`, que re-parseava com o MESMO schema. O transform de cada campo (`"" -> undefined`) tornava o segundo passe invalido: `z.string()` num campo obrigatorio recebendo `undefined` reprova com `expected string, received undefined`. Consequencia: qualquer perfil com um campo em branco (rqe, website, cidade...) nao salvava nada e o usuario via so `Dados invalidos.`. Reproduzido antes de corrigir, com um script que roda o schema duas vezes: passe 1 verde, passe 2 vermelho em `surname`, `email`, `crm`.
- **Fix:** o cliente passou a enviar os valores **CRUS** do form e o action e a fonte unica da verdade da validacao — exatamente o padrao que o `standalone-entry-dialog.tsx` da wave 2 ja documenta ("o que sobe e o valor CRU do form"). A assinatura de `updateProfileAction` mudou de `UpdateProfileFormData` para `UpdateProfileFormValues`. Unico chamador do action no repo, verificado por grep.
- **Files modified:** `app/dashboard/profile/profile-content.tsx`, `actions/profile/update-profile.ts`
- **Verification:** `yarn typecheck` 0; item 15 do checkpoint visual (perfil de usuario nao-pago salva) aprovado.
- **Committed in:** `b6507db` (commit da Task 1)

> **Cross-reference — este e o SEGUNDO caso do mesmo formato neste repo.** O commit `aacc896` ("idade gestacional aceita valor numerico no re-parse (double-parse)", 2026-07-09) corrigiu a mesma classe, e a quick task `260701-ctf` e o registro dela. **Uma terceira ocorrencia deve receber conserto ESTRUTURAL, nao mais um patch pontual:** um helper de submit compartilhado (o cliente valida para feedback, mas o que sobe e sempre o valor cru) ou uma regra de lint que torne o pre-parse no cliente impossivel. Dois casos ja mostram que a convencao "envie cru" nao se sustenta sozinha em revisao. Registrado tambem como preocupacao transversal em `STATE.md`.

**2. [Rule 2 - Missing Critical] Teto de valor nos schemas de preco**

- **Found during:** Tasks 1 e 2
- **Issue:** o plano especificou vazio / inparseavel / negativo, mas nao um teto. Um valor acima de `2147483647` centavos estouraria a coluna `integer` e voltaria como erro cru de Postgres no toast (T-10-21).
- **Fix:** `MAX_PRICE_CENTS = 2_000_000_000` com a mensagem ja travada no contrato de moeda (`Valor muito alto. Confira o que foi digitado.`), nos dois schemas.
- **Files modified:** `lib/schemas/profile.ts`, `lib/schemas/procedure-catalog-item.ts`
- **Committed in:** `b6507db`, `43f1a8f`

**3. [Rule 2 - Missing Critical] `formatCentsToInputValue` em `lib/money.ts`**

- **Found during:** Task 1
- **Issue:** pre-preencher o campo com centavos exigia o inverso de `parseBrlToCents`, e o repo tinha so `formatCentsToBRL` — que injeta o prefixo `R$` e portanto nao serve DENTRO de um input (o prefixo teria de ser parseado de volta a cada tecla).
- **Fix:** `formatCentsToInputValue(cents: number | null | undefined): string` em `lib/money.ts`, ao lado de `parseBrlToCents` — decimal PT-BR com separador de milhar, sem prefixo, e **string vazia para `null`/`undefined`** (e o que garante o campo abrir vazio em vez de com zero). Uma instancia de `Intl.NumberFormat` em escopo de modulo, como o `BRL` de `lib/formatters.ts`.
- **Files modified:** `lib/money.ts`, `lib/money.spec.ts` (3 testes: formatacao, nulo -> vazio, e ida-e-volta `formatCentsToInputValue -> parseBrlToCents` sobre 5 valores)
- **Nota para as waves 4 e 5:** o par `parseBrlToCents` / `formatCentsToInputValue` e agora o contrato de moeda COMPLETO da fase, nos dois sentidos. O dialogo de encerramento (10-04) pre-preenche o valor da consulta e cada linha de procedimento com `formatCentsToInputValue` — **reusar, nao re-adicionar**. `formatCentsToBRL` (com `R$`) continua sendo o formatador de EXIBICAO; `formatCentsToInputValue` e o de INPUT.
- **Committed in:** `b6507db`

---

**Total deviations:** 3 auto-fixed (1 bug, 2 missing critical)
**Impact on plan:** nenhum scope creep. O bug do double-parse era bloqueante para os criterios de aceite da Task 1 (o de "limpar o campo e salvar grava nulo" nao passaria) e a raiz e compartilhada com todo o form de perfil, nao so com o campo novo — conserto na rota unica por onde todos os chamadores passam.

## Issues Encountered

- **`FieldSeparator` importado antes de existir consumidor.** Na Task 1 o import ficou orfao (o bloco `Procedimentos` so chega na Task 2) e o `npx eslint` pegou como erro `no-unused-vars`. Removido na Task 1, re-adicionado na Task 2 — cada commit fica verde por si.
- **`yarn lint` continua vermelho no repo inteiro** (baseline pre-existente, 1493 erros em 13 arquivos, ja registrado em `deferred-items.md`). Verificacao feita arquivo por arquivo com `npx eslint`: 0 erros nos 23 arquivos deste plano; sobram so os 2 warnings pre-existentes de `<img>` em `profile-content.tsx`.
- **MCP do Supabase indisponivel nesta sessao** (as ferramentas nao chegaram ao agente). A precondicao da Task 2 foi verificada pela migration em disco (`supabase/migrations/20260821000000_procedure_catalog_and_prices.sql`, tabela + 2 constraints + RLS com as 4 policies) somada a confirmacao do estado da wave 1 de que ela esta aplicada ao banco vivo. Nenhuma migration criada neste plano.

## Verification Evidence

| Gate | Resultado |
| --- | --- |
| `yarn typecheck` | 0 |
| `yarn test` | 596 pass / 0 fail (+12 novos) |
| `yarn build` | 0 |
| `npx eslint` nos 23 arquivos tocados | 0 erros (2 warnings `<img>` pre-existentes) |
| 5 camadas de `consultation_price_cents` | 1+ ocorrencia em cada um dos 5 arquivos |
| `grep -c 'profile.status' actions/profile/update-profile.ts` | 0 (nenhum gate adicionado) |
| duplo filtro em update/delete de catalogo | `id` e `profile_id` presentes nos dois |
| gate de assinatura nos 3 actions de catalogo | 3 de 3 |
| `next/cache` ou `next/headers` em `modules/procedure-catalog/` | 0 |
| `Card` aninhado / `useForm` / hex / `font-bold` no editor | 0 / 0 / 0 / 0 |
| Checkpoint visual de 15 itens | aprovado, sem divergencias |

## Next Phase Readiness

**Pronto para 10-04 (dialogo de encerramento):**
- `AuthenticatedUserProfile.consultation_price_cents` chega ao RSC — a string de `.select()` esta corrigida, entao o pre-preenchimento do dialogo funciona.
- `listProcedureCatalogItems(supabase, profileId)` entrega `{ id, name, price_cents }[]` ordenado por nome, pronto para as linhas de procedimento.
- `formatCentsToInputValue` pre-preenche cada campo de moeda do dialogo. **Reusar.**
- O caso de procedimento com preco zero na tela de encerramento fica resolvido em 10-04, como planejado: a action descarta a linha, sem mensagem de erro.

**Sem blockers.** Uma nota de escala apenas: sem cap de altura na lista de procedimentos (decisao 2), com o conserto de uma linha ja documentado.

---
*Phase: 10-livro-caixa-de-ganhos-painel*
*Completed: 2026-08-21*

## Self-Check: PASSED

14 arquivos criados verificados em disco, 5 commits verificados no git log, nenhuma delecao acidental em nenhum commit (`git diff --diff-filter=D` vazio nos dois commits de feat).
