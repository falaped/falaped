# Schema Supabase – falaped-bot

Referência rápida das tabelas. Migrations em `supabase/migrations/`. Tipos em `src/modules/supabase/types.ts` (AuthenticatedUser, Case, CaseMessage, Patient, IncomingWebhookEvent, Lead).

## Tabelas existentes

### authenticated_users
- `id` uuid PK, `phone` text unique, `status` ('paid' | 'unpaid' | 'blocked'), `profile_id` uuid not null FK → profiles(id)
- Uso: validar usuário por telefone no bot; dashboard resolve sessão por profile_id. Dados do médico ficam em profiles. Bot consulta por phone e status; paid = continua fluxo, unpaid/blocked = mensagem de pagamento/contato.

### report_templates
- `id` uuid PK, `user_phone` text nullable, `name` text not null, `sections` jsonb not null, `is_default` boolean default false, `created_at`, `updated_at`
- Índices: idx_report_templates_user_phone, idx_report_templates_is_default (unique where is_default = true). `sections`: array de `{ name, description, information_not_extracted_reason? }`. Template global quando user_phone = null. Seed com template padrão (is_default = true).

### profiles
- `id` uuid PK, `auth_user_id` (FK → auth.users), `phone` unique, `first_name` text, `surname` text, `email` text nullable, `crm` text nullable, `logo_url_full` text nullable, `logo_url_short` text nullable, `rqe` text nullable, `social_media_handle` text nullable, `website` text nullable, `report_template_id` uuid nullable FK → report_templates(id), `created_at` timestamptz, `updated_at` timestamptz
- Uso: dados do médico/perfil; vínculo com Supabase Auth. Dashboard lê perfil por auth → profile; status e phone do canal em authenticated_users.
- **Trigger signup:** `on_auth_user_created` chama `handle_new_auth_user()`: insere em `profiles` (first_name, surname a partir de full_name, email, phone) e em `authenticated_users` (profile_id, phone, status = 'unpaid'); só quando phone está presente. **Trigger delete:** `on_auth_user_deleted` chama `handle_auth_user_deleted()`: em cascata remove phone_link_codes, cases (e case_messages por FK), patients, incoming_webhook_events, trigger_buffer_runs, authenticated_users; anula profile.report_template_id, remove report_templates do usuário e por fim profiles.

## Tabelas (migrations em supabase/migrations/)

### phone_link_codes
- `id` uuid PK, `code` text not null (6 dígitos), `profile_id` uuid not null FK → profiles(id) on delete cascade, `expires_at` timestamptz not null, `used_at` timestamptz nullable
- Índice: idx_phone_link_codes_code_unused (code) where used_at is null.
- Uso: códigos de vinculação WhatsApp. Dashboard gera via `createLinkCode(supabase, profileId)`; bot busca por code (não expirado, não usado), vincula phone ao profile_id em authenticated_users e seta used_at. Ver docs/contrato-bot-vinculacao-whatsapp.md.

### cases
- `id` uuid PK, `user_phone` text not null, `status` ('active' | 'closed') default 'active', `started_at` timestamptz default now(), `ended_at` timestamptz nullable, `awaiting_intent` boolean not null default false, `patient_id` uuid nullable FK → patients(id), `awaiting_patient_choice` boolean not null default false, `patient_registration_state` jsonb nullable, `pending_action` text nullable, `dashboard_chat_context_summary` text nullable, `assistant_turn_queue` jsonb nullable
- Índice: idx_cases_user_phone_status (user_phone, status) where status = 'active' (para getActiveCase). awaiting_intent: true quando aguardamos resposta "Continuar / Finalizar / Outro?". awaiting_patient_choice: true ao finalizar aguardando criar/associar paciente ou pular. patient_registration_state: progresso do cadastro guiado ou fluxo ao finalizar.

### case_messages
- `id` uuid PK, `case_id` uuid FK → cases(id) on delete cascade, `role` ('user' | 'assistant'), `content` text, `created_at` timestamptz default now()
- Índice: idx_case_messages_case_id_created_at (case_id, created_at).

### incoming_webhook_events
- `id` uuid PK, `phone` text not null, `external_message_id` text not null, `content` text not null, `created_at` timestamptz default now(), `processed_at` timestamptz nullable
- Unique (phone, external_message_id) para idempotência. Índice: idx_incoming_webhook_events_phone_processed_at (phone, processed_at) where processed_at is null.
- Uso: buffer de mensagens antes do flush; job ou orchestrator processa por phone quando janela de buffer passou.

### trigger_buffer_runs
- `phone` text PK, `run_id` text not null, `updated_at` timestamptz default now()
- Uso: armazenar run_id do Trigger.dev por phone para re-agendar (reschedule) em vez de criar novo run quando chega nova mensagem do mesmo phone.

### patients
- `id` uuid PK, `user_phone` text not null, `name` text not null, `birth_date` date nullable, `responsible` text, `contact_phone` text nullable, `sex` text, `legal_guardian` text, `blood_type` text, `weight` text, `height` text, `head_circumference` text, `allergies` text, `current_medications` text, `medical_history` text, `created_at` timestamptz default now(), `updated_at` timestamptz default now()
- Índices: idx_patients_user_phone, idx_patients_user_phone_name.
- Uso: pacientes cadastrados por médico (user_phone). Cases associados via cases.patient_id. contact_phone: telefone do responsável; obrigatório ao criar paciente (validação em create-patient). Queries: create-patient, search-patients-by-name, get-patients-by-user-phone, get-patient-by-id; set-case-patient-id para vincular case a paciente.

### leads
- `id` uuid PK, `phone` text not null unique, `first_seen_at` timestamptz default now(), `last_seen_at` timestamptz default now()
- Índices: idx_leads_phone, idx_leads_last_seen_at (desc).
- Uso: contatos que mandaram mensagem mas não estão em authenticated_users. Upsert por phone: insert na primeira vez, update last_seen_at em reenvios. Follow-up e conversão para cliente.

## Storage (Supabase Storage)

- **Bucket `report-pdfs`:** constante em `lib/constants.ts` (REPORT_PDFS_BUCKET). Criar o bucket no dashboard Supabase e configurar leitura pública para os objetos. Armazenamento de PDFs de relatório para envio via AvisaAPI sendMedia (3.3). Função `modules/supabase/upload-report-pdf.ts`: `uploadReportPdf(supabase, buffer, storagePath) → Promise<string>` (URL pública). Path típico: `${caseId}/${getReportPdfFilename(patientName, started_at)}`. Nome do arquivo: `lib/pdf/get-report-pdf-filename.ts` → `relatorio-{primeiroNome}-{DD-MM-YYYY}.pdf` (ex.: relatorio-maria-23-02-2026.pdf); sem paciente usa "consulta".
