# Tabela: case_messages

**Schema:** public

## Descrição

Mensagens (user/assistant) por caso; ordem por created_at.

## Colunas

| Coluna | Tipo | Nullable | Default | Observações |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| case_id | uuid | NOT NULL | — | FK → cases.id |
| role | text | NOT NULL | — | Check: `user`, `assistant` |
| content | text | NOT NULL | — | |
| created_at | timestamptz | NOT NULL | now() | |

## Chaves

- **Primary key:** id
- **Foreign keys:** case_id → public.cases.id (on delete cascade)

## RLS

- rls_enabled: false
