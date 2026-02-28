-- Phase 1: Move profile data from authenticated_users to profiles;
-- slim authenticated_users to id, phone, status, profile_id;
-- update signup trigger to create both profile and authenticated_users row.

-- 1. Expand profiles: add columns for data currently in authenticated_users
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists surname text,
  add column if not exists crm text,
  add column if not exists logo_url_full text,
  add column if not exists logo_url_short text,
  add column if not exists rqe text,
  add column if not exists social_media_handle text,
  add column if not exists website text,
  add column if not exists report_template_id uuid references public.report_templates(id);

-- 2. Backfill profiles: first_name/surname from full_name (split on first space)
update public.profiles p
set
  first_name = case
    when p.full_name is not null and trim(p.full_name) <> '' then nullif(trim(split_part(trim(p.full_name), ' ', 1)), '')
    else null
  end,
  surname = case
    when p.full_name is not null and position(' ' in trim(p.full_name)) > 0 then nullif(trim(substring(trim(p.full_name) from position(' ' in trim(p.full_name)) + 1)), '')
    else null
  end
where p.full_name is not null;

-- 2b. Backfill from authenticated_users into profiles (where profile_id links)
update public.profiles p
set
  crm = au.crm,
  logo_url_full = au.logo_url_full,
  logo_url_short = au.logo_url_short,
  rqe = au.rqe,
  social_media_handle = au.social_media_handle,
  website = au.website,
  report_template_id = au.report_template_id
from public.authenticated_users au
where au.profile_id = p.id
  and (au.crm is not null or au.logo_url_full is not null or au.logo_url_short is not null
       or au.rqe is not null or au.social_media_handle is not null or au.website is not null
       or au.report_template_id is not null);

-- 3. Drop full_name from profiles (replaced by first_name + surname)
alter table public.profiles drop column if exists full_name;

-- 4. Slim authenticated_users: keep only id, phone, status, profile_id
alter table public.authenticated_users
  drop column if exists full_name,
  drop column if exists email,
  drop column if exists crm,
  drop column if exists rqe,
  drop column if exists social_media_handle,
  drop column if exists website,
  drop column if exists report_template_id,
  drop column if exists logo_url_full,
  drop column if exists logo_url_short,
  drop column if exists created_at,
  drop column if exists updated_at;

-- 5. Signup trigger: create profile (first_name, surname) and authenticated_users row
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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

  insert into public.authenticated_users (id, profile_id, phone, status)
  values (gen_random_uuid(), new_profile_id, signup_phone, 'unpaid');

  return new;
end;
$$;

comment on function public.handle_new_auth_user() is
  'Trigger: insert into profiles and authenticated_users after auth.users insert (signup). Only runs when phone is present.';

-- 6. On auth user delete: remove authenticated_users then profile (avoid orphans)
create or replace function public.handle_auth_user_deleted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.authenticated_users
  where profile_id in (select id from public.profiles where auth_user_id = old.id);
  delete from public.profiles
  where auth_user_id = old.id;
  return old;
end;
$$;

comment on function public.handle_auth_user_deleted() is
  'Trigger: delete authenticated_users and profile when auth.users row is deleted.';
