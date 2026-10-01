-- Admin · Clientes (#66): vencimento manual da assinatura, log de consumo de IA e
-- atividade/storage por conta na view do painel.

-- Pagamentos lançados à mão pelo admin. Cada linha cobre um período; o vencimento da
-- conta é o maior `valid_until`. Quando entrar o Asaas, ele grava aqui também.
create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  paid_at date not null default current_date,
  valid_until date not null,
  note text,
  created_at timestamptz not null default now()
);

create index subscription_payments_profile_valid_idx
  on public.subscription_payments (profile_id, valid_until desc);

alter table public.subscription_payments enable row level security;
revoke all on public.subscription_payments from anon, authenticated;

comment on table public.subscription_payments is
  'Pagamentos da assinatura (manual pelo admin, depois Asaas). Só service role.';

-- Uma linha por chamada ao Groq. O Groq não tem API de consumo, então o painel soma
-- daqui. Sem profile_id de propósito: o painel mostra total e média, não por pessoa.
create table public.ai_usage_events (
  id bigint generated always as identity primary key,
  feature text not null,
  model text not null,
  prompt_tokens integer,
  completion_tokens integer,
  audio_seconds numeric(10, 2),
  created_at timestamptz not null default now()
);

create index ai_usage_events_created_at_idx on public.ai_usage_events (created_at);

alter table public.ai_usage_events enable row level security;
revoke all on public.ai_usage_events from anon, authenticated;

comment on table public.ai_usage_events is
  'Consumo do Groq por chamada (tokens ou segundos de áudio). Só service role grava e lê.';

-- Colunas novas no fim (exigência do create or replace view).
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
  (select count(*) from public.financial_entries t where t.profile_id = p.id and t.voided_at is null) as financial_entries,
  au.trial_ends_at,
  -- Último registro de QUALQUER tipo: é o que diz se a conta está viva (não só caso).
  greatest(
    (select max(t.started_at) from public.cases t where t.profile_id = p.id),
    (select max(t.started_at) from public.discussions t where t.profile_id = p.id),
    (select max(t.created_at) from public.patients t where t.profile_id = p.id),
    (select max(t.created_at) from public.appointments t where t.profile_id = p.id),
    (select max(t.created_at) from public.prescriptions t where t.profile_id = p.id),
    (select max(t.created_at) from public.medical_certificates t where t.profile_id = p.id),
    (select max(t.created_at) from public.referrals t where t.profile_id = p.id),
    (select max(t.created_at) from public.medical_reports t where t.profile_id = p.id),
    (select max(t.created_at) from public.case_reports t where t.profile_id = p.id),
    (select max(t.created_at) from public.exam_requests t where t.profile_id = p.id),
    (select max(t.created_at) from public.guidance_documents t where t.profile_id = p.id),
    (select max(t.created_at) from public.patient_vaccine_doses t where t.profile_id = p.id),
    (select max(t.created_at) from public.patient_measurements t where t.profile_id = p.id),
    (select max(t.created_at) from public.patient_scale_results t where t.profile_id = p.id),
    (select max(t.created_at) from public.patient_attachments t where t.profile_id = p.id),
    (select max(t.created_at) from public.financial_entries t where t.profile_id = p.id)
  ) as last_activity_at,
  -- Arquivos da conta ficam na pasta `<profile_id>/` de cada bucket (book-assets é por livro).
  coalesce((
    select sum((o.metadata->>'size')::bigint)
    from storage.objects o
    where o.bucket_id <> 'book-assets' and (storage.foldername(o.name))[1] = p.id::text
  ), 0) as storage_bytes,
  (select max(sp.valid_until) from public.subscription_payments sp where sp.profile_id = p.id) as paid_until
from public.profiles p
left join public.authenticated_users au on au.profile_id = p.id;
