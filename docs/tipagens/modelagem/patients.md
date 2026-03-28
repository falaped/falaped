# Tabela: patients

**Schema:** public

## Descrição

Pacientes cadastrados por médico (user_phone). Casos podem ser associados via cases.patient_id.

## Colunas

| Coluna | Tipo | Nullable | Default | Observações |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| user_phone | text | NULL | — | |
| name | text | NOT NULL | — | |
| birth_date | date | NULL | — | |
| responsible | text | NULL | — | |
| sex | patient_sex (enum) | NULL | — | Chaves `masculino` / `feminino`; UI: Masculino / Feminino. Ver [enums.md](./enums.md#patient_sex). |
| legal_guardian | text | NULL | — | |
| blood_type | text | NULL | — | |
| weight | text | NULL | — | |
| height | text | NULL | — | |
| head_circumference | text | NULL | — | |
| allergies | text | NULL | — | |
| current_medications | text | NULL | — | |
| medical_history | text | NULL | — | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |
| contact_phone | text | NULL | — | Telefone de contato do responsável. Obrigatório ao criar novo paciente. |
| profile_id | uuid | NULL | — | Perfil (médico) dono do paciente. FK → profiles.id |

## Chaves

- **Primary key:** id
- **Foreign keys:** profile_id → public.profiles.id

## RLS

- rls_enabled: false
