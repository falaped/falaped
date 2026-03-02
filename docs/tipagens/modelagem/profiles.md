# Tabela: profiles

**Schema:** public

## Descrição

Perfil do médico (dashboard); ligado a auth.users. Referenciado por authenticated_users, cases, patients, report_templates, phone_link_codes, case_reports.

## Colunas

| Coluna | Tipo | Nullable | Default | Observações |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| auth_user_id | uuid | NULL | — | Unique, FK → auth.users.id |
| phone | text | NOT NULL | — | Unique |
| email | text | NULL | — | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | (trigger set_updated_at) |
| first_name | text | NULL | — | |
| surname | text | NULL | — | |
| crm | text | NULL | — | |
| logo_url_full | text | NULL | — | |
| logo_url_short | text | NULL | — | |
| rqe | text | NULL | — | |
| social_media_handle | text | NULL | — | |
| website | text | NULL | — | |
| report_template_id | uuid | NULL | — | FK → report_templates.id |

## Chaves

- **Primary key:** id
- **Foreign keys:** auth_user_id → auth.users.id; report_template_id → public.report_templates.id

## Triggers

- trg_profiles_set_updated_at (BEFORE UPDATE) → set_updated_at()

## RLS

- rls_enabled: false
