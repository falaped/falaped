---
phase: 10-livro-caixa-de-ganhos-painel
plan: 02
subsystem: frontend
tags: [rsc, server-actions, zod, react-hook-form, money, timezone, tdd, shadcn]

requires:
  - phase: 10-01
    provides: "public.financial_entries, o enum public.payment_method e get_earnings_summary(uuid, date, date, date) aplicados ao banco vivo"
  - phase: 06-disponibilidade
    provides: "lib/clinic-timezone.ts (CLINIC_TIME_ZONE) e o padrão `{ in: tz(...) }` de aritmética de calendário"
  - phase: 03-crescimento
    provides: "lib/brazilian-date-form.ts (maskBrazilianDateInput, parseBrazilianDateStringToIso) e o molde de campo decimal + data mascarada de measurement-form.tsx"
provides:
  - "parseBrlToCents (lib/money.ts) — o ÚNICO parse de dinheiro da fase, reais digitados/colados → centavos inteiros"
  - "formatCentsToBRL (lib/formatters.ts) — o ÚNICO formatador de moeda da fase, instância única de Intl"
  - "lib/schemas/financial-entry.ts — enum espelhado, PAYMENT_METHOD_LABEL e standaloneFinancialEntrySchema com as mensagens travadas"
  - "modules/financial-entries — types (FinancialEntry, EarningsSummary), getEarningsSummary (leitura via .rpc) e createFinancialEntries (insert único)"
  - "createStandaloneFinancialEntryAction — action de escrita do avulso com gate auth+paid e safeParse no boundary"
  - "Rota /dashboard/earnings (page + loading) e components/dashboard/earnings/* (S1 e S2)"
  - "components/segmented-toggle.tsx — SegmentedToggle reusável (cópia verbatim do controle da agenda)"
  - "Grupo Financeiro › Ganhos no menu lateral"
affects: [10-03, 10-04, 10-05]

tech-stack:
  added: []
  patterns:
    - "Contrato de moeda de duas funções: um parse (centavos) e um formatador (apresentação), ambos com spec — nenhuma aritmética de dinheiro em componente"
    - "Fuso derivado UMA vez no RSC e descendo como `date`/rótulo pronto: nenhum componente cliente constrói a data de hoje"
    - "Cliente submete o valor CRU do form e o action re-valida — o schema roda uma vez só, no boundary (evita o double-parse de 260701-ctf)"
    - "Prosa de código não pode conter os literais que os critérios de aceite contam (mesma disciplina que 10-01 impôs aos comentários de migration)"
    - "Zero na média renderiza travessão, não R$ 0,00 — ausência de dado e valor zero são coisas diferentes na tela"

key-files:
  created:
    - lib/money.ts
    - lib/money.spec.ts
    - lib/schemas/financial-entry.ts
    - lib/schemas/financial-entry.spec.ts
    - modules/financial-entries/types.ts
    - modules/financial-entries/get-earnings-summary.ts
    - modules/financial-entries/create-financial-entries.ts
    - modules/financial-entries/create-financial-entries.spec.ts
    - actions/financial-entries/create-standalone-financial-entry.ts
    - actions/financial-entries/index.ts
    - app/dashboard/earnings/page.tsx
    - app/dashboard/earnings/loading.tsx
    - components/dashboard/earnings/earnings-cards.tsx
    - components/dashboard/earnings/standalone-entry-dialog.tsx
    - components/segmented-toggle.tsx
  modified:
    - lib/formatters.ts
    - actions/index.ts
    - components/app-sidebar.tsx

