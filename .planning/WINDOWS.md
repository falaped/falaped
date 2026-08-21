---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 0
total_count: 1
last_updated: 2026-08-21T20:33:13.111Z
---

# Broken Windows Ledger

> Cross-phase defect register. `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 10 | deviation | supabase/migrations/20260821000100_financial_entries.sql |  | D-26 revisada para on delete restrict: 10-04 deve traduzir Postgres 23503 em actions/cases/delete-case.ts e trocar o aviso do diálogo de excluir caso por um bloqueio | open |  | 2026-08-21T20:33:13.111Z |  |

````json
[
  {
    "id": 1,
    "kind": "deviation",
    "phase": "10",
    "file": "supabase/migrations/20260821000100_financial_entries.sql",
    "line": null,
    "description": "D-26 revisada para on delete restrict: 10-04 deve traduzir Postgres 23503 em actions/cases/delete-case.ts e trocar o aviso do diálogo de excluir caso por um bloqueio",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-21T20:33:13.111Z",
    "resolved_at": null
  }
]
````
