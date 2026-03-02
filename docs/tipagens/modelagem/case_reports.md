# Tabela: case_reports

**Schema:** public

## Descrição

Relatórios por caso. Múltiplos relatórios por case_id. id usado para report.pdf no storage; profile_id para listar por usuário. sections: array de { name, description?, content, order }.

## Colunas

| Coluna | Tipo | Nullable | Default | Observações |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| case_id | uuid | NOT NULL | — | FK → cases.id on delete cascade |
| profile_id | uuid | NOT NULL | — | FK → profiles.id |
| report_template_id | uuid | NOT NULL | — | FK → report_templates.id |
| sections | jsonb | NOT NULL | '[]'::jsonb | Array de { name, description?, content, order } |
| is_finalized | boolean | NOT NULL | false | |
| finalized_at | timestamptz | NULL | — | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |
| source | case_report_source | NOT NULL | 'web' | Enum: web, whatsapp. Origem da geração (bot WhatsApp ou web) |

## Chaves

- **Primary key:** id
- **Foreign keys:** case_id → public.cases.id; profile_id → public.profiles.id; report_template_id → public.report_templates.id

## RLS

- rls_enabled: false

## Tipo relacionado

- **case_report_source** (enum): `web`, `whatsapp` — ver [enums.md](./enums.md)
