---
phase: 10-livro-caixa-de-ganhos-painel
plan: 05
subsystem: ui
tags: [rsc, search-params, recharts, server-actions, rls, idor, audit, money, sonner, tdd]

# Dependency graph
requires:
  - phase: 10-01
    provides: "public.financial_entries com voided_at e policy de UPDATE (sem policy de DELETE), indice parcial por case_id, e get_earnings_summary(uuid, date, date, date) filtrando voided_at no SQL"
  - phase: 10-02
    provides: "formatCentsToBRL (unico formatador), lib/schemas/financial-entry.ts (enum + PAYMENT_METHOD_LABEL), getEarningsSummary, EarningsCards com monthLabel/periodLabel separados e o badge Sempre o mes atual ja wired ao isCurrentPeriod, StandaloneEntryDialog"
  - phase: 10-04
    provides: "getCaseEarningsTotals (soma NO SERVIDOR, reusada pelo rodape do card do caso), findOwnedCaseId, a cadeia earningsCount/earningsTotalCents/todayLabel em case-detail-content.tsx, e a licao do double-parse (cliente envia CRU)"
  - phase: 03-crescimento
    provides: "components/dashboard/patients/growth/growth-chart.tsx — o UNICO consumidor de grafico do repo, cujo contrato foi copiado"
  - phase: 06-disponibilidade
    provides: "calendar-editor.tsx — o navegador de periodo de 28px e a forma do toast com acao de desfazer"
provides:
  - "listFinancialEntries: listagem com DEFAULT SEGURO de anulados (D-21), janela meio-aberta, filtro por caso e ordenacao especificada no SQL"
  - "voidFinancialEntry / restoreFinancialEntry: mutacoes owner-scoped por id E perfil, escrevendo APENAS voided_at"
  - "voidFinancialEntryAction / restoreFinancialEntryAction: os dois lados da anulacao, ambos gateados por auth + assinatura"
  - "financialEntryIdSchema: uuid com mensagem PT-BR"
  - "VoidEntryButton: a anulacao com desfazer por round-trip real de servidor, UM componente para as duas superficies"
  - "EarningsTable: a tabela de lancamentos, reusada pelo painel e pelo card do caso (prop hideCaseLink)"
  - "EarningsDailyChart: serie diaria no contrato do unico consumidor de grafico do repo"
  - "EarningsPeriodHeader: navegador de mes por search param + filtro mostrar anulados"
  - "CaseEarningsCard: Ganhos deste atendimento, so quando o caso tem lancamento"
  - "EarningsCards ganha tres slots (periodHeader / emptyState / children) para que o corpo da Faixa B viva dentro do MESMO Card"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Navegacao de periodo por search param puro: o RSC re-renderiza, o cliente nao faz fetch, e os meses vizinhos descem PRONTOS do servidor (um componente cliente num host em UTC erraria a virada do mes)"
    - "Datas exibidas por FATIA de string (yyyy-MM-dd -> dd/MM), nunca por new Date(): zero risco de fuso em rotulo de tabela, de dialogo e de eixo de grafico"
    - "Um formatador local (`const money = (v) => formatCentsToBRL(Number(v))`) reusado pelo tick do eixo e pelo tooltip — uma definicao, dois consumidores"
    - "Slots opcionais num componente ja aprovado em checkpoint, em vez de reescreve-lo: o caminho populado de 10-02 continua byte-identico"
    - "Reuso de tabela entre superficies com uma prop booleana de supressao (hideCaseLink) em vez de duas copias de markup"

key-files:
  created:
    - modules/financial-entries/list-financial-entries.ts
    - modules/financial-entries/list-financial-entries.spec.ts
    - modules/financial-entries/void-financial-entry.ts
    - modules/financial-entries/void-financial-entry.spec.ts
    - modules/financial-entries/restore-financial-entry.ts
    - actions/financial-entries/void-financial-entry.ts
    - actions/financial-entries/restore-financial-entry.ts
    - components/dashboard/earnings/void-entry-button.tsx
    - components/dashboard/earnings/earnings-table.tsx
    - components/dashboard/earnings/earnings-daily-chart.tsx
    - components/dashboard/earnings/earnings-period-header.tsx
    - components/dashboard/cases/case-earnings-card.tsx
  modified:
    - lib/schemas/financial-entry.ts
    - actions/financial-entries/index.ts
    - actions/index.ts
    - app/dashboard/earnings/page.tsx
    - app/dashboard/earnings/loading.tsx
    - components/dashboard/earnings/earnings-cards.tsx
    - components/dashboard/cases/case-detail-content.tsx

