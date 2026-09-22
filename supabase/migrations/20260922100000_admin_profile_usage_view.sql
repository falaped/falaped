-- Painel admin: consumo por usuário em UMA linha por perfil.
--
-- security_invoker = on: a view NÃO escapa da RLS. Quem lê com service role (o painel
-- admin) vê tudo porque o service role já ignora RLS; qualquer outro papel veria apenas
-- as próprias linhas. O revoke abaixo é a segunda trava — a view não é exposta ao
-- PostgREST para anon/authenticated.
create or replace view public.admin_profile_usage
with (security_invoker = on) as
select
  p.id as profile_id,
  p.email,
  p.first_name,
  p.surname,
  p.phone,
  p.crm,
  p.created_at,
  au.status,
  au.whatsapp_linked_at,
  (select max(c.started_at) from public.cases c where c.profile_id = p.id) as last_case_at,
  (select count(*) from public.patients t where t.profile_id = p.id) as patients,
  (select count(*) from public.cases t where t.profile_id = p.id) as cases,
  (select count(*) from public.discussions t where t.profile_id = p.id) as discussions,
  (select count(*) from public.appointments t where t.profile_id = p.id) as appointments,
  (select count(*) from public.prescriptions t where t.profile_id = p.id) as prescriptions,
  (select count(*) from public.medical_certificates t where t.profile_id = p.id) as certificates,
  (select count(*) from public.referrals t where t.profile_id = p.id) as referrals,
  (select count(*) from public.medical_reports t where t.profile_id = p.id) as reports,
  (select count(*) from public.case_reports t where t.profile_id = p.id) as case_reports,
  (select count(*) from public.exam_requests t where t.profile_id = p.id) as exam_requests,
  (select count(*) from public.guidance_documents t where t.profile_id = p.id) as guidance,
  (select count(*) from public.patient_vaccine_doses t where t.profile_id = p.id) as vaccine_doses,
  (select count(*) from public.patient_measurements t where t.profile_id = p.id) as measurements,
  (select count(*) from public.patient_scale_results t where t.profile_id = p.id) as scales,
  (select count(*) from public.patient_attachments t where t.profile_id = p.id) as attachments,
  (select count(*) from public.financial_entries t where t.profile_id = p.id and t.voided_at is null) as financial_entries
from public.profiles p
left join public.authenticated_users au on au.profile_id = p.id;

revoke all on public.admin_profile_usage from anon, authenticated;

comment on view public.admin_profile_usage is
  'Consumo por perfil para o painel admin. Leitura apenas via service role (createAdminClient).';
