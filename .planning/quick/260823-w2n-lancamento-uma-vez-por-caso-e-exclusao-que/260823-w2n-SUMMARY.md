---
task: 260823-w2n
title: "Lançamento uma vez por caso + excluir caso apaga os lançamentos dele"
status: complete
branch: main
commits:
  - 91cedd7
  - 7c25e80
date: 2026-08-23
files-modified:
  - supabase/migrations/20260823000000_cases_earnings_prompted_at.sql
  - supabase/migrations/20260823000100_financial_entries_cascade_on_case_delete.sql
  - modules/cases/get-case-earnings-prompted-at.ts
  - modules/cases/mark-case-earnings-prompted.ts
  - modules/cases/mark-case-earnings-prompted.spec.ts
  - modules/cases/get-case-by-id.ts
  - modules/cases/delete-case.ts
  - actions/financial-entries/mark-case-earnings-prompted.ts
  - actions/financial-entries/prepare-case-earnings.ts
  - actions/financial-entries/create-case-financial-entries.ts
  - actions/financial-entries/index.ts
  - actions/cases/delete-case.ts
  - actions/index.ts
  - components/dashboard/cases/close-case-with-earnings-dialog.tsx
  - components/dashboard/cases/case-detail-content.tsx
  - components/dashboard/cases/case-detail-actions.tsx
---

# 260823-w2n: duas regras novas do lançamento financeiro

## Regra 1 — a pergunta acontece UMA VEZ por caso

Encerrar → lança. Reabrir e encerrar o mesmo caso → não pergunta de novo.

Precisou de coluna nova porque a guarda D-10 conta lançamentos não-anulados:
isso cobre o caso que faturou, mas não o dispensado como cortesia (D-09). "Sem
cobrança" deixa ZERO lançamento e nenhum vestígio de que já se perguntou —
cortesia era indistinguível de "ainda não perguntei".

`cases.earnings_prompted_at`: NULL = em aberto, timestamp = já respondeu.

- **Marcada ao RESPONDER, não ao ABRIR** o modal (decisão do usuário): um Esc
  acidental não queima o faturamento do atendimento, o card de pendência
  continua oferecendo a volta.
- Reabrir não limpa a marca — é o mesmo atendimento.
- Quem marca ao salvar: `createCaseFinancialEntriesAction`, DEPOIS do insert
  (marcar antes e o insert falhar queimaria a única chance de faturar). Marca
  também quando todas as linhas eram de valor zero: cortesia é resposta.
- Quem marca ao dispensar: `markCaseEarningsPromptedAction` (novo), só para o
  "Sem cobrança".
- Quem lê: `prepareCaseEarningsAction` → `ask: false`, e o card de pendência no
  RSC desaparece.
- Backfill: os 106 casos já encerrados nascem marcados (decisão do usuário),
  senão todos passariam a exibir o card retroativamente.

## Regra 2 — excluir o caso exclui os lançamentos dele

FK `financial_entries.case_id`: `on delete restrict` → `on delete cascade`.
Reverte a D-26 revisada por decisão de produto.

Custo registrado na migration porque é irreversível: o faturamento do caso
excluído sai dos totais de Ganhos retroativamente, inclusive de meses já
fechados, sem trilha de auditoria — o cascade não passa pela anulação (D-19).

A tabela continua **sem policy de DELETE**: cascade é ação referencial do
Postgres, não submetida a RLS, então nenhuma porta de delete manual foi aberta.

- `delete-case` (module + action): saiu o sentinela
  `CASE_HAS_FINANCIAL_ENTRIES` (o 23503 não acontece mais); o action passou a
  revalidar `/dashboard/earnings` também.
- `case-detail-actions`: o bloco de lançamentos deixou de BLOQUEAR e passou a
  AVISAR o que será apagado. Leitura falhada (`null`) continua bloqueando: sem
  saber o que será apagado não há consentimento informado.

## Verificação

- 616/616 testes (`find modules lib -name '*.spec.ts' | xargs tsx --test`),
  incluindo o novo `mark-case-earnings-prompted.spec.ts` — escopo do update e
  preservação da primeira resposta.
- `tsc --noEmit` limpo, `eslint` limpo nos diretórios tocados.
- `next build` completa.
- Migrations aplicadas no projeto Supabase; FK confirmada como
  `ON DELETE CASCADE` e 106/106 casos encerrados marcados.

**Nota de ambiente:** o shell do agente roda em x64 (Rosetta) e o `node_modules`
é arm64, então `yarn build` e a transformação de arquivos `.ts` NOVOS falham por
binário nativo de arquitetura errada (`esbuild`, `lightningcss`). Não é problema
do repo: com `arch -arm64 /opt/homebrew/bin/node` tudo passa.

## Self-Check: PASSED

- FOUND: commits 91cedd7 (regra 1) e 7c25e80 (regra 2)
- FOUND: 2 migrations aplicadas (list_migrations)