key-decisions:
  - "O card do caso REUSA EarningsTable em vez de recriar as linhas. Dois criterios de aceite (grep de `Anulado` e de `VoidEntryButton` DENTRO de case-earnings-card.tsx) ficam com 0 por consequencia — foram escritos assumindo duplicacao de markup. O reuso e mais forte que o criterio: garante literalmente as MESMAS colunas, o MESMO estilo, os MESMOS rotulos e o MESMO componente de anulacao, que era o objetivo."
  - "earnings-cards.tsx foi tocado apesar de nao estar em files_modified: e o arquivo que DONO do Card da Faixa B, e o UI-SPEC trava a contencao estrutural (nav + total + media + grafico + tabela num Card unico) como um dos quatro mecanismos de escopo duplo. Resolvido com tres slots opcionais, nao com reescrita."
  - "O mes navegado nao e aritmetica de string: `parse(mes, \"yyyy-MM\", now, { in: tz(CLINIC) })` + `isValid`, e qualquer coisa que nao case com `^\\d{4}-(0[1-9]|1[0-2])$` cai no mes corrente sem erro na tela."
  - "`prevMonth`/`nextMonth` descem como string ja resolvida no fuso da clinica. O navegador e um componente cliente e nao constroi data nenhuma."
  - "O rodape do card do caso reusa `getCaseEarningsTotals` de 10-04 (nao-anulados) em vez de somar: a lista mostra 3 linhas com 1 anulada e o rodape diz `2 lancamentos`, o que e a leitura correta — uma linha anulada nao e dinheiro."
  - "O card do caso so renderiza quando a lista tem linha E os totais nao sao null. Com os totais em null nao existe soma honesta para o rodape, e `Total: R$ 0,00` seria mentira."
  - "A lista do card do caso e limitada em altura (`max-h-64 overflow-y-auto`) ja agora, sem esperar o checkpoint: e o backstop de overflow de S4 resolvido por uma classe."
  - "`no-underline` no badge e no badge de forma de pagamento: `line-through` na linha e text-decoration e riscaria o badge junto."
  - "O gate `yarn lint` = 0 continua impossivel (baseline vermelho herdado). Lido como 'nenhum erro novo nos arquivos da fase', igual a 10-02/10-03/10-04."

patterns-established:
  - "Componente aprovado em checkpoint recebe SLOT, nunca reescrita: o caminho antigo fica como fallback (`periodHeader ?? <markup original>`) e o diff nao pode regredir o visual ja aprovado."
  - "Formatador local unico por arquivo de grafico, consumido pelo eixo e pelo tooltip."

requirements-completed: [EARN-03, EARN-04, EARN-05]

coverage:
  - id: D1
    description: "Anular e restaurar filtram por id E por perfil — o backstop de posse contra IDOR exigido por SC-4"
    requirement: EARN-05
    verification:
      - kind: unit
        ref: "modules/financial-entries/void-financial-entry.spec.ts — 5 testes: escopo por id, escopo por perfil, os dois juntos, patch com chave unica `voided_at` string, e o mesmo par de filtros no restore com `voided_at: null`"
        status: pass
      - kind: static
        ref: "grep: `eq(\"profile_id\"` = 1 e `eq(\"id\"` = 1 em void- e em restore-financial-entry.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "A policy de UPDATE do banco nao e uma porta de edicao de valor: so a coluna de anulacao e escrita"
    requirement: EARN-05
    verification:
      - kind: unit
        ref: "assert.deepEqual(Object.keys(patch), [\"voided_at\"]) nos dois modulos"
        status: pass
      - kind: static
        ref: "grep: `Pencil|editar valor|contentEditable|onDoubleClick` em earnings-table.tsx = 0; nenhuma afordancia de edicao em nenhuma linha de nenhuma das duas superficies"
        status: pass
    human_judgment: false
  - id: D3
    description: "Nenhuma camada exclui um lancamento e nada expira do lado do servidor"
    requirement: EARN-05
    verification:
      - kind: static
        ref: "grep: `\\.delete\\(` em modules/financial-entries/*.ts e actions/financial-entries/*.ts = 0; `setTimeout|expires_at|expiry|cron` nos mesmos = 0. A tabela tambem nao tem policy de DELETE (10-01), entao um caminho direto por PostgREST afeta zero linhas"
        status: pass
    human_judgment: false
  - id: D4
    description: "O default de anulados e seguro: sem pedir, linha anulada nao vem"
    requirement: EARN-05
    verification:
      - kind: unit
        ref: "modules/financial-entries/list-financial-entries.spec.ts — 5 testes: filtro aplicado com o parametro omitido, NAO aplicado quando ligado, perfil sempre filtrado, janela meio-aberta (gte from / lt to) + filtro por caso, e a ordenacao exata [received_on asc, created_at asc]"
        status: pass
    human_judgment: false
  - id: D5
    description: "O filtro de anulados e a ordenacao vivem no SQL, jamais num componente"
    requirement: EARN-05
    verification:
      - kind: static
        ref: "grep: `\\.filter\\([^)]*void` em components/dashboard/earnings/*.tsx e em case-earnings-card.tsx = 0; nenhum `.sort(` em nenhum dos dois; as linhas anuladas aparecem INTERCALADAS porque a ordem vem do SQL"
        status: pass
    human_judgment: false
  - id: D6
    description: "Nenhum total, media ou barra e calculado no cliente"
    requirement: EARN-04
    verification:
      - kind: static
        ref: "grep: `.reduce(` = 0 em todo components/dashboard/earnings/ e em case-earnings-card.tsx; nenhuma divisao sobre centavos fora do formatador; os seis escalares e a serie diaria vem de UMA chamada de get_earnings_summary, e o rodape do card do caso vem de getCaseEarningsTotals (soma no servidor)"
        status: pass
      - kind: manual_procedural
        ref: "checkpoint item 13 (reconciliacao ao centavo) — PENDENTE"
        status: pending
    human_judgment: true
    rationale: "So somar as linhas visiveis a mao prova que nenhuma soma escapou para o cliente."
  - id: D7
    description: "O desfazer e um round-trip REAL de servidor, gateado, seguido de refresh"
    requirement: EARN-05
    verification:
      - kind: static
        ref: "void-entry-button.tsx chama restoreFinancialEntryAction no handler da acao do toast; `router.refresh()` = 2 (um apos anular, um dentro do desfazer); os dois actions tem `profile.status !== \"paid\"`"
        status: pass
      - kind: manual_procedural
        ref: "checkpoint item 9 (rotulo Desfazer, ~8 s, numeros restaurados, e o desfazer indisponivel apos a expiracao do toast) — PENDENTE"
        status: pending
    human_judgment: true
  - id: D8
    description: "Escopo duplo: navegar move o periodo e NAO move os tres cards de hoje"
    requirement: EARN-03
    verification:
      - kind: static
        ref: "os cards da Faixa A leem today_cents/week_cents/month_cents, que a funcao SQL calcula sobre p_today e sao independentes de [p_from, p_to); o search param de mes toca somente monthStart/monthEnd/periodLabel/prevMonth/nextMonth"
        status: pass
      - kind: manual_procedural
        ref: "checkpoint itens 2 e 3 — PENDENTE"
        status: pending
    human_judgment: true
  - id: D9
    description: "O grafico segue o contrato do unico consumidor de grafico do repo e nao existe com serie vazia"
    requirement: EARN-03
    verification:
      - kind: static
        ref: "grep em earnings-daily-chart.tsx: width=\"100%\", height={240}, width={88}, strokeDasharray=\"3 3\", className=\"stroke-border\", tick={{ fontSize: 11 }} (2x), fill=\"var(--primary)\", isAnimationActive={false} — todos presentes; `test -f components/ui/chart.tsx` falha; `git diff --stat package.json yarn.lock` vazio; render condicionado a by_day.length > 0"
        status: pass
      - kind: manual_procedural
        ref: "checkpoint itens 4 e 5 — PENDENTE"
        status: pending
    human_judgment: true
  - id: D10
    description: "O card do caso so existe quando o caso faturou, e reusa a tabela e a anulacao do painel"
    verification:
      - kind: static
        ref: "render condicionado a `caseEntries.length > 0 && earningsTotals != null`; `VoidEntryButton` existe em UM arquivo e tem UM call site em todo o repo (earnings-table.tsx), servindo as duas superficies"
        status: pass
      - kind: manual_procedural
        ref: "checkpoint itens 14, 15, 16 e 17 — PENDENTE"
        status: pending
    human_judgment: true
  - id: D11
    description: "O trabalho de 10-04 em case-detail-content.tsx nao foi regredido"
    verification:
      - kind: static
        ref: "`git diff --stat` do arquivo: 16 insercoes, 0 remocoes; a cadeia earningsCount/earningsTotalCents/todayLabel e o CloseCaseWithEarningsDialog intactos"
        status: pass
    human_judgment: false

