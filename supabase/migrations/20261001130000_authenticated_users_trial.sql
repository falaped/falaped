-- Teste grátis de 15 dias automático no cadastro, no lugar da liberação manual.
-- O status continua 'unpaid'; quem trata o trial como acesso liberado é o
-- getAuthenticatedUser (trial_ends_at no futuro conta como 'paid').

alter table public.authenticated_users
  add column trial_ends_at timestamptz;

comment on column public.authenticated_users.trial_ends_at is
  'Fim do teste grátis. Até esta data a conta unpaid tem acesso total; null = sem trial.';

create or replace function public.handle_new_auth_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  new_profile_id uuid;
  signup_phone text;
  signup_first_name text;
  signup_surname text;
begin
  signup_phone := trim(coalesce(new.raw_user_meta_data->>'phone', ''));
  if signup_phone = '' then
    return new;
  end if;

  signup_first_name := nullif(trim(split_part(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ' ', 1)), '');
  signup_surname := case
    when position(' ' in trim(coalesce(new.raw_user_meta_data->>'full_name', ''))) > 0
    then nullif(trim(substring(trim(coalesce(new.raw_user_meta_data->>'full_name', '')) from position(' ' in trim(coalesce(new.raw_user_meta_data->>'full_name', ''))) + 1)), '')
    else null
  end;

  insert into public.profiles (id, auth_user_id, phone, first_name, surname, email, created_at, updated_at)
  values (
    gen_random_uuid(),
    new.id,
    signup_phone,
    signup_first_name,
    signup_surname,
    new.email,
    now(),
    now()
  )
  returning id into new_profile_id;

  insert into public.authenticated_users (id, profile_id, phone, status, trial_ends_at)
  values (gen_random_uuid(), new_profile_id, signup_phone, 'unpaid', now() + interval '15 days');

  return new;
end;
$function$;

-- O usuário não pode mais se dar acesso: status e trial_ends_at só mudam pela
-- service role. Antes, a policy "update own" + o seletor do Perfil deixavam
-- qualquer conta virar 'paid'. Insert também sai (só o trigger cria a linha).
revoke insert, update on public.authenticated_users from anon, authenticated;
grant update (phone, linked_phone_status, whatsapp_linked_at)
  on public.authenticated_users to authenticated;

-- Painel admin mostra e edita o fim do trial. Coluna nova entra no fim (exigência
-- do create or replace view).
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
  au.trial_ends_at
from public.profiles p
left join public.authenticated_users au on au.profile_id = p.id;
