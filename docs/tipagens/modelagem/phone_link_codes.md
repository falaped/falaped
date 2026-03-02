# Tabela: phone_link_codes

**Schema:** public

## Descrição

Códigos one-time para vincular telefone WhatsApp à conta do dashboard (profile_id). Dashboard cria; bot consome e seta used_at ao vincular.

## Colunas

| Coluna | Tipo | Nullable | Default | Observações |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| code | text | NOT NULL | — | |
| profile_id | uuid | NOT NULL | — | FK → profiles.id |
| expires_at | timestamptz | NOT NULL | — | |
| used_at | timestamptz | NULL | — | |
| linked_phone | text | NULL | — | Telefone que resgatou o código; preenchido pelo bot ao setar used_at |

## Chaves

- **Primary key:** id
- **Foreign keys:** profile_id → public.profiles.id

## Triggers

- trigger_sync_linked_phone_status (AFTER UPDATE) → sync_linked_phone_status_on_phone_link_codes()

## RLS

- rls_enabled: false