# Metrics
duration: 15min
completed: 2026-08-21
status: complete
---

# Phase 10 Plan 05: Painel completo + anulação com desfazer Summary

**A fase fecha: o médico navega por mês via search param (RSC, zero fetch no cliente), vê a série diária e a lista do período, e corrige um valor errado anulando — nunca apagando — com um "Desfazer" que é um round-trip real de servidor; o filtro de anulados, a ordenação e a exclusão dos anulados dos números vivem inteiramente no SQL.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 3 de 3 de código (a primeira em ciclo TDD RED→GREEN); o checkpoint visual de 18 itens está **DEFERIDO**
- **Files:** 19 (12 criados, 7 editados)
- **Commits:** 4

## Accomplishments

- **Anular é a única correção, e ela é escopada por posse.** `voidFinancialEntry` e `restoreFinancialEntry` filtram o update por `id` **E** por `profile_id` — as duas chamadas afirmadas por spec com mock gravador, com a mensagem do assert dizendo em voz alta que filtrar só por id é proibido (SC-4 / T-10-31). Nenhuma camada da fase exclui, e a tabela não tem policy de DELETE.
- **A policy de UPDATE não virou porta de edição de valor.** O patch dos dois módulos contém **uma única chave** — `assert.deepEqual(Object.keys(patch), ["voided_at"])`. É esse recorte, mais a ausência total de afordância de edição na UI, que fecha T-10-34.
- **O default de anulados é seguro e travado por spec.** `listFinancialEntries` sem o parâmetro esconde as linhas anuladas; toda tela que apenas lista herda o comportamento correto sem pedir por ele. Cinco testes cobrem o default, o opt-in, o escopo de perfil, a janela meio-aberta (`gte from` / `lt to`, igual à função SQL) e a ordenação **exata** `[received_on asc, created_at asc]` — é ela que faz as linhas anuladas aparecerem intercaladas em ordem de data em vez de empilhadas no fim.
- **Nenhum número nasce no cliente.** Os seis escalares e a série diária vêm de uma chamada de `get_earnings_summary`; o rodapé do card do caso vem de `getCaseEarningsTotals`. `grep -c '.reduce('` em `components/dashboard/earnings/` e em `case-earnings-card.tsx` retorna **0**, e não há divisão sobre centavos fora do formatador.
- **A navegação de período não faz fetch nenhum.** O search param muda, o RSC re-renderiza. O painel abre no mês corrente **sem parâmetro na URL** (D-16), e um parâmetro forjado ou inparseável cai no mês corrente sem erro na tela (T-10-32).
- **Zero construção de data no cliente.** Os meses vizinhos (`prevMonth`/`nextMonth`) são resolvidos no RSC no fuso da clínica e descem prontos. Os rótulos de data da tabela, do diálogo de anulação e do eixo do gráfico saem de **fatias de string** (`yyyy-MM-dd` → `dd/MM`), não de `new Date()` — num host em UTC depois das 21h de Brasília, construir data deslocaria a linha e a barra um dia, em silêncio.
- **O gráfico é reuso, não pacote novo.** Contrato copiado do único consumidor de gráfico do repo, com uma correção deliberada: o eixo Y tem **88px** e não 64, porque `R$ 1.200,00` não cabe em 64 — e a largura é a solução, nunca abreviar. `git diff --stat package.json yarn.lock` sai **vazio** e `components/ui/chart.tsx` não existe.
- **Um componente de anulação, duas superfícies.** `VoidEntryButton` tem **um** call site em todo o repo — dentro de `EarningsTable`, que por sua vez é reusada pelo painel e pelo card do caso. O `duration: 8000` é a deviação declarada da fase, marcada como tal no próprio arquivo.
- **O visual aprovado de `10-02` continua byte-idêntico no caminho populado.** `earnings-cards.tsx` ganhou três slots opcionais (`periodHeader ?? <markup original>`, `emptyState`, `children`) em vez de ser reescrito.
- **`10-04` não foi regredido:** `git diff --stat components/dashboard/cases/case-detail-content.tsx` = **16 inserções, 0 remoções**.
- **611 testes verdes** (+10 novos), `yarn typecheck` 0, `yarn build` 0.

