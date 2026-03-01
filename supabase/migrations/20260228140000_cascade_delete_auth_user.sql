-- When an auth user is deleted, remove all related data in cascade order.
-- Uses profile(s) and their phone(s) to identify user-owned rows.

create or replace function public.handle_auth_user_deleted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- 1. Codes for linking WhatsApp (profile_id → profiles)
  delete from public.phone_link_codes
  where profile_id in (select id from public.profiles where auth_user_id = old.id);

  -- 2. Cases (case_messages deleted by FK on delete cascade)
  delete from public.cases
  where user_phone in (select phone from public.profiles where auth_user_id = old.id);

  -- 3. Patients (by profile_id; user_phone for legacy rows)
  delete from public.patients
  where profile_id in (select id from public.profiles where auth_user_id = old.id)
     or user_phone in (select phone from public.profiles where auth_user_id = old.id);

  -- 4. Incoming webhook events (by user phone)
  delete from public.incoming_webhook_events
  where phone in (select phone from public.profiles where auth_user_id = old.id);

  -- 5. Trigger buffer runs (by user phone)
  delete from public.trigger_buffer_runs
  where phone in (select phone from public.profiles where auth_user_id = old.id);

  -- 6. Authenticated users row(s) for this account
  delete from public.authenticated_users
  where profile_id in (select id from public.profiles where auth_user_id = old.id);

  -- 7. Drop profile reference to report_templates so we can delete user templates
  update public.profiles set report_template_id = null where auth_user_id = old.id;

  -- 8. User-specific report templates (keep global templates: user_phone is null)
  delete from public.report_templates
  where user_phone in (select phone from public.profiles where auth_user_id = old.id);

  -- 9. Profile(s)
  delete from public.profiles
  where auth_user_id = old.id;

  return old;
end;
$$;

comment on function public.handle_auth_user_deleted() is
  'Trigger: on auth.users delete, cascade-remove phone_link_codes, cases (+ case_messages), patients, incoming_webhook_events, trigger_buffer_runs, authenticated_users; null profile.report_template_id then remove user report_templates and profiles.';
