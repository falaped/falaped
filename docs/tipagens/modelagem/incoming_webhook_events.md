# Tabela: incoming_webhook_events

**Schema:** public

## Descrição

Buffer de mensagens por phone; external_message_id para idempotência; processed_at preenchido após flush.

## Colunas

| Coluna | Tipo | Nullable | Default | Observações |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| phone | text | NOT NULL | — | |
| external_message_id | text | NOT NULL | — | |
| content | text | NOT NULL | — | |
| created_at | timestamptz | NOT NULL | now() | |
| processed_at | timestamptz | NULL | — | |

## Chaves

- **Primary key:** id

## RLS

- rls_enabled: false
