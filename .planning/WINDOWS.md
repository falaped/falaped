---
schema_version: 1
open_count: 2
waived_count: 0
fixed_count: 1
total_count: 3
last_updated: 2026-08-21T22:48:27.047Z
---

# Broken Windows Ledger

> Cross-phase defect register. `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 10 | deviation | supabase/migrations/20260821000100_financial_entries.sql |  | D-26 revisada para on delete restrict: 10-04 deve traduzir Postgres 23503 em actions/cases/delete-case.ts e trocar o aviso do diálogo de excluir caso por um bloqueio | fixed | 10-04 pagou a divida: 23503 traduzido (modules/cases/delete-case.ts sentinela -> actions/cases/delete-case.ts PT-BR, commit 4269e2b) e o dialogo de excluir caso agora BLOQUEIA (commit 34df141). A parte visual e rastreada pela window 2. | 2026-08-21T20:33:13.111Z | 2026-08-21T22:20:00.000Z |
| 2 | 10 | unrun-verify | components/dashboard/cases/close-case-with-earnings-dialog.tsx |  | Checkpoint visual [BLOCKING] de 21 itens (S3 + S7) nao executado — superficie declarada nao verificavel por typecheck | open |  | 2026-08-21T22:07:18.819Z |  |
| 3 | 10 | unrun-verify | components/dashboard/earnings/void-entry-button.tsx |  | Checkpoint visual [BLOCKING] de 18 itens (S1 painel completo + S4 card no caso) nao executado — human_verify_mode end-of-phase; item 13 (reconciliacao ao centavo) e o mais importante | open |  | 2026-08-21T22:48:27.047Z |  |

````json
[
  {
    "id": 1,
    "kind": "deviation",
    "phase": "10",
    "file": "supabase/migrations/20260821000100_financial_entries.sql",
    "line": null,
    "description": "D-26 revisada para on delete restrict: 10-04 deve traduzir Postgres 23503 em actions/cases/delete-case.ts e trocar o aviso do diálogo de excluir caso por um bloqueio",
    "status": "fixed",
    "reason": "10-04 pagou a divida: 23503 traduzido (modules/cases/delete-case.ts sentinela -> actions/cases/delete-case.ts PT-BR, commit 4269e2b) e o dialogo de excluir caso agora BLOQUEIA (commit 34df141). A parte visual e rastreada pela window 2.",
    "recorded_at": "2026-08-21T20:33:13.111Z",
    "resolved_at": "2026-08-21T22:20:00.000Z"
  },
  {
    "id": 2,
    "kind": "unrun-verify",
    "phase": "10",
    "file": "components/dashboard/cases/close-case-with-earnings-dialog.tsx",
    "line": null,
    "description": "Checkpoint visual [BLOCKING] de 21 itens (S3 + S7) nao executado — superficie declarada nao verificavel por typecheck",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-21T22:07:18.819Z",
    "resolved_at": null
  },
  {
    "id": 3,
    "kind": "unrun-verify",
    "phase": "10",
    "file": "components/dashboard/earnings/void-entry-button.tsx",
    "line": null,
    "description": "Checkpoint visual [BLOCKING] de 18 itens (S1 painel completo + S4 card no caso) nao executado — human_verify_mode end-of-phase; item 13 (reconciliacao ao centavo) e o mais importante",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-21T22:48:27.047Z",
    "resolved_at": null
  }
]
````
