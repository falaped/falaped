-- ============================================================================
-- RLS REVERSAL SCRIPTS (D-05)
-- One clearly labeled block per RLS migration. Pure DDL — drop policies +
-- disable row level security. NO DML, no drop table/column: data untouched.
-- On any broken app flow after an apply, run ONLY the matching block via
-- MCP / SQL editor, then investigate offline. Blocks are independent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- REVERSAL: 20260604000000_rls_prescriptions.sql
-- ----------------------------------------------------------------------------
drop policy if exists "Prescriptions select own" on public.prescriptions;
drop policy if exists "Prescriptions insert own" on public.prescriptions;
drop policy if exists "Prescriptions update own" on public.prescriptions;
drop policy if exists "Prescriptions delete own" on public.prescriptions;
alter table public.prescriptions disable row level security;

-- ----------------------------------------------------------------------------
-- REVERSAL: 20260604000001_rls_medical_certificates.sql
-- ----------------------------------------------------------------------------
drop policy if exists "Medical Certificates select own" on public.medical_certificates;
drop policy if exists "Medical Certificates insert own" on public.medical_certificates;
drop policy if exists "Medical Certificates update own" on public.medical_certificates;
drop policy if exists "Medical Certificates delete own" on public.medical_certificates;
alter table public.medical_certificates disable row level security;

-- ----------------------------------------------------------------------------
-- REVERSAL: 20260604000002_rls_patients.sql
-- ----------------------------------------------------------------------------
drop policy if exists "Patients select own" on public.patients;
drop policy if exists "Patients insert own" on public.patients;
drop policy if exists "Patients update own" on public.patients;
drop policy if exists "Patients delete own" on public.patients;
alter table public.patients disable row level security;

-- ----------------------------------------------------------------------------
-- REVERSAL: 20260604000003_rls_cases.sql (cases + case_messages)
-- ----------------------------------------------------------------------------
drop policy if exists "Cases select own" on public.cases;
drop policy if exists "Cases insert own" on public.cases;
drop policy if exists "Cases update own" on public.cases;
drop policy if exists "Cases delete own" on public.cases;
alter table public.cases disable row level security;

drop policy if exists "Case Messages select own" on public.case_messages;
drop policy if exists "Case Messages insert own" on public.case_messages;
drop policy if exists "Case Messages update own" on public.case_messages;
drop policy if exists "Case Messages delete own" on public.case_messages;
alter table public.case_messages disable row level security;

-- ----------------------------------------------------------------------------
-- REVERSAL: 20260604000004_rls_auxiliary.sql (all remaining tables)
-- ----------------------------------------------------------------------------
drop policy if exists "Profiles select own" on public.profiles;
drop policy if exists "Profiles insert own" on public.profiles;
drop policy if exists "Profiles update own" on public.profiles;
drop policy if exists "Profiles delete own" on public.profiles;
alter table public.profiles disable row level security;

drop policy if exists "Authenticated Users select own" on public.authenticated_users;
drop policy if exists "Authenticated Users insert own" on public.authenticated_users;
drop policy if exists "Authenticated Users update own" on public.authenticated_users;
drop policy if exists "Authenticated Users delete own" on public.authenticated_users;
alter table public.authenticated_users disable row level security;

drop policy if exists "Case Reports select own" on public.case_reports;
drop policy if exists "Case Reports insert own" on public.case_reports;
drop policy if exists "Case Reports update own" on public.case_reports;
drop policy if exists "Case Reports delete own" on public.case_reports;
alter table public.case_reports disable row level security;

drop policy if exists "Prescription Templates select own" on public.prescription_templates;
drop policy if exists "Prescription Templates insert own" on public.prescription_templates;
drop policy if exists "Prescription Templates update own" on public.prescription_templates;
drop policy if exists "Prescription Templates delete own" on public.prescription_templates;
alter table public.prescription_templates disable row level security;

drop policy if exists "Report Templates select own or default" on public.report_templates;
drop policy if exists "Report Templates insert own" on public.report_templates;
drop policy if exists "Report Templates update own" on public.report_templates;
drop policy if exists "Report Templates delete own" on public.report_templates;
alter table public.report_templates disable row level security;

drop policy if exists "Phone Link Codes select own" on public.phone_link_codes;
drop policy if exists "Phone Link Codes insert own" on public.phone_link_codes;
drop policy if exists "Phone Link Codes update own" on public.phone_link_codes;
drop policy if exists "Phone Link Codes delete own" on public.phone_link_codes;
alter table public.phone_link_codes disable row level security;

drop policy if exists "Discussions select own" on public.discussions;
drop policy if exists "Discussions insert own" on public.discussions;
drop policy if exists "Discussions update own" on public.discussions;
drop policy if exists "Discussions delete own" on public.discussions;
alter table public.discussions disable row level security;

drop policy if exists "Discussion Messages select own" on public.discussion_messages;
drop policy if exists "Discussion Messages insert own" on public.discussion_messages;
drop policy if exists "Discussion Messages update own" on public.discussion_messages;
drop policy if exists "Discussion Messages delete own" on public.discussion_messages;
alter table public.discussion_messages disable row level security;

drop policy if exists "Incoming Webhook Events select own" on public.incoming_webhook_events;
drop policy if exists "Incoming Webhook Events delete own" on public.incoming_webhook_events;
alter table public.incoming_webhook_events disable row level security;

drop policy if exists "Trigger Buffer Runs select own" on public.trigger_buffer_runs;
drop policy if exists "Trigger Buffer Runs delete own" on public.trigger_buffer_runs;
alter table public.trigger_buffer_runs disable row level security;

alter table public.leads disable row level security;
alter table public.lp_leads disable row level security;
