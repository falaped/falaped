# Tabela: discussion_messages

**Schema:** public

## Descrição

Mensagens (user/assistant) por discussão; ordem por created_at.

## Colunas

| Coluna | Tipo | Nullable | Default | Observações |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| discussion_id | uuid | NOT NULL | — | FK → discussions.id |
| role | text | NOT NULL | — | Check: `user`, `assistant` |
| content | text | NOT NULL | — | |
| created_at | timestamptz | NOT NULL | now() | |

## Chaves

- **Primary key:** id
- **Foreign keys:** discussion_id → public.discussions.id

## RLS

- rls_enabled: false
