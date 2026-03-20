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
| sections | jsonb | NOT NULL | — | Array de seções; ver formato abaixo. |
| is_default | boolean | NULL | false | |
| created_at | timestamptz | NULL | now() | |
| updated_at | timestamptz | NULL | now() | |
| user_id | uuid | NULL | — | FK → profiles.auth_user_id |

## Chaves

- **Primary key:** id
- **Foreign keys:** user_id → public.profiles.auth_user_id

## RLS

- rls_enabled: false

## Formato de `sections` (JSON)

Cada elemento é um objeto:

| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| `name` | string | sim | Título da seção no relatório |
| `description` | string | não | Ajuda ao preencher / IA |
| `information_not_extracted_reason` | string | não | Uso em fluxos de relatório (opcional) |
| `slot` | string | não | `patient_identity` \| `patient_clinical` nas duas seções fixas; omitido nas seções livres. Valores legados `pediatrician` ou títulos tipo Pediatra são removidos na normalização. |

**Ordem persistida:** `patient_identity` → `patient_clinical` → seções sem `slot` (livres). Dados do pediatra ficam no PDF (cabeçalho/rodapé), não como seção de template.