key-decisions:
  - "parseBrlToCents NÃO segue a ordem literal de passos do plano: os passos contradiziam a própria tabela <behavior> no caso obrigatório \"150.05\". Regra implementada: com vírgula, o ponto é milhar; sem vírgula, o ponto é decimal, exceto no padrão brasileiro puro de milhar (1.500 → 150000)"
  - "O cliente envia o valor CRU do form (form.getValues()) e não o transformado pelo resolver — enviar o transformado parsearia centavos como se fossem reais e ISO como se fosse dd/mm/aaaa (o bug de double-parse que o quick 260701-ctf já custou uma vez)"
  - "Os três cards da Faixa A são escritos por extenso, sem helper compartilhado, seguindo o molde de dashboard-home-content.tsx — cada valor carrega o próprio tabular-nums à vista do revisor"
  - "monthLabel (Faixa A, sempre o mês corrente) e periodLabel (Faixa B, o período navegado) nascem como duas derivações separadas ainda que coincidam hoje: 10-05 mexe só na segunda"
  - "yarn lint com código 0 é inalcançável neste repo (13 arquivos vermelhos no baseline, nenhum desta fase). O critério foi lido como 'nenhum erro novo nos arquivos da fase' e verificado com npx eslint arquivo por arquivo"

patterns-established:
  - "SegmentedToggle vive em components/ (nível pattern) e é duplicação deliberada: availability-panel.tsx NÃO foi re-apontado, para não arriscar regressão visual num controle da agenda fora do escopo"
  - "Exceções de 6px (gap-1.5/py-1.5) preservadas byte-a-byte do controle original — arredondar para a escala de 4px produziria duas versões visualmente diferentes do mesmo controle"

requirements-completed: [EARN-02, EARN-03, EARN-04]