## Task Commits

1. **Task 1 (RED):** spec do duplo filtro de posse e do default seguro de anulados — `c877af0` (test)
2. **Task 1 (GREEN):** três módulos, o schema do id e os dois actions gateados — `558d680` (feat)
3. **Task 2:** navegação de período, filtro, gráfico, tabela e a anulação com desfazer — `b3f7fd0` (feat)
4. **Task 3:** o card `Ganhos deste atendimento` dentro do caso — `e5325ce` (feat)
5. **Task 4 (checkpoint visual de 18 itens):** **DEFERIDO** para a verificação de fim de fase — window 3 do ledger

## Decisions Made

### 1. O card do caso reusa `EarningsTable` em vez de recriar as linhas

O plano pede "as MESMAS colunas, o mesmo estilo e os mesmos rótulos PT-BR da tabela do painel" e diz que "o card do caso é a versão curta da mesma tabela". A forma mais forte de garantir isso não é reescrever as linhas com cuidado — é **importar a tabela**. `case-earnings-card.tsx` renderiza `<EarningsTable entries={entries} hideCaseLink />`, e a única diferença de comportamento é a supressão do link para o caso, que dentro da página do próprio caso apontaria para a tela atual.

**Consequência assumida:** dois critérios de aceite ficam com 0 — `grep -c "Anulado"` e `grep -c "VoidEntryButton"` **dentro de** `case-earnings-card.tsx`. Eles foram escritos assumindo markup duplicado. A verificação equivalente, e mais forte, é: `VoidEntryButton` tem **uma** definição e **um** call site em todo o repo (`grep -rn 'VoidEntryButton' components/` → 5 linhas, todas nos dois arquivos de `components/dashboard/earnings/`), e o badge `Anulado` mais a linha riscada chegam ao card pela mesma tabela do painel — impossível divergirem.

### 2. `earnings-cards.tsx` foi tocado, e não estava em `files_modified`

O plano lista o header, o gráfico e a tabela como arquivos novos e manda renderizá-los "dentro da Faixa B" — mas o `Card` da Faixa B é propriedade de `earnings-cards.tsx`, que não está na lista. Isso é uma lacuna do plano, e as duas saídas honestas eram (a) mover a Faixa B para a página, arriscando o visual que o checkpoint de `10-02` já aprovou, ou (b) dar slots ao componente existente.

Escolhida a (b), porque o UI-SPEC trava a **contenção estrutural** como um dos quatro mecanismos de escopo duplo: "Band B — nav, total, average, chart, table — is a **single `Card`**". Pendurar o gráfico e a tabela fora do Card quebraria o mecanismo. Três props opcionais (`periodHeader`, `emptyState`, `children`), e o header inline original permanece como fallback — o caminho populado de `10-02` não mudou uma classe.

### 3. O mês navegado é parseado, não montado por concatenação

`parse(mes, "yyyy-MM", now, { in: tz(CLINIC_TIME_ZONE) })` seguido de `isValid`, com um teste de forma (`^\d{4}-(0[1-9]|1[0-2])$`) antes. Qualquer coisa fora disso cai no mês corrente. A função SQL recebe parâmetros **tipados como data**, então não existe caminho de string do search param para o SQL (T-10-32).

### 4. `prevMonth`/`nextMonth` descem prontos do servidor

O navegador é um componente cliente. Se ele calculasse "mês anterior", faria isso no fuso do navegador — e na virada do mês, num host em UTC, apontaria para o mês errado. O RSC já tem o contexto de fuso da clínica montado, então resolve os dois vizinhos e passa como string. O componente cliente não contém uma única construção de data.

### 5. O rodapé do card do caso conta só os não-anulados — de propósito

Reusa `getCaseEarningsTotals` de `10-04`, que filtra `voided_at is null`. Um caso com 3 lançamentos, 1 anulado, mostra **3 linhas** (uma riscada) e o rodapé lê `2 lançamentos` com a soma de 2. Não é inconsistência: a lista é o registro de auditoria, o rodapé é dinheiro, e uma linha anulada não é dinheiro.

