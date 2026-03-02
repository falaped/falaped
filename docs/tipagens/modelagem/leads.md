# Tabela: leads

**Schema:** public

## Descrição

Telefones que enviaram mensagem mas não estão em authenticated_users; upsert por phone (update last_seen_at em reenvios) para follow-up.

## Colunas

| Coluna | Tipo | Nullable | Default | Observações |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| phone | text | NOT NULL | — | Unique |
| first_seen_at | timestamptz | NOT NULL | now() | |
| last_seen_at | timestamptz | NOT NULL | now() | |

## Chaves

- **Primary key:** id

## RLS

- rls_enabled: false
