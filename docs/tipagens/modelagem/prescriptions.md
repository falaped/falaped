# Tabela: prescriptions

**Schema:** public

## Descrição

Receitas de medicamentos geradas pelo perfil (médico). Usado para histórico e listagem; o payload guarda dados do paciente e lista de medicamentos. PDF pode ser persistido opcionalmente em storage (`pdf_storage_path`).

## Colunas

| Coluna | Tipo | Nullable | Default | Observações |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| profile_id | uuid | NOT NULL | — | FK → profiles.id (médico emissor) |
| patient_id | uuid | NULL | — | FK → patients.id (paciente associado, opcional) |
| case_id | uuid | NULL | — | FK → cases.id (caso associado, opcional) |
| payload | jsonb | NOT NULL | '{}' | patientName, birthDate, medications[] |
| location_state | text | NULL | — | Estado (local) da receita |
| issued_at | date | NOT NULL | — | Data de emissão |
| orientations | text | NULL | — | Orientações gerais da receita |
| warning_signs | text | NULL | — | Sinais de alerta para o paciente/responsável |
| additional_notes | text | NULL | — | Anotações adicionais do médico |
| pdf_storage_path | text | NULL | — | Caminho do PDF no storage (opcional) |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | (trigger set_updated_at_prescriptions) |

## Payload

- **patientName** (string, opcional): nome do paciente para o PDF.
- **birthDate** (string, opcional): data de nascimento formatada para o PDF.
- **medications** (array): cada item com `name`, `posology` (obrigatórios); `dosage`, `duration`, `observations` (opcionais).

## Chaves

- **Primary key:** id
- **Foreign keys:** profile_id → public.profiles.id (ON DELETE CASCADE); patient_id → public.patients.id (ON DELETE SET NULL); case_id → public.cases.id (ON DELETE SET NULL)

## Índices

- idx_prescriptions_profile_id (profile_id)
- idx_prescriptions_issued_at (issued_at DESC)

## Triggers

- trg_prescriptions_set_updated_at (BEFORE UPDATE) → set_updated_at_prescriptions()

## Storage (PDFs)

- **Bucket:** `prescriptions` (privado). Constante: `PRESCRIPTIONS_BUCKET` em `lib/constants.ts`.
- **Path:** `{profile_id}/{prescription_id}.pdf`
- **Upload:** módulo upload-prescription-pdf.ts.
- **Download:** signed URL via API GET /api/prescriptions/[id]/download.

## RLS

- rls_enabled: false
