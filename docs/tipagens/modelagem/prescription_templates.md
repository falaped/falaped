# Tabela: prescription_templates

**Schema:** public

## Descrição

Templates de receita salvos pelo médico. O campo `snapshot` guarda medications, orientations, warning_signs, additional_notes e location_state para reutilizar ao criar nova receita.

## Colunas

| Coluna | Tipo | Nullable | Default | Observações |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| profile_id | uuid | NOT NULL | — | FK → profiles.id |
| name | text | NOT NULL | — | Nome do template |
| snapshot | jsonb | NOT NULL | '{}' | medications[], orientations?, warning_signs?, additional_notes?, location_state? |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | (trigger set_updated_at_prescription_templates) |

## Snapshot

- **medications** (array): mesmo formato do payload da receita (name, posology, dosage?, duration?, observations?).
- **orientations**, **warning_signs**, **additional_notes**, **location_state** (strings opcionais).

## Chaves

- **Primary key:** id
- **Foreign keys:** profile_id → public.profiles.id (ON DELETE CASCADE)

## Índices

- idx_prescription_templates_profile_id (profile_id)

## Triggers

- trg_prescription_templates_set_updated_at (BEFORE UPDATE) → set_updated_at_prescription_templates()

## RLS

- rls_enabled: false