coverage:
  - id: D1
    description: "Contrato de moeda: parseBrlToCents devolve centavos inteiros e sobrevive a colar real; formatCentsToBRL é o único formatador, com instância única de Intl"
    requirement: EARN-02
    verification:
      - kind: unit
        ref: "lib/money.spec.ts — 16 testes: \"250\", \"250,00\", \"1.500,50\", \"0,01\", \"150.05\", \"R$ 1.500,50\", \" 250 \", \"1500.50\", \"1.500\", \"abc\", \"\", \" \", \"-5\" + 3 de formatação"
        status: pass
      - kind: other
        ref: "grep: parseBrlToCents == 1, formatCentsToBRL == 1, new Intl.NumberFormat == 1 (escopo de módulo), lib/currency.ts não existe"
        status: pass
    human_judgment: false
  - id: D2
    description: "Schema do avulso valida os quatro campos com as mensagens PT-BR travadas e nunca carrega case_id"
    requirement: EARN-02
    verification:
      - kind: unit
        ref: "lib/schemas/financial-entry.spec.ts — 1 centavo aceito, zero rejeitado com a mensagem de cortesia, vazio, inparseável, descrição só de espaços, \"\"/\"21/08\"/\"31/02/2026\", forma ausente, colar com prefixo, acentos preservados"
        status: pass
      - kind: other
        ref: "grep: as 6 mensagens travadas presentes literalmente; z.enum com pix/cash/card/insurance na ordem do pg enum; parseBrazilianDateStringToIso usado (sem regex própria de data)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Painel lê os seis números de UMA chamada a get_earnings_summary com as datas resolvidas no fuso da clínica pelo RSC"
    requirement: EARN-03
    verification:
      - kind: build
        ref: "yarn build código 0 com /dashboard/earnings na saída; yarn typecheck código 0"
        status: pass
      - kind: other
        ref: "grep: rpc(\"get_earnings_summary\") == 1, [EARNINGS] >= 1, next/cache|next/headers em modules/financial-entries == 0, CLINIC_TIME_ZONE + tz( presentes, toISOString em código == 0"
        status: pass
      - kind: manual
        ref: "Checkpoint visual item 2 — duas faixas separadas, cada card da Faixa A imprimindo o intervalo literal que cobre (aprovado pelo usuário)"
        status: pass
    human_judgment: true
  - id: D4
    description: "Gate de assinatura no RSC e no action (a RLS `to authenticated` não impõe assinatura)"
    requirement: EARN-03
    verification:
      - kind: other
        ref: "grep: profile.status !== \"paid\" no RSC com redirect para /dashboard/link-whatsapp, e no action devolvendo result union; profile.id usado no action, nenhum profile_id lido do payload"
        status: pass
      - kind: manual
        ref: "Checkpoint visual item 12 — usuário sem paid redirecionado de /dashboard/earnings para /dashboard/link-whatsapp (aprovado)"
        status: pass
    human_judgment: true
  - id: D5
    description: "Média renderizada como chega do SQL, com denominador impresso e travessão quando não há atendimento"
    requirement: EARN-04
    verification:
      - kind: manual
        ref: "Checkpoint visual itens 3/4/5 — banco vazio mostra travessão + `Nenhum atendimento cobrado no período.`; 1 lançamento dá singular; 2 lançamentos dão R$ 175,00 com plural, fechando ao centavo (aprovado)"
        status: pass
      - kind: other
        ref: "grep: nenhuma divisão nem .reduce( sobre dinheiro em earnings-cards.tsx; tabular-nums em 6 pontos; formatCentsToBRL em 6"
        status: pass
    human_judgment: true
  - id: D6
    description: "Escrita do avulso: um único insert, profile_id do gate, e o total sobe sem F5"
    requirement: EARN-02
    verification:
      - kind: unit
        ref: "modules/financial-entries/create-financial-entries.spec.ts — 1 insert para 2 linhas, profile_id do argumento sobrescreve um profile_id forjado no payload, ids devolvidos, erro com tag [EARNINGS]"
        status: pass
      - kind: manual
        ref: "Checkpoint visual itens 4/5/11 — avulso de 250,00 e de 100,00 movem os cards sem F5; colar `R$ 1.500,50` grava 150050 (aprovado)"
        status: pass
      - kind: other
        ref: "grep: .insert( == 1 (nenhum laço), revalidatePath >= 1, router.refresh() >= 1"
        status: pass
    human_judgment: true
  - id: D7
    description: "Guarda de descarte e grupo segmentado sem default (S2)"
    requirement: EARN-02
    verification:
      - kind: manual
        ref: "Checkpoint visual itens 6/7/8 — Esc e clique no backdrop não descartam com o form sujo, Cancelar descarta; nenhuma forma pré-selecionada e nenhum clique de segmento submete; 0,00 mostra a mensagem de cortesia (aprovado)"
        status: pass
      - kind: other
        ref: "grep: onEscapeKeyDown == 1, onPointerDownOutside == 1, type=\"button\"/aria-pressed/py-1.5 == 1 cada no SegmentedToggle, <Select|SelectTrigger == 0, type=\"date\"|react-day-picker == 0, new Date( em código == 0"
        status: pass
    human_judgment: true
  - id: D8
    description: "S1 overflow e S2 long-text (backstops do UI-SPEC)"
    verification:
      - kind: manual
        ref: "Checkpoint visual itens 9/10 — R$ 145.320,00 renderiza inteiro no card sem quebra e sem abreviação; descrição de ~200 caracteres rola horizontalmente sem deslocar rótulo nem erro (aprovado)"
        status: pass
    human_judgment: true
  - id: D9
    description: "Menu lateral ganha Financeiro › Ganhos sem reintroduzir o grupo de agenda removido em 4475d4d"
    verification:
      - kind: other
        ref: "grep -v '^\\s*//' components/app-sidebar.tsx | grep -cE 'title: \"Agend|CalendarIcon' == 0; \"Financeiro\" e /dashboard/earnings presentes"
        status: pass
      - kind: manual
        ref: "Checkpoint visual item 1 — grupo Financeiro com ícone de carteira, nenhum grupo de agenda (aprovado)"
        status: pass
    human_judgment: true

duration: 43min
completed: 2026-08-21
status: complete
---

# Phase 10 Plan 02: Fatia Vertical de Ganhos Summary

