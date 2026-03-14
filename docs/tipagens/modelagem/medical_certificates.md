# Tabela: medical_certificates

**Schema:** public

## Descrição

Atestados médicos gerados pelo perfil (médico). Usado para histórico e listagem; o payload guarda os dados do formulário por tipo. PDF pode ser persistido opcionalmente em storage (`pdf_storage_path`).

## Colunas

| Coluna | Tipo | Nullable | Default | Observações |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| profile_id | uuid | NOT NULL | — | FK → profiles.id (médico emissor) |
| type | medical_certificate_type | NOT NULL | — | Tipo do atestado |
| patient_id | uuid | NULL | — | FK → patients.id (paciente associado, opcional) |
| case_id | uuid | NULL | — | FK → cases.id (caso associado, opcional) |
| payload | jsonb | NOT NULL | '{}' | Dados do formulário conforme o tipo |
| location_state | text | NULL | — | Estado (local) do atestado |
| issued_at | date | NOT NULL | — | Data de emissão |
| pdf_storage_path | text | NULL | — | Caminho do PDF no storage (opcional) |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | (trigger set_updated_at_medical_certificates) |

## Chaves

- **Primary key:** id
- **Foreign keys:** profile_id → public.profiles.id (ON DELETE CASCADE); patient_id → public.patients.id (ON DELETE SET NULL); case_id → public.cases.id (ON DELETE SET NULL)

## Índices

- idx_medical_certificates_profile_id (profile_id)
- idx_medical_certificates_issued_at (issued_at DESC)

## Triggers

- trg_medical_certificates_set_updated_at (BEFORE UPDATE) → set_updated_at_medical_certificates()

## Storage (PDFs)

- **Bucket:** `medical-certificates` (privado). Constante: `MEDICAL_CERTIFICATES_BUCKET` em `lib/constants.ts`.
- **Path:** `{profile_id}/{certificate_id}.pdf` — um objeto por atestado; RLS restringe ao dono do perfil.
- **Upload:** `modules/medical-certificates/upload-medical-certificate-pdf.ts` → `uploadMedicalCertificatePdf(supabase, profileId, certificateId, buffer)` retorna o path para gravar em `pdf_storage_path`.
- **Download:** usar `supabase.storage.from('medical-certificates').createSignedUrl(pdf_storage_path, expiry)` para URL assinada.

## RLS

- rls_enabled: false
