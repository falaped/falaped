# Tabela: report_templates

**Schema:** public

## Descrição

Templates de relatório médico com seções configuráveis. user_phone null = template global. O usuário pode criar templates manualmente ou usar a opção "Gerar com IA" (página `/dashboard/report-templates/gerar-com-ia`), que sugere nome e seções a partir de uma descrição em texto livre via Groq.

## Colunas

| Coluna | Tipo | Nullable | Default | Observações |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| user_phone | text | NULL | — | |
| name | text | NOT NULL | — | |
| sections | jsonb | NOT NULL | — | Array de { name, description, information_not_extracted_reason? } |
| is_default | boolean | NULL | false | |
| created_at | timestamptz | NULL | now() | |
| updated_at | timestamptz | NULL | now() | |
| user_id | uuid | NULL | — | FK → profiles.auth_user_id |

## Chaves

- **Primary key:** id
- **Foreign keys:** user_id → public.profiles.auth_user_id

## RLS

- rls_enabled: false