**A fatia vertical ponta-a-ponta do livro-caixa: o médico abre Ganhos pelo menu, vê seis números agregados por uma única chamada SQL com as datas resolvidas no fuso da clínica pelo RSC, cria um lançamento avulso pelo diálogo e vê o total subir sem recarregar — com o contrato de moeda (um parse, um formatador) travado em spec e nenhuma aritmética de dinheiro em componente React.**

## Performance

- **Duration:** ~43 min (incluindo o checkpoint visual bloqueante de 12 itens)
- **Tasks:** 3 de implementação (duas em ciclo TDD RED→GREEN) + 1 checkpoint aprovado
- **Files:** 15 criados, 3 modificados (todos os 3 por append/apêndice, nenhuma reescrita)
- **Commits:** 6

## Accomplishments

- **O contrato de moeda existe e é o único caminho do dinheiro.** `parseBrlToCents` (centavos inteiros) e `formatCentsToBRL` (apresentação) são as duas únicas funções que tocam valores monetários em JavaScript. A divisão por 100 acontece em UM lugar e o resultado nunca volta ao banco. 16 testes cobrem o parse, incluindo o colar real (`R$ 1.500,50`), o produto em ponto flutuante (`"150.05"` → 15005, não 15004) e a rejeição de negativo.
- **O painel lê os seis números de um snapshot só.** `getEarningsSummary` faz uma chamada a `get_earnings_summary` e devolve o jsonb tipado. O filtro de anulados, os buckets e a média com arredondamento único continuam no SQL — o módulo não filtra nem calcula nada, e o componente renderiza `period_cents` e `average_cents` exatamente como chegam.
- **O fuso é derivado UMA vez, no RSC.** `startOfMonth`/`addMonths`/`startOfWeek` sob `{ in: tz(CLINIC_TIME_ZONE) }`, com a janela meio-aberta `[from, to)` e `today` como `date` pronto. Nenhum componente cliente constrói data: o default do campo `Recebido em` desce como prop `todayLabel` já em `dd/MM/yyyy`. `grep -c "new Date("` no diálogo retorna 0.
- **O escopo duplo está legível pelos quatro mecanismos do UI-SPEC.** Títulos que nomeiam o escopo em palavras (`Hoje` / `Período`), sub-linha concreta imprimindo o intervalo literal de cada card, contenção estrutural (Faixa B é um `Card` único, Faixa A são cards bare fora dele) e o badge `Sempre o mês atual` condicionado à deriva do período.
- **A média nunca mente.** Com `attendances === 0` o valor é um travessão e a sub-linha lê `Nenhum atendimento cobrado no período.` — `R$ 0,00` leria como uma média real de zero. Com atendimento, o denominador é impresso com plural explícito e um `Tooltip` explica que cada caso conta uma vez.
- **A escrita fecha o ciclo.** `createStandaloneFinancialEntryAction` põe os dois gates ANTES de ler o payload, faz `safeParse` no boundary, estampa `profile_id` da sessão e `case_id: null`, e delega a um módulo que emite **um único** `insert` (transação implícita — um conjunto parcial não pode ser observado). No cliente, `router.refresh()` depois do `await` faz o RSC re-renderizar: sem ele o `revalidatePath` sozinho não move o total com `cacheComponents` ligado.
- **Dinheiro digitado não se perde.** Com o form sujo, `onEscapeKeyDown` e `onPointerDownOutside` chamam `preventDefault`; o `Cancelar` do rodapé é a única saída que descarta. O primário fica `disabled` enquanto o `useTransition` está pendente — é isso que impede o duplo-clique criar duas linhas.
- **Forma de pagamento sem default.** Quatro `SegmentedToggle` com os rótulos PT-BR, nenhum pré-selecionado: um default gravaria o método errado por inércia em todo lançamento.

## Task Commits