### 6. O card do caso não renderiza quando os totais falham

`caseEntries.length > 0 && earningsTotals != null`. Com os totais em `null` não existe soma honesta para o rodapé, e `Total: R$ 0,00` sobre três linhas visíveis seria uma mentira pior que a ausência do card. A leitura da lista também tolera falha (`.catch(() => [])`) — nenhuma das duas derruba a página de detalhe do caso.

### 7. O backstop de overflow de S4 foi resolvido agora, não deferido

`max-h-64 overflow-y-auto` na lista do card. O plano manda "avaliar no checkpoint se cresce demais e registrar a decisão de cap"; um caso com consulta, vários procedimentos e re-lançamentos após anulação cresce sem limite por construção, e o cap é uma classe. O rodapé fica fora do scroll, sempre visível.

### 8. `no-underline` nos badges

`line-through` na `<TableRow>` é `text-decoration` e **herda**: sem isso, o badge `Anulado` e o badge de forma de pagamento sairiam riscados junto com o texto. `no-underline` (`text-decoration-line: none`) corta a herança nos dois.

### 9. Um formatador local no gráfico, dois consumidores

`const money = (value: unknown) => formatCentsToBRL(Number(value))`, usado pelo `tickFormatter` do eixo e pelo `formatter` do tooltip. Duas arrow functions idênticas seriam duas oportunidades de divergirem — e uma delas passando a abreviar quebraria a reconciliação ao centavo.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `earnings-cards.tsx` não estava em `files_modified`, mas é o dono do Card da Faixa B**

- **Found during:** Task 2
- **Issue:** o plano manda renderizar o header de período, o gráfico e a tabela "dentro da Faixa B", e a Faixa B é um `Card` que vive inteiro em `earnings-cards.tsx` — arquivo ausente de `files_modified`. Sem tocá-lo, o gráfico e a tabela só poderiam ir para FORA do Card, quebrando o mecanismo de contenção estrutural que o UI-SPEC trava.
- **Fix:** três props opcionais (`periodHeader`, `emptyState`, `children`). O header inline original de `10-02` permanece como fallback via `periodHeader ?? (...)`, e o caminho populado não mudou nenhuma classe — o visual aprovado no checkpoint de `10-02` está preservado por construção.
- **Files modified:** `components/dashboard/earnings/earnings-cards.tsx`
- **Commit:** `b3f7fd0`

**2. [Decisão de arquitetura] Dois critérios de aceite de `case-earnings-card.tsx` ficam com 0 porque o card reusa a tabela**

- **Found during:** Task 3
- **Issue:** os critérios pedem `grep -c "Anulado"` e `grep -c "VoidEntryButton"` ≥ 1 **dentro de** `case-earnings-card.tsx`. Satisfazê-los exige recriar as linhas da tabela no card — ~50 linhas de markup duplicado que precisariam ficar visualmente em sincronia com o painel para sempre.
- **Fix:** o card importa `EarningsTable`. Verificação equivalente e mais forte: `VoidEntryButton` tem **uma** definição e **um** call site no repo inteiro; o badge `Anulado` e a linha riscada chegam ao card pelo mesmo componente que os desenha no painel. A intenção dos dois critérios ("reusado, não recriado" e "anulados riscados com badge") está satisfeita com mais garantia, não menos.
- **Files modified:** `components/dashboard/cases/case-earnings-card.tsx`, `components/dashboard/earnings/earnings-table.tsx` (prop `hideCaseLink`)
- **Commit:** `e5325ce`

**3. [Rule 2 - Missing Critical] O estado "filtro ligado, nada anulado" precisava de um segundo lugar**

- **Found during:** Task 2
- **Issue:** o plano põe `Nenhum lançamento anulado neste período.` no bloco de estado vazio, mas o **item 11 do checkpoint** descreve um mês **com** lançamentos e nenhum anulado, com o filtro ligado. Com o filtro ligado a listagem devolve todas as linhas, então a lista **não está vazia** e o bloco de estado vazio nunca apareceria — o item 11 seria impossível de aprovar como escrito.
- **Fix:** a cópia existe nos dois lugares. (a) Lista vazia + filtro ligado → o bloco tracejado substitui o corpo da Faixa B, com a cópia de auditoria e **sem CTA**. (b) Lista não vazia + filtro ligado + nenhuma linha anulada → uma nota tracejada abaixo da tabela, com a mesma cópia e sem CTA. As duas leituras do plano ficam verdadeiras.
- **Files modified:** `app/dashboard/earnings/page.tsx`
- **Commit:** `b3f7fd0`

**4. [Rule 3 - Blocking] `yarn lint` = 0 continua impossível (baseline herdado)**

Idêntico ao registrado em `10-02`, `10-03` e `10-04`: o repo tem ~1493 erros pré-existentes em 13 arquivos, 5 deles em diretórios de scaffolding **gitignored** que o `eslint.config.mjs` não ignora. Nenhum é desta fase e a correção certa (um `ignores` no config) é mudança de tooling fora do escopo (SCOPE BOUNDARY). O critério foi lido como **"nenhum erro novo nos arquivos da fase"** e verificado com `npx eslint` sobre cada arquivo criado/modificado: **0 erros, 0 warnings**.

**5. [Correção de ledger] O bloco JSON de `.planning/WINDOWS.md` estava dessincronizado da tabela**

