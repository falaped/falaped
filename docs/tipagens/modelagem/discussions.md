# Tabela: discussions

**Schema:** public

## Descrição

Discussões (conversas livres sem paciente). Uma discussão ativa por profile_id.

## Colunas

| Coluna | Tipo | Nullable | Default | Observações |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| profile_id | uuid | NULL | — | Perfil do médico; escopo. FK → profiles.id |
| user_phone | text | NOT NULL | — | |
| status | text | NOT NULL | 'active' | Check: `active`, `closed` |
| started_at | timestamptz | NOT NULL | now() | |
| ended_at | timestamptz | NULL | — | |
| awaiting_intent | boolean | NOT NULL | false | — |
| title | text | NULL | — | Título opcional da discussão. |

## Chaves

- **Primary key:** id
- **Foreign keys:** profile_id → public.profiles.id

## RLS

- rls_enabled: false