1. **Task 1 (RED): spec do contrato de moeda** — `60d946c` (test)
2. **Task 1 (GREEN): parseBrlToCents, formatCentsToBRL e os schemas** — `efd3875` (feat)
3. **Registro do baseline vermelho de `yarn lint`** — `128ff18` (docs)
4. **Task 2 (TRACER): painel lendo `get_earnings_summary` + menu Financeiro** — `f3d270d` (feat)
5. **Task 3 (RED): spec do caminho de escrita** — `4021e17` (test)
6. **Task 3 (GREEN): diálogo de avulso, action e grupo segmentado** — `775441d` (feat)
7. **Checkpoint visual [BLOCKING] de 12 itens** — aprovado pelo usuário sem divergências

## Files Created/Modified

**Contrato de moeda**
- `lib/money.ts` — `parseBrlToCents`, o único parse de dinheiro da fase
- `lib/money.spec.ts` — 16 testes (13 de parse + 3 de formatação)
- `lib/formatters.ts` **(append)** — `formatCentsToBRL` com instância única de `Intl.NumberFormat` em escopo de módulo
- `lib/schemas/financial-entry.ts` — `PAYMENT_METHOD_VALUES`/`paymentMethodSchema`/`PAYMENT_METHOD_LABEL` e `standaloneFinancialEntrySchema`
- `lib/schemas/financial-entry.spec.ts` — as edge coverages de EARN-02

**Camada de dados**
- `modules/financial-entries/types.ts` — `FinancialEntry` e `EarningsSummary` (o shape exato do jsonb)
- `modules/financial-entries/get-earnings-summary.ts` — leitura via `.rpc`, tag `[EARNINGS]`, zeros como fallback
- `modules/financial-entries/create-financial-entries.ts` — insert único, `profile_id` estampado do argumento
- `modules/financial-entries/create-financial-entries.spec.ts` — as invariantes do write path
- `actions/financial-entries/create-standalone-financial-entry.ts` — gates + `safeParse` + `revalidatePath`
- `actions/financial-entries/index.ts` e `actions/index.ts` **(append)** — barris

**Superfície**
- `app/dashboard/earnings/page.tsx` — RSC com o gate e toda a derivação de fuso
- `app/dashboard/earnings/loading.tsx` — `Skeleton` espelhando as duas faixas
- `components/dashboard/earnings/earnings-cards.tsx` — S1 (Faixas A e B)
- `components/dashboard/earnings/standalone-entry-dialog.tsx` — S2
- `components/segmented-toggle.tsx` — `SegmentedToggle`
- `components/app-sidebar.tsx` **(9 linhas appendadas)** — grupo Financeiro › Ganhos

## Decisions Made

- **O cliente submete o valor CRU do form, não o transformado pelo resolver.** `standaloneFinancialEntrySchema` transforma `amount` (string → centavos) e `received_on` (`dd/mm/aaaa` → ISO). Se o `handleSubmit` mandasse o resultado transformado, o `safeParse` do action parsearia centavos como se fossem reais e `"2026-08-21"` como se fosse `dd/mm/aaaa` (o helper devolve `null` para ISO) — o form nunca salvaria. O diálogo usa `form.getValues()` e o action segue sendo a fonte única da verdade. Este é literalmente o bug que o quick `260701-ctf` já custou uma vez neste repo, em outro campo.
- **Faixa A escrita por extenso, sem helper.** A primeira versão fatorou os três cards num `MetricCard`, o que derrubou a contagem de `tabular-nums` de 6 para 3 e reprovou o critério de aceite. Inlinar segue o molde real do repo (`dashboard-home-content.tsx` também escreve seus quatro cards por extenso) e deixa cada valor com o próprio `tabular-nums` à vista de quem revisa.
- **`monthLabel` e `periodLabel` são duas derivações separadas** mesmo coincidindo hoje: a Faixa A é relativa a HOJE e nunca muda ao navegar, a Faixa B segue o período. `10-05` mexe só na segunda.
- **`SegmentedToggle` é duplicação deliberada.** `availability-panel.tsx` NÃO foi re-apontado para o novo módulo: duplicar 20 linhas é mais barato que arriscar regressão visual num controle da agenda fora do escopo. As exceções de 6px (`gap-1.5`/`py-1.5`) foram preservadas byte-a-byte.
- **Erro de leitura no RSC propaga.** Se `get_earnings_summary` falhar, a página lança e sobe para o error boundary, em vez de renderizar zeros. Um painel de dinheiro mostrando `R$ 0,00` por falha de rede é pior que uma tela de erro.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] A ordem de passos de `parseBrlToCents` no plano contradiz a própria tabela `<behavior>` do plano**
- **Found during:** Task 1 (escrita da spec, antes de qualquer implementação)
- **Issue:** O `<action>` manda, no passo (3), "remover os pontos de milhar" **sempre**. Mas o `<behavior>` exige `parseBrlToCents("150.05") === 15005`, e o UI-SPEC exige que um colar de `1500.50` funcione. Aplicando o passo (3) literalmente, `"150.05"` vira `"15005"` → 1.500.500 centavos: um erro de duas ordens de grandeza num caminho de dinheiro. O algoritmo prescrito reprovaria o próprio critério de aceite do plano.
- **Fix:** O passo (3) virou condicional, e é a regra que resolve a ambiguidade pt-BR × en-US de verdade:
  - com vírgula presente → a vírgula é o decimal e os pontos são de milhar (`1.500,50` → 150050);
  - sem vírgula → o ponto é decimal (`150.05` → 15005, `1500.50` → 150050), **exceto** no padrão brasileiro puro de milhar `^-?\d{1,3}(\.\d{3})+$` (`1.500` → 150000, `12.345.678` → 1234567800).
  Sem esse último ramo, um médico colando `1.500` receberia R$ 1,50 em silêncio.
