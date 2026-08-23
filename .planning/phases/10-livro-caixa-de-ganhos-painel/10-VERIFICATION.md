---
status: human_needed
phase: 10-livro-caixa-de-ganhos-painel
requirements: [EARN-01, EARN-02, EARN-03, EARN-04, EARN-05]
plans_verified: 5
plans_total: 5
must_haves_verified: 4
must_haves_total: 4
human_verification_items: 40
verified_by: orchestrator (inline — o gsd-verifier travou duas vezes na leitura dos ~500KB de PLAN + UI-SPEC)
verified_at: 2026-08-23
---

# Phase 10 Verification — Livro-caixa de Ganhos & Painel

## Veredito

**`human_needed`.** Os quatro critérios de sucesso estão implementados e comprovados por
evidência automatizada e por consulta ao banco vivo. O que falta não é código: são **40 itens
de verificação visual** deliberadamente adiados por decisão do usuário
(`human_verify_mode: end-of-phase`), registrados como janelas abertas 2 e 3 em
`.planning/WINDOWS.md` e transcritos em `10-UAT.md`.

A fase **não** deve ser marcada como completa antes do UAT.

## Nota de procedimento

O `gsd-verifier` foi despachado duas vezes e travou nas duas (600s sem progresso), na segunda
já na leitura inicial. Causa provável: o diretório da fase soma ~500KB entre os 5 PLANs
(41–65KB cada) e o UI-SPEC (70KB). A verificação foi então feita inline pelo orquestrador,
que já detinha a evidência de banco de primeira mão. Isto está registrado por honestidade de
procedimento: nenhum agente verificador independente revisou esta fase — a evidência abaixo é
verificável linha a linha, mas o segundo par de olhos não aconteceu.

## Critérios de Sucesso

### SC-1 — Preços no perfil, lançamento no encerramento, snapshot, cortesia, sem relançar ✓

| Afirmação | Evidência |
|---|---|
| Valor da consulta no perfil | `profiles.consultation_price_cents integer null` + check `is null or >= 0` no banco vivo; travessia das 5 camadas incluindo o `.select()` hardcoded de `modules/supabase/get-authenticated-user.ts:39` |
| Catálogo com preço por item | `procedure_catalog_items` no banco vivo: RLS + 4 policies, `price_cents >= 0` (zero aceito — procedimento gratuito é catalogável), `btrim(name) <> ''` |
| 1 lançamento da consulta + 1 por procedimento | `modules/financial-entries/create-financial-entries.ts`, insert único; sem `unique` sobre `case_id` (D-08) |
| Centavos inteiros, nunca float | `amount_cents integer`; zero ocorrência de `real`/`double precision`/`money` nas migrations; `lib/money.ts` opera só em inteiros |
| Ligado ao caso por `case_id` | FK para `cases(id)` presente; `confdeltype = 'r'` |
| Preço congelado por snapshot | `description` + `amount_cents` copiados na gravação (D-05); rótulo de procedimento lido do catálogo **no servidor**, o cliente só manda id e valor (fecha T-10-25) |
| Cortesia permitida | caminho `Sem cobrança` encerra com zero lançamentos |
| **Re-encerrar não relança** | `countNonVoidedEntriesForCase` chamado em `actions/financial-entries/create-case-financial-entries.ts:63` — **entre** a resolução de posse (:54) e o insert (:118). Estava ausente do caminho de escrita e foi corrigido em `c27e247` (CR-01). Este é o único item do SC-1 que estava genuinamente aberto ao fim dos planos. |

### SC-2 — Avulsos, `case_id` nullable, descrição obrigatória ✓

`case_id` nullable no banco vivo; `actions/financial-entries/create-standalone-financial-entry.ts`
com gate auth + `paid` e `profile_id` estampado no servidor; `btrim(description) <> ''` como
constraint, não só validação de app. Duas linhas avulsas reais criadas pelo usuário durante o
checkpoint do 10-02 estão no banco e são a prova de uso.

### SC-3 — Painel, agregação em SQL, buckets locais, média com arredondamento único ✓

Provado por chamadas reais como role `authenticated` com claims de JWT:

| Comportamento | Resultado medido |
|---|---|
| 2 lançamentos num caso + 1 avulso | `attendances = 2`, **não 3** (DV-2) |
| Média | `average_cents = round(period_cents / attendances)`, uma divisão, um arredondamento, em `numeric` |
| Janela meio-aberta | `p_to = hoje` → `period_cents = 0`, `by_day = []`, e os cards hoje/semana/mês **inalterados** — cards relativos a `p_today`, independentes do período navegado |
| Período vazio | todos os escalares 0, `by_day = []`, nunca `null` |
| Ordem da série | linhas inseridas nos dias 20, 3, 11 → `by_day` devolveu **03, 11, 20** |
| Fuso | `received_on date` (dia de calendário), zero expressão `AT TIME ZONE` — sem risco de DST nem dependência do `TimeZone` da sessão |
| Propriedades da função | `SECURITY INVOKER`, `STABLE`, `search_path=""`, execute só para `authenticated`, fora do advisor `function_search_path_mutable` |

A ordenação de `by_day` dependia de um `ORDER BY` de CTE sobreviver ao `jsonb_agg` — o Postgres
não garante isso. Corrigido em `811958c` (WR-03) movendo a ordem para dentro do agregado.

### SC-4 — Anulação sem apagar, filtro de anulados, escopo por `profile_id` + `paid`, teste de posse ✓

| Afirmação | Evidência |
|---|---|
| Anular, não apagar | `voided_at`; **zero policies de DELETE** na tabela — a RLS nega DELETE por default |
| `delete` como `authenticated` | **0 linhas afetadas** |
| Totais e média filtram anulados | filtro `voided_at is null` vive **no SQL**, no único caminho que produz os números; anular derrubou os totais exatamente pelo valor da linha, sem tocar código |
| **Valor é imutável, agora no banco** | `update ... set amount_cents = 1` como `authenticated` → **42501 permission denied**; `update ... set voided_at = now()` → 1 linha. `authenticated` tem UPDATE só em `voided_at`; `anon` não tem INSERT/UPDATE/DELETE. Antes de `811958c` o privilégio era da tabela inteira e o dono podia reescrever um mês fechado por PostgREST — D-19 era promessa de app. |
| Escopo por `profile_id` + `paid` | presente em todos os actions novos |
| Teste de posse | `modules/financial-entries/void-financial-entry.spec.ts`, `delete-procedure-catalog-item.spec.ts`, `count-non-voided-entries-for-case.spec.ts`, `list-financial-entries.spec.ts` |
| IDOR do `case_id` | fechado: a RLS de `financial_entries` nunca olha para `cases`, então os dois actions de dinheiro resolvem posse por `modules/cases/find-owned-case-id.ts` (T-10-23) |

## Rastreabilidade de Requisitos

| ID | Fase | Status | Onde |
|----|------|--------|------|
| EARN-01 | 10 | ✓ | 10-01 (schema), 10-03 (preços/catálogo), 10-04 (encerramento) |
| EARN-02 | 10 | ✓ | 10-01 (`case_id` nullable), 10-02 (diálogo de avulso) |
| EARN-03 | 10 | ✓ | 10-01 (`get_earnings_summary`), 10-02 (cards), 10-05 (gráfico/tabela) |
| EARN-04 | 10 | ✓ | 10-01 (expressão da média), 10-02 (exibição) |
| EARN-05 | 10 | ✓ | 10-05 (anulação + desfazer), 10-01 (ausência de policy de DELETE) |

Cinco IDs no frontmatter dos planos, cinco em `REQUIREMENTS.md`, zero órfãos.

## Gates Automatizados

`yarn typecheck` 0 · `yarn test` **614 pass / 0 fail** · `yarn build` limpo · árvore de trabalho limpa ·
`npx eslint` limpo em todos os arquivos da fase · 3 migrations da fase aplicadas e registradas.

**`yarn lint` está vermelho** — 1493 erros em 13 arquivos, 5 deles em diretórios gitignored que o
`eslint.config.mjs` não ignora. Baseline **pré-existente**, nenhum arquivo desta fase. Enquanto ficar
vermelho, `yarn lint` não é um gate útil, e todo plano futuro vai gastar parágrafo justificando isso.
Conserto ≈ 3 linhas de `ignores` + limpeza de 8 arquivos de app.

## Desvios que superam o texto dos planos

**D-26 revisada pelo usuário no checkpoint do 10-01.** `financial_entries.case_id` é
`on delete restrict`, não `cascade`. Consequência vivida: um caso com **qualquer** lançamento —
anulado ou não, porque a FK não consulta `voided_at` — é permanentemente indelével. O S7 do 10-04
portanto **bloqueia** a exclusão em vez de avisar; `modules/cases/delete-case.ts` lança o sentinela
`CASE_HAS_FINANCIAL_ENTRIES` no `23503` e o action traduz para PT-BR. `T-10-07`/`T-10-28` passam de
`accept` para `mitigate` — a barreira é o banco, não uma string de UI.

Onde o texto de 10-01-PLAN.md e 10-04-PLAN.md disser `cascade`, o texto está superado.

