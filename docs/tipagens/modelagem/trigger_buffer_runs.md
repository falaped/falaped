# Tabela: trigger_buffer_runs

**Schema:** public

## Descrição

runId do Trigger.dev por phone; usado para reschedule quando chega nova mensagem do mesmo phone.

## Colunas

| Coluna | Tipo | Nullable | Default | Observações |
|--------|------|----------|---------|-------------|
| phone | text | NOT NULL | — | PK |
| run_id | text | NOT NULL | — | |
| updated_at | timestamptz | NOT NULL | now() | |

## Chaves

- **Primary key:** phone

## RLS

- rls_enabled: false