- **Files modified:** `lib/money.ts`
- **Verification:** 13 casos travados em `lib/money.spec.ts`, incluindo os três ambíguos (`150.05`, `1500.50`, `1.500`)
- **Committed in:** `60d946c` (spec) + `efd3875` (implementação)

**2. [Rule 3 - Blocking] `yarn lint` está vermelho no baseline — critério de aceite impossível como escrito**
- **Found during:** Task 1 (primeira execução do gate)
- **Issue:** O plano exige `yarn lint` com código 0. O comando sai com 1 **antes** de qualquer arquivo desta fase existir: 1493 erros em 13 arquivos, sendo 5 em diretórios de scaffolding **gitignored** que o `eslint.config.mjs` não ignora (`.design-sync/`, `.ds-sync/`, `ds-bundle/`) e 8 em arquivos de app pré-existentes (`profile-content.tsx`, `calendar-editor.tsx`, `appointment-create-dialog.tsx`, `case-report.tsx`, `nav-user.tsx`). Nenhum é desta fase.
- **Fix:** Nada foi corrigido — SCOPE BOUNDARY: só se auto-corrige o que a task causou, e a correção certa (um `ignores` no config do ESLint) é mudança de tooling fora do escopo. O critério foi lido como **"nenhum erro novo de lint nos arquivos desta fase"** e verificado com `npx eslint` sobre cada arquivo criado/modificado: **0 problemas**. `yarn typecheck`, `yarn test` e `yarn build` continuaram sendo exigidos com código 0.
- **Files modified:** `.planning/phases/10-livro-caixa-de-ganhos-painel/deferred-items.md` (registro durável + follow-up sugerido)
- **Committed in:** `128ff18`

**3. [Sequenciamento] O botão `Novo lançamento` nasceu na Task 3, não na Task 2**
- **Found during:** Task 2 (tracer)
- **Issue:** O plano põe o botão primário na Task 2, "chamando o diálogo que é criado na task seguinte". Commitar isso literalmente significaria um botão sem handler no commit do tracer — um controle morto na tela, exatamente o tipo de stub que a fase não quer.
- **Fix:** `StandaloneEntryDialog` renderiza o próprio `DialogTrigger`, então a Task 3 inseriu o componente inteiro no header da página num diff de 2 linhas. Nenhum commit intermediário contém botão sem função.
- **Files modified:** `app/dashboard/earnings/page.tsx` (na Task 3)
- **Committed in:** `775441d`