Registrado em `deferred-items.md`, `10-01-SUMMARY.md` e na janela 1 do ledger (fechada em `1150720`).

## Achados de code review ainda abertos (conhecidos, não são gaps da fase)

Corrigidos: CR-01, WR-01, WR-02, WR-03, WR-04, WR-08 — commits `c27e247`, `333fca3`, `811958c`,
`6e3935b`, `b234d4f`.

Permanecem em `10-REVIEW.md`, por decisão de escopo:

| ID | Resumo | Por que não bloqueia |
|----|--------|----------------------|
| WR-05 | `procedures` sem bound/dedupe | requer payload adversarial do próprio dono; sem efeito cross-tenant |
| WR-06 / WR-07 | selects sem limite explícito na tabela do período e nos totais do caso | o teto de linhas da plataforma faria a tela discordar do livro **em silêncio** — é o mais afiado dos que sobraram, e merece paginação antes do volume crescer |
| WR-09 | props documentadas como fail-closed (`null` = bloqueia) com default `0` | o bloqueio real do S7 é o `23503` do banco; o default só afeta a antecipação na UI |
| WR-10 | falta spec de `caseFinancialEntriesSchema` | lacuna de teste, não de comportamento |
| IN-01..IN-13 | `MAX_AMOUNT_CENTS` triplicado, `paymentMethodSchema` duplicado, etc. | duplicação sem divergência observada |

**Fora do escopo da fase, mas achado aqui e vale uma task própria:** 54 call sites ainda usam
`if (!profile)`, que nunca dispara porque `getAuthenticatedUser` devolve `{}` truthy sem sessão.
Cada um sobrevive apenas pela checagem da linha seguinte (`status !== "paid"` ou `redirect`). Os
três sites desta fase foram corrigidos, incluindo `updateProfileAction` — o único sem gate `paid`
de rede, por decisão deliberada (um perfil sem assinatura precisa poder ser completado). Reproduzir
a lista com:
`grep -rl "getAuthenticatedUser" actions app components modules | xargs grep -l "if (!profile)"`

**Padrão transversal reconfirmado:** o parse duplo (cliente roda o schema, manda `parsed.data`, action
re-parseia, transform falha na segunda passada) teve sua **segunda** ocorrência nesta fase, corrigida
em 10-03. A primeira foi `aacc896`. Uma terceira ocorrência deve receber conserto estrutural — helper
de submit compartilhado ou lint rule — não outro remendo pontual. Registrado em `STATE.md`.

## Human Verification — 40 itens

Adiados por escolha explícita do usuário, não por omissão. Itens completos em **`10-UAT.md`**;
janelas 2 e 3 abertas em `.planning/WINDOWS.md`.

- **10-04 — 22 itens** (S3 diálogo de encerramento em duas etapas + S7 aviso destrutivo), dos quais
  **7 são obrigatórios por contrato do UI-SPEC**. A RESEARCH declara esta superfície não verificável
  por typecheck.
- **10-05 — 18 itens** (S1 painel completo + S4 card de ganhos no caso).

Três itens mudaram de forma e devem ser testados na versão nova, não na do plano:

1. **10-04 itens 15/16** — o esperado **não** é mais "aviso + botão `Excluir caso e N lançamentos`".
   É o bloco destrutivo com contagem e soma, e o botão de confirmação **desabilitado**.
2. **10-04 item 18** — continua o mais importante do S7, mas a justificativa escrita no plano
   ("com a FK em cascade, prosseguir sem contagem apaga dinheiro em silêncio") está **obsoleta**:
   o banco agora recusa. O item permanece porque prosseguir sem contagem ainda produz um erro cru
   em vez de uma explicação antecipada. Agora tem dois caminhos: leitura falhando (`null` →
   mensagem de verificação + confirmar desabilitado) e o caso com **só** lançamentos anulados, que
   passa pelo diálogo normal e é barrado pelo `23503` traduzido, com o diálogo permanecendo aberto.
3. **10-05 item 11** — o original era impossível como escrito: com o filtro ligado a listagem
   devolve todas as linhas, então num mês com lançamentos e nada anulado a lista nunca fica vazia.
   A cópia de auditoria agora existe nos dois lugares.

**Item de maior risco silencioso: 10-04 nº 21** (`Recebido em` no fuso da clínica, testado com
`TZ=UTC` depois das 21h BRT). É a coluna que define todos os buckets da fase e errar ali não emite
erro nenhum.

## Próximo passo

`/gsd-verify-work 10` — percorre os 40 itens e marca a fase completa quando passarem.
