# Tabela: cases

**Schema:** public

## Descrição

Casos de conversa por usuário (telefone); um caso ativo por vez para getActiveCase. Escopo do caso por profile (profile_id).

## Colunas

| Coluna | Tipo | Nullable | Default | Observações |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| user_phone | text | NOT NULL | — | |
| status | text | NOT NULL | 'active' | Check: `active`, `closed` |
| started_at | timestamptz | NOT NULL | now() | |
| ended_at | timestamptz | NULL | — | |
| awaiting_intent | boolean | NOT NULL | false | Indica se aguardamos resposta sobre continuar/finalizar/iniciar outro |
| patient_id | uuid | NULL | — | Paciente associado ao caso (quando houver). FK → patients.id |
| awaiting_patient_choice | boolean | NOT NULL | false | Aguardando escolha do médico: criar/associar paciente ou pular (ao finalizar) |
| patient_registration_state | jsonb | NULL | — | Progresso do cadastro guiado ou fluxo ao finalizar: { step, collected } |
| profile_id | uuid | NULL | — | Perfil do médico (auth); escopo do caso. FK → profiles.id |

## Chaves

- **Primary key:** id
- **Foreign keys:** profile_id → public.profiles.id; patient_id → public.patients.id

## RLS

- rls_enabled: false