A window 1 estava `fixed` na tabela markdown (com razão e `resolved_at` preenchidos por `10-04`) mas ainda `open` no bloco JSON, o que fazia `gsd-tools windows append` recusar a escrita com *"Ledger counts disagree with entries"*. O status no JSON foi alinhado ao da tabela antes de registrar a window 3. Nenhum dado perdido; só a duplicata desatualizada corrigida.

---

**Total deviations:** 2 estruturais (arquivo fora da lista, critério de aceite substituído por um mais forte), 1 missing critical (o estado do item 11 do checkpoint), 1 gate impossível herdado, 1 correção de ledger.
**Impact on plan:** nenhum scope creep. Um arquivo fora de `files_modified` (`earnings-cards.tsx`), tocado por três props opcionais que preservam o visual aprovado. Nenhum pacote novo, nenhuma migration, nenhum arquivo apagado.

## Verification Evidence

| Gate | Resultado |
| --- | --- |
| `yarn test` | **611 pass / 0 fail** (601 do baseline + 5 de `void-financial-entry.spec.ts` + 5 de `list-financial-entries.spec.ts`) |
| `yarn typecheck` | 0 |
| `yarn build` | 0 |
| `npx eslint` nos 19 arquivos do plano | 0 erros, 0 warnings |
| `yarn lint` (repo inteiro) | vermelho no baseline, nenhum arquivo desta fase (deviation #4) |

**Estática — contagens dos critérios de aceite:**

| Verificação | Esperado | Resultado |
| --- | --- | --- |
| `eq("profile_id"` / `eq("id"` em `void-financial-entry.ts` | 1 / 1 | **1 / 1** |
| `eq("profile_id"` / `eq("id"` em `restore-financial-entry.ts` | 1 / 1 | **1 / 1** |
| `is("voided_at", null)` em `list-financial-entries.ts` | 1 | **1** (dentro do ramo condicionado ao parâmetro) |
| `order(` em `list-financial-entries.ts` | 2 | **2** |
| `\.delete\(` em `modules/financial-entries/*.ts` + `actions/financial-entries/*.ts` | 0 | **0** |
| `profile.status !== "paid"` nos dois actions novos | os 2 arquivos | **os 2** |
| `revalidatePath` em `void-financial-entry.ts` (action) | ≥ 1 | **3** |
| `next/cache` ou `next/headers` em `modules/financial-entries/*.ts` | 0 | **0** |
| `setTimeout|expires_at|expiry|cron` em módulos + actions de lançamento | 0 | **0** |
| chaves do objeto de `.update(` em `void-financial-entry.ts` | 1 (`voided_at`) | **1**, afirmado por spec |
| gráfico: `width="100%"`, `height={240}`, `width={88}`, `strokeDasharray="3 3"`, `className="stroke-border"`, `tick={{ fontSize: 11 }}`, `fill="var(--primary)"`, `isAnimationActive={false}` | presentes | **todos presentes** |
| `formatCentsToBRL` em `earnings-daily-chart.tsx` | 2 | **2** (import + o formatador único) |
| `test -f components/ui/chart.tsx` | falha | **falha** |
| `git diff --stat package.json yarn.lock` | vazio | **vazio** |
| `size-7` / `h-7` em `earnings-period-header.tsx` | 2 / 1 | **2 / 1** |
| `Período`, `Hoje`, `mostrar anulados`, `aria-label="Anterior"`, `aria-label="Próximo"` | presentes | **1 cada** |
| `Data`, `Descrição`, `Forma`, `Valor`, `Anulado`, `truncate max-w-[28ch]`, `text-right` em `earnings-table.tsx` | presentes | **1 / 1 / 1 / 1 / 1 / 2 / 3** |
| `Pencil|editar valor|contentEditable|onDoubleClick` em `earnings-table.tsx` | 0 | **0** |
| `text-destructive|bg-destructive` em `earnings-table.tsx` e em `case-earnings-card.tsx` | 0 | **0 / 0** |
| `Anular lançamento?`, `Anular lançamento`, `Lançamento anulado.`, `Desfazer`, `Anulação desfeita.`, `duration: 8000`, `variant="destructive"` no botão de anular | presentes | **todos presentes** |
| `router.refresh()` em `void-entry-button.tsx` | ≥ 2 | **2** |
| `\.filter\([^)]*void` em `components/dashboard/earnings/*.tsx` e `case-earnings-card.tsx` | 0 | **0** |
| `.reduce(` em `components/dashboard/earnings/*.tsx` e `case-earnings-card.tsx` | 0 | **0** |
| hex / `rgb(` / `font-bold` em `components/dashboard/earnings/*.tsx` | 0 | **0 / 0 / 0** |
| as 4 strings de estado vazio + `border-dashed` em `page.tsx` | presentes | **todas** (`border-dashed` = 2: bloco vazio + nota do item 11) |
| `Ganhos deste atendimento`, `lançamento`, `lançamentos`, `tabular-nums` em `case-earnings-card.tsx` | presentes | **presentes** |
| `Anulado` / `VoidEntryButton` **dentro de** `case-earnings-card.tsx` | 1 / 1 | **0 / 0** — substituído por `EarningsTable` (deviation #2) |
| `listFinancialEntries` em `case-detail-content.tsx` | 1 call site | **1** (2 linhas: import + chamada), com `caseId` e o flag de anulados |
| `CaseEarningsCard` em `case-detail-content.tsx` | ≥ 1 | **2** (import + render), condicionado ao tamanho da lista |
| `git diff --stat components/dashboard/cases/case-detail-content.tsx` | só adições | **16 inserções, 0 remoções** |
| `VoidEntryButton` no repo | 1 definição, 1 call site | **1 / 1** |

## Known Stubs

Nenhum. Varredura por `TODO`, `FIXME`, `placeholder`, `coming soon` e valores vazios cabeados nos 19 arquivos: zero ocorrências.

## Threat Flags

Nenhuma superfície de segurança nova fora do `<threat_model>` do plano. `T-10-31` (IDOR na anulação), `T-10-32` (search param forjado), `T-10-33` (leitura alheia), `T-10-34` (update como edição de valor), `T-10-35` (perda de trilha por exclusão), `T-10-36` (desfazer sem gate), `T-10-37` (erro cru no toast) e `T-10-38` (soma no cliente) foram todos implementados como escrito. `T-10-SC` continua `accept` com zero pacotes novos.

## Outstanding — o checkpoint visual [BLOCKING] foi DEFERIDO, não aprovado

`workflow.human_verify_mode` é `end-of-phase` e o usuário decidiu explicitamente rodar toda a verificação visual restante da fase em uma passada só, no fim. A Task 4 (`checkpoint:human-verify`, `gate="blocking"`, 18 itens) **não foi executada** e está registrada como **window 3** (`unrun-verify`, `open`) em `.planning/WINDOWS.md`, ao lado da window 2 (o checkpoint de 21 itens de `10-04`).

**O item 13 é o mais importante:** se o total não fechar ao centavo, alguma soma escapou para o cliente.

O servidor de desenvolvimento já está rodando na porta 3000 — reusar, não subir um segundo. Sinal de retomada: `aprovado`, ou o que divergiu item por item.

### Os 18 itens do UAT, na íntegra

1. Abrir `/dashboard/earnings`. Confirmar que abre no **mês atual** e que a URL **não** tem search param de mês na primeira carga.
2. **Escopo duplo.** Clicar no botão de mês anterior. Confirmar que gráfico, tabela, total e média trocam, que os **três cards da Faixa A não mudam nada**, que o badge `Sempre o mês atual` aparece ao lado do título da Faixa A, e que o rótulo do período no header da Faixa B fica em peso médio e cor de texto normal (não muted). Clicar em `Hoje` e confirmar que o badge desaparece.
3. **Navegador de período.** Confirmar visualmente que os botões de anterior/próximo têm o MESMO tamanho dos do navegador da agenda (28px) — não maiores.
4. **Período vazio.** Navegar para um mês sem lançamento. Confirmar que **o gráfico não aparece** (não um eixo vazio), que o bloco tracejado com `Nenhum lançamento neste período.` ocupa o corpo da Faixa B com o CTA `Novo lançamento`, e que os cards da Faixa A continuam com os valores de hoje.
5. **Gráfico.** Com lançamentos em vários dias do mês, confirmar: uma barra por dia, altura numérica fixa, eixo X só com o dia do mês, eixo Y com valores em reais **completos e sem abreviação** (verificar especificamente que `R$ 1.200,00` cabe — é a razão do eixo ter 88px), tooltip mostrando valor formatado e o rótulo prefixado com Dia, e **nenhuma animação** ao carregar.
6. **Tabela.** Confirmar as quatro colunas com os cabeçalhos exatos, o valor alinhado à **direita** com dígitos de largura fixa, o badge PT-BR da forma de pagamento, e o nome do paciente virando link para o caso quando o lançamento tem caso.
7. **Backstop de texto longo (S1).** Criar um avulso com descrição de ~200 caracteres. Confirmar que a célula truncada mostra o tooltip com o texto completo e que a **coluna de valor não sai da tela**.
8. **Anulação.** Clicar em anular numa linha. Confirmar o título `Anular lançamento?`, que a descrição cita o valor e a data daquele lançamento, e que ela diz explicitamente que não se pode editar valores, só anular e lançar de novo. Confirmar. Confirmar que a linha desaparece da lista (filtro desligado) e que **cards, total, média e gráfico caem** imediatamente, sem F5.
9. **Desfazer.** No toast, confirmar o rótulo `Desfazer`. **Contar mentalmente:** o toast tem de ficar ~8 segundos (não ~4). Clicar em `Desfazer` e confirmar `Anulação desfeita.`, a linha de volta e todos os números restaurados. Repetir e deixar o toast expirar: confirmar que aí o desfazer não está mais disponível em lugar nenhum (a anulação ficou definitiva na prática).
10. **Filtro de anulados.** Marcar `mostrar anulados`. Confirmar que as linhas anuladas aparecem **intercaladas em ordem de data** (não empilhadas no fim), em `line-through` e cor muted, com o badge `Anulado`, **sem** botão de anular, e **sem nenhuma cor destrutiva ou vermelha**. Confirmar que os cards, o total, a média e o gráfico **não mudaram** ao ligar o filtro — os anulados nunca entram nos números.
11. **Filtro ligado, nada anulado.** Navegar para um mês com lançamentos mas nenhum anulado, com o filtro ligado. Confirmar `Nenhum lançamento anulado neste período.` com o corpo sobre auditoria e **sem CTA**. *(Nota do executor: isto aparece como uma nota tracejada abaixo da tabela — a lista não está vazia. Ver deviation #3.)*
12. **Nenhuma edição de valor.** Percorrer a tabela procurando qualquer afordância de editar valor: ícone de lápis, duplo-clique numa célula, menu de contexto. **Nada disso pode existir.**
13. **Reconciliação ao centavo (SC-3).** Somar à mão os valores visíveis da tabela do período e conferir contra o card `Total do período`. Tem de fechar **exatamente**, ao centavo — é por isso que nenhum valor é abreviado em nenhum lugar. Conferir também que a média mostrada é o total dividido pela contagem impressa na sub-linha.
14. **S4.** Abrir um caso que foi encerrado com lançamento. Confirmar o card `Ganhos deste atendimento` com as mesmas colunas do painel, o rodapé com o total e a contagem no plural correto. Anular por ali e confirmar que o painel de Ganhos reflete a queda.
15. **S4 vazio.** Abrir um caso sem faturamento. Confirmar que o card **não existe** — nem vazio, nem com mensagem.
16. **Backstop overflow (S4).** Num caso com muitos lançamentos (consulta + vários procedimentos + re-lançamentos após anulação), avaliar se o card cresce sem limite dentro da página de detalhe. *(Nota do executor: já limitado em `max-h-64 overflow-y-auto` — confirmar que o scroll interno funciona e o rodapé segue visível. Ver decisão 7.)*
17. **Backstop zero-um-muitos (S4).** Confirmar que o rodapé lê o singular com um lançamento e o plural com vários. *(Nota do executor: a contagem é de NÃO-anulados — um caso com 3 linhas e 1 anulada lê `2 lançamentos` por design. Ver decisão 5.)*
18. Testar em tema escuro e claro: nenhum verde e nenhum vermelho significando dinheiro em nenhuma das duas superfícies.

## Issues Encountered

- **`grep -c` conta LINHAS, não ocorrências, e o import conta.** Três critérios de aceite pediam contagem exata de um símbolo importado (`formatCentsToBRL` = 2 no gráfico, `listFinancialEntries` = 1 em `case-detail-content.tsx`). No gráfico isso levou à solução melhor — um formatador local único consumido pelo eixo e pelo tooltip, o que dá exatamente 2 linhas. Em `case-detail-content.tsx` a contagem natural é 2 (import + chamada) para **um** call site; `10-04` já tinha reportado "1" com a mesma convenção em `findOwnedCaseId`. Nenhum dos dois é problema real, mas quem escrever critérios de contagem deve contar o import.
- **O ledger de windows estava internamente inconsistente** (tabela markdown vs. bloco JSON), e a ferramenta recusou a escrita até o alinhamento. Vale conferir se `windows fixed` atualiza os dois blocos.
- **Nenhuma verificação de gate de action sob teste unitário**, pelo mesmo motivo de `10-02`: o runner é `find modules lib -name '*.spec.ts'`, e actions não são coletados. Os quatro gates novos (sessão ausente e assinatura, nos dois actions) estão verificados por inspeção estática e ficam cobertos de fato pelo checkpoint deferido.
- **MCP do Supabase não foi necessário.** A precondição da Task 1 (coluna de anulação + policy de UPDATE + ausência de policy de DELETE) foi confirmada na migration em disco (`20260821000100_financial_entries.sql`, linhas 93, 152-155 e o comentário da linha 167) somada às verificações contra o banco vivo já registradas em `10-02` e `10-04`. Nenhuma migration criada neste plano.

## Next Phase Readiness

**A fase 10 está completa em código: EARN-01 a EARN-05.**

**Duas windows abertas, as duas de verificação visual, as duas da fase 10:**
- **window 2** — checkpoint de 21 itens de `10-04` (S3 encerramento com ganhos + S7 bloqueio da exclusão)
- **window 3** — checkpoint de 18 itens deste plano (S1 painel completo + S4 card no caso)

`/gsd-ship` bloqueia enquanto houver window aberta, e é isso que se quer: nenhum requisito desta fase pode ser considerado verificado antes da passada de UAT de fim de fase. Os dois roteiros estão transcritos na íntegra nos respectivos SUMMARY, então o UAT pode ser montado sem reabrir nenhum PLAN.

**Para quem tocar este código depois:**
- `formatCentsToBRL` e `parseBrlToCents` seguem sendo os **únicos**. Um segundo formatador quebra SC-3.
- **`VoidEntryButton` tem um call site.** Se uma terceira superfície precisar anular, ela usa `EarningsTable` ou o botão direto — não uma terceira cópia.
- **`duration: 8000` NÃO é padrão do repo.** Foi introduzido aqui, para uma correção financeira. Não citar como precedente e não alinhar outros toasts a ele.
- **Nada expira no servidor.** Se alguém pedir "expirar o desfazer", a resposta é que a janela já é a vida do toast: uma coluna de validade ou um job de limpeza seria requisito inventado (D-22).
- **Corrigir um valor é anular e lançar de novo.** Não existe afordância de edição em nenhuma linha, em nenhuma superfície, e a policy de UPDATE só escreve `voided_at`. Adicionar edição inline reabre T-10-34.
- **Um caso com QUALQUER lançamento — anulado ou não — nunca pode ser excluído.** A FK é `on delete restrict` e não olha para `voided_at`. Anular serve para corrigir um valor, nunca para liberar a exclusão.

---
*Phase: 10-livro-caixa-de-ganhos-painel*
*Completed: 2026-08-21*
