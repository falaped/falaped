# Deferred Items — Fase 10 (Livro-caixa de Ganhos)

## D-26 revisada no checkpoint de 10-01: `on delete restrict`, não `cascade`

O `checkpoint:decision` do plano `10-01` foi resolvido com **`revisar-d26`**:

- **D-01, D-05, D-19** — ratificadas como escritas no plano.
- **D-26** — **revisada**. `financial_entries.case_id` usa `on delete restrict`.
  O `10-01-PLAN.md` (texto, `<action>` da Task 2, `<acceptance_criteria>`,
  "Desvios Declarados #2" e a linha `T-10-07` do threat model) ainda descreve
  `cascade` — **o PLAN.md não foi reescrito de propósito**; a migration e este
  arquivo são a fonte da verdade.

Isso restaura o alinhamento com o precedente escrito do repo
(`supabase/migrations/20260722200000_appointments.sql`, que escolheu
`on delete restrict` "para preservar o histórico … que a Fase 10 vai
referenciar") e com a letra de D-19 (faturamento não se apaga).

### Follow-ups criados por `restrict` — para planos POSTERIORES

Nada disto foi tocado em `10-01` (fora de `files_modified`).

1. **`actions/cases/delete-case.ts` — traduzir o Postgres `23503`.**
   Com `restrict`, apagar um caso que tenha lançamento (mesmo anulado) falha com
   `foreign_key_violation` (`23503`). O action tem de capturar esse código e
   devolver um result union com mensagem PT-BR em vez de vazar o erro cru
   (RESEARCH Pitfall 1). **Plano alvo: `10-04`** (ou o plano que tocar
   `delete-case`).

2. **`10-04` S7 está superado: o diálogo BLOQUEIA, não avisa.**
   O desenho original era um aviso destrutivo ("excluir caso e N lançamentos").
   Com `restrict` a exclusão é impossível enquanto houver lançamento, então o
   diálogo deve **bloquear** com algo como *"Este caso tem lançamentos no livro-caixa.
   Anule os lançamentos antes de excluir o caso."* — não um aviso que promete
   uma exclusão que o banco vai recusar.

3. **Threat `T-10-07` muda de `accept` para `mitigate`.**
   O risco era "`cascade` apaga faturamento na exclusão de caso", mitigado
   apenas por uma string de UI. Com `restrict` **o banco é a barreira** — a
   mitigação é estrutural, não cosmética. O threat model de `10-01-PLAN.md` não
   foi reescrito; esta é a disposição vigente.

## `yarn lint` está vermelho no baseline (registrado em 10-02, NÃO corrigido)

`yarn lint` sai com código 1 **antes** de qualquer arquivo desta fase existir: 1493 erros
distribuídos por 13 arquivos, nenhum deles de `10-02`.

- 5 em diretórios de scaffolding **gitignored** que o `eslint.config.mjs` não ignora
  (`.design-sync/`, `.ds-sync/`, `ds-bundle/`) — a correção certa é um `ignores` no
  config do ESLint, não editar arquivo gerado.
- 8 em arquivos de app pré-existentes: `app/dashboard/profile/profile-content.tsx`,
  `components/dashboard/agenda/appointment-create-dialog.tsx`,
  `components/dashboard/agenda/calendar-editor.tsx`,
  `components/dashboard/cases/case-report.tsx`, `components/nav-user.tsx`,
  e 3 de `ds-bundle/`.

Os critérios de aceite de `10-02` pedem `yarn lint` com código 0. Isso é impossível sem sair
do escopo do plano (SCOPE BOUNDARY: só se auto-corrige o que a task causou). O critério foi
lido como **"nenhum erro novo de lint nos arquivos desta fase"** — verificado arquivo por
arquivo. `yarn typecheck`, `yarn test` e `yarn build` continuam sendo exigidos com código 0.

**Follow-up sugerido (fora da Fase 10):** adicionar `ignores` para `.design-sync/`, `.ds-sync/`
e `ds-bundle/` no `eslint.config.mjs` e limpar os 8 arquivos de app — depois disso `yarn lint`
volta a ser um gate útil.
