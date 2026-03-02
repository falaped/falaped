# Tabela: authenticated_users

**Schema:** public

## Descrição

Usuários autenticados por telefone; vinculam perfil (profiles) ao status e ao telefone linkado (WhatsApp).

## Colunas

| Coluna | Tipo | Nullable | Default | Observações |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| phone | text | NOT NULL | — | Unique |
| status | text | NOT NULL | — | Check: `paid`, `unpaid`, `blocked` |
| profile_id | uuid | NULL | — | FK → profiles.id |
| linked_phone_status | boolean | NOT NULL | false | True quando este phone já validou código de vinculação |
| whatsapp_linked_at | timestamptz | NULL | — | Set quando o usuário vinculou WhatsApp via código (bot). Null = não vinculado |

## Chaves

- **Primary key:** id
- **Foreign keys:** profile_id → public.profiles.id (authenticated_users_profile_id_fkey)

## RLS

- rls_enabled: false