**Duas correções menores de disciplina de prosa** (mesma lição que `10-01` aprendeu nos comentários de migration): critérios de aceite contam literais com `grep`, e comentários de bloco escapam do filtro `grep -v '^\s*//'`. O JSDoc do RSC mencionava `toISOString` (fazendo a contagem "deve ser 0" retornar 1) e o docblock do `SegmentedToggle` mencionava `aria-pressed` e `py-1.5` (fazendo as contagens "deve ser 1" retornarem 2). Ambos reescritos com a mesma informação em palavras — a regra é: **a prosa não pode conter os literais que a verificação conta**.

---

**Total deviations:** 2 auto-fixes (1 bug de algoritmo no caminho de dinheiro, 1 gate impossível) + 1 de sequenciamento + 2 cosméticas de prosa
**Impact on plan:** Nenhum scope creep. O desvio #1 é a diferença entre um parse de dinheiro correto e um erro de 100× em produção; o #2 é honestidade sobre um gate herdado quebrado; o #3 evitou um stub. Nenhum arquivo fora de `files_modified` foi tocado.

## Verification

**Automatizada:**

| Gate | Resultado |
| --- | --- |
| `yarn typecheck` | código 0 |
| `yarn test` | **584 pass / 0 fail** (554 no baseline + 16 de `money.spec.ts` + 10 de `financial-entry.spec.ts` + 4 de `create-financial-entries.spec.ts`) |
| `yarn build` | código 0, com `/dashboard/earnings` na listagem de rotas |
| `npx eslint` nos 18 arquivos da fase | 0 problemas |
| `yarn lint` (repo inteiro) | **vermelho no baseline**, 13 arquivos pré-existentes, nenhum desta fase (deviation #2) |

**Estática (contagens dos critérios de aceite):**

| Verificação | Resultado |
| --- | --- |
| `parseBrlToCents` / `formatCentsToBRL` / `new Intl.NumberFormat` | 1 / 1 / 1 · `lib/currency.ts` não existe |
| As 6 mensagens PT-BR travadas em `financial-entry.ts` | todas presentes literalmente |
| `rpc("get_earnings_summary")` · `[EARNINGS]` | 1 · presente nos dois módulos que lançam |
| `next/cache` ou `next/headers` em `modules/financial-entries/` | 0 |
| `toISOString` em código (RSC + cards) | 0 |
| `tabular-nums` · `formatCentsToBRL` em `earnings-cards.tsx` | 6 · 6 · nenhuma divisão nem `.reduce(` sobre dinheiro |
| hex/`rgb(` · `font-bold` em `earnings-cards.tsx` | 0 · 0 |
| `.insert(` em `create-financial-entries.ts` | **1** (nenhum laço de insert) |
| `onEscapeKeyDown` · `onPointerDownOutside` · `router.refresh()` | 1 · 1 · 1 |
| `type="button"` · `aria-pressed` · `py-1.5` no `SegmentedToggle` | 1 · 1 · 1 |
| `<Select`/`SelectTrigger` · `type="date"`/`react-day-picker` · `new Date(` no diálogo | 0 · 0 · 0 |
| `title: "Agend"`/`CalendarIcon` em `app-sidebar.tsx` (linhas de código) | **0** — nem o grupo removido em `4475d4d` nem o import órfão voltaram |

**Manual — checkpoint visual [BLOCKING] de 12 itens: APROVADO pelo usuário, sem divergências.** Cobriu: menu Financeiro sem grupo de agenda; as duas faixas com sub-linha literal por card; travessão na média com banco vazio; avulso de 250,00 movendo os cards sem F5 com singular; segundo avulso levando a média a R$ 175,00 com plural fechando ao centavo; guarda de descarte (Esc e backdrop não descartam, `Cancelar` descarta); grupo segmentado sem default e sem submeter; `0,00` com a mensagem de cortesia e forma ausente bloqueando; `R$ 145.320,00` inteiro sem abreviação; descrição de ~200 caracteres rolando sem deslocar rótulo; `R$ 1.500,50` colado gravando 150050; e o redirecionamento de usuário sem `paid` para `/dashboard/link-whatsapp`.

## Issues Encountered

**O que os gates automatizados NÃO cobrem (e por que):** os dois gates do action (sessão ausente e `status !== "paid"`) não têm teste unitário. O runner do repo é `find modules lib -name '*.spec.ts'` — actions não são coletados, e testá-los exigiria mockar `next/cache` e o factory de cliente por request. Ficaram verificados por inspeção de código (`grep` sobre `profile?.id` e `profile.status !== "paid"`, mais a confirmação de que nenhum `profile_id` é lido do payload) e pelo item 12 do checkpoint visual, que exercitou o gate de assinatura de verdade no RSC. **Se a Fase 10 quiser esses gates sob teste, o caminho é extrair a decisão do gate para um helper puro em `lib/`** — não vale mockar o mundo do Next.

**Duas notas de ambiente:** já havia um dev server do usuário na porta 3000 (PID 64200); o Next recusa uma segunda instância, então o checkpoint foi verificado no servidor existente, que hot-reloadeia os arquivos novos normalmente. E o banco foi tratado como **somente leitura** nesta execução, então o item 9 do checkpoint (overflow de seis dígitos) foi verificado digitando `145320,00` no próprio diálogo em vez de inserir a linha por SQL — mesmo caminho de renderização, um passo a menos.

## Next Phase Readiness

**Pronto para `10-03`/`10-04`/`10-05`.** O contrato de moeda, o schema do enum, os rótulos PT-BR, o `SegmentedToggle` e os dois molde de campo (decimal e data mascarada) já existem e são importáveis.

**O que os próximos planos precisam lembrar:**
- **`formatCentsToBRL` e `parseBrlToCents` são os ÚNICOS.** Qualquer valor novo (preço de catálogo, valor da consulta, célula de tabela, eixo do gráfico) chama estas duas. Criar um segundo formatador quebra SC-3.
- **`10-05` mexe só em `periodLabel`.** `monthLabel` (Faixa A) é sempre o mês corrente por construção; a navegação `?mes` deve alterar `monthStart`/`monthEnd` e `periodLabel`, e o badge `Sempre o mês atual` já está wired ao `isCurrentPeriod`. O corpo da Faixa B (gráfico + tabela) nasce vazio abaixo dos dois blocos.
- **`10-03` (encerrar caso com ganhos) reusa `createFinancialEntries` como está** — ele já aceita N linhas num insert único, que é exatamente a consulta + procedimentos. O que falta ali é validar a **posse do `case_id`** no action: a RLS ancora só em `profile_id` e não olha para `cases`, então `case_id` vindo do cliente é IDOR (declarado em voz alta no comentário da migration de `10-01`).
- **Blockers herdados de `10-01` seguem abertos:** os 2 follow-ups do `on delete restrict` (traduzir `23503` em `actions/cases/delete-case.ts` e o S7 que passa a BLOQUEAR em vez de avisar) continuam registrados em `deferred-items.md` para `10-04`.
- **`consultation_price_cents` ainda não é visível ao RSC:** o `.select(...)` de `modules/supabase/get-authenticated-user.ts` é hardcoded e não inclui a coluna. `10-03`/`10-05` precisam adicioná-la ali.

---
*Phase: 10-livro-caixa-de-ganhos-painel*
*Completed: 2026-08-21*

## Self-Check: PASSED

Todos os 15 arquivos de código criados existem em disco, mais o próprio SUMMARY. Todos os 7 commits existem no histórico (`60d946c`, `efd3875`, `128ff18`, `f3d270d`, `4021e17`, `775441d`, `1020fc4`). Nenhum arquivo rastreado foi apagado por nenhum commit deste plano (`git diff --diff-filter=D` vazio em todos).
